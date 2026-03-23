import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 順便處理到期的排程推播
  await processPendingBroadcasts();

  // Check notification settings
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("setting_value")
    .eq("setting_key", "daily_reminder")
    .single();

  const config = settings?.setting_value || { enabled: true, skip_days: [] };

  if (!config.enabled) {
    return NextResponse.json({ message: "Notifications disabled" });
  }

  // Check if today should be skipped (Taiwan time = UTC+8)
  const now = new Date();
  const adjustedDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const dayOfWeek = adjustedDate.getUTCDay(); // 0=Sunday, 6=Saturday

  if (config.skip_days && config.skip_days.includes(dayOfWeek)) {
    return NextResponse.json({ message: `Skipped (day ${dayOfWeek} is in skip list)` });
  }

  const today = adjustedDate.toISOString().split("T")[0];

  // Get all active students
  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "student");

  if (!students || students.length === 0) {
    return NextResponse.json({ message: "No students found" });
  }

  // Get today's submitted reports
  const { data: submittedReports } = await supabase
    .from("daily_reports")
    .select("user_id")
    .eq("report_date", today);

  const submittedUserIds = new Set(submittedReports?.map((r) => r.user_id) || []);

  // Find students who haven't submitted
  const missingStudents = students.filter((s) => !submittedUserIds.has(s.id));

  if (missingStudents.length === 0) {
    await sendToAllGroups(
      `🎉 太棒了！今天（${today}）所有學員都已完成日報！\n\n繼續保持，你們都很棒！💪`
    );
    return NextResponse.json({ message: "All students submitted", date: today });
  }

  const names = missingStudents
    .map((s) => s.display_name || "未設定名稱")
    .join("、");

  const submitted = students.length - missingStudents.length;
  const total = students.length;
  const prefix = config.message_prefix || "📋 HOPE 日報提醒";

  const message = [
    `${prefix}（${today}）`,
    ``,
    `✅ 已繳交：${submitted}/${total} 人`,
    `❌ 尚未繳交：${missingStudents.length} 人`,
    ``,
    `尚未繳交的學員：`,
    names,
    ``,
    `📝 立即填寫：https://hope.huangxi.info/forms/daily`,
    ``,
    `加油！完成今天的日報 💪`,
  ].join("\n");

  await sendToAllGroups(message);

  return NextResponse.json({
    message: "Reminder sent",
    date: today,
    missing: missingStudents.length,
    submitted,
    total,
  });
}

async function processPendingBroadcasts() {
  const now = new Date().toISOString();

  const { data: pending } = await supabase
    .from("scheduled_broadcasts")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (!pending || pending.length === 0) return;

  for (const broadcast of pending) {
    await sendToAllGroups(broadcast.message);

    await supabase
      .from("scheduled_broadcasts")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", broadcast.id);
  }
}

async function sendToAllGroups(text: string) {
  const { data: groups } = await supabase
    .from("line_groups")
    .select("group_id")
    .eq("active", true);

  if (!groups || groups.length === 0) return;

  for (const group of groups) {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: group.group_id,
        messages: [{ type: "text", text }],
      }),
    });
  }
}

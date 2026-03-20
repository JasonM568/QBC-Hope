import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

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
    // Everyone submitted! Send congratulations
    await sendToAllGroups(
      `🎉 太棒了！今天（${today}）所有學員都已完成日報！\n\n繼續保持，你們都很棒！💪`
    );
    return NextResponse.json({ message: "All students submitted", date: today });
  }

  // Build reminder message
  const names = missingStudents
    .map((s) => s.display_name || "未設定名稱")
    .join("、");

  const submitted = students.length - missingStudents.length;
  const total = students.length;

  const message = [
    `📋 HOPE 日報提醒（${today}）`,
    ``,
    `✅ 已繳交：${submitted}/${total} 人`,
    `❌ 尚未繳交：${missingStudents.length} 人`,
    ``,
    `尚未繳交的學員：`,
    names,
    ``,
    `📝 立即填寫：https://qbc-hope.vercel.app/forms/daily`,
    ``,
    `加油！完成今天的四步循環 💪`,
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

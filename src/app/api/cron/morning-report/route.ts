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

  // Taiwan time (UTC+8)
  const now = new Date();
  const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  // Calculate recent 3 days (yesterday, day before, etc.)
  const recentDays: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(taiwanNow.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    // Only include dates from 2026-03-23 onwards (project start)
    if (dateStr >= "2026-03-23") {
      recentDays.push(dateStr);
    }
  }

  if (recentDays.length === 0) {
    return NextResponse.json({ message: "No dates to check yet" });
  }

  // Get all active students
  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "student");

  if (!students || students.length === 0) {
    return NextResponse.json({ message: "No students found" });
  }

  const total = students.length;
  // Get reports for all recent days
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("user_id, report_date")
    .in("report_date", recentDays);

  // Build submitted set per day
  const submittedByDate: Record<string, Set<string>> = {};
  for (const day of recentDays) {
    submittedByDate[day] = new Set();
  }
  for (const r of reports || []) {
    if (submittedByDate[r.report_date]) {
      submittedByDate[r.report_date].add(r.user_id);
    }
  }

  // Yesterday's data
  const yesterday = recentDays[0];
  const yesterdaySubmitted = submittedByDate[yesterday];
  const yesterdayMissing = students.filter((s) => !yesterdaySubmitted.has(s.id));
  const yesterdayNames = yesterdayMissing
    .map((s) => s.display_name || "未設定名稱")
    .sort()
    .join("、");

  const yesterdayFormatted = yesterday.replace(/-/g, "/");

  // Build recent days stats with names
  const statsLines: string[] = [];
  for (const day of recentDays) {
    const submitted = submittedByDate[day];
    const missing = students.filter((s) => !submitted.has(s.id));
    const names = missing
      .map((s) => s.display_name || "未設定名稱")
      .sort()
      .join("、");
    const dayFormatted = day.replace(/-/g, "/");
    statsLines.push(`・${dayFormatted}：${missing.length} 人未繳`);
    statsLines.push(`  ${names}`);
  }

  let message: string;

  if (yesterdayMissing.length === 0) {
    message = [
      `📊 HOPE 日報繳交日報`,
      ``,
      `🎉 ${yesterdayFormatted}（昨日）全員繳交！`,
      `✅ 已繳交：${total}/${total} 人`,
    ].join("\n");

    // Still show recent days if there are missing in other days
    const hasOtherMissing = recentDays.some(
      (day) => students.some((s) => !submittedByDate[day].has(s.id))
    );

    if (hasOtherMissing) {
      message += [
        ``,
        ``,
        `📈 近 ${recentDays.length} 天未繳統計：`,
        ...statsLines,
      ].join("\n");
    }
  } else {
    message = [
      `📊 HOPE 日報繳交日報`,
      ``,
      `📅 ${yesterdayFormatted}（昨日）未繳交名單：`,
      `❌ 未繳交：${yesterdayMissing.length}/${total} 人`,
      yesterdayNames,
      ``,
      `📈 近 ${recentDays.length} 天未繳統計：`,
      ...statsLines,
      ``,
      `📝 立即補填：https://hope.huangxi.info/forms/daily`,
    ].join("\n");
  }

  // Send directly (data is finalized, no need to delay)
  await sendToAllGroups(message);

  return NextResponse.json({
    message: "Morning report sent",
    yesterday,
    missingYesterday: yesterdayMissing.length,
    total,
    daysChecked: recentDays.length,
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

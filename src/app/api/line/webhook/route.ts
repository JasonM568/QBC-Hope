import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ ok: true });
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const events = data.events || [];

  if (events.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabase();

  for (const event of events) {
    // Bot 加入群組
    if (event.type === "join" && event.source?.type === "group") {
      const groupId = event.source.groupId;
      await supabase.from("line_groups").upsert({
        group_id: groupId,
        joined_at: new Date().toISOString(),
        active: true,
      });

      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "🌟 HOPE 人生作業系統已加入群組！\n\n📋 查詢今日日報：輸入 /daily\n📊 查詢昨日日報：輸入 /daily-1\n\n📝 填寫日報：https://hope.huangxi.info/forms/daily",
        },
      ]);
    }

    // Bot 離開群組
    if (event.type === "leave" && event.source?.type === "group") {
      await supabase
        .from("line_groups")
        .update({ active: false })
        .eq("group_id", event.source.groupId);
    }

    // 關鍵字觸發
    if (event.type === "message" && event.message?.type === "text") {
      const text = event.message.text.trim();

      if (text === "/daily") {
        const message = await buildDailyReport(supabase, 0);
        await replyMessage(event.replyToken, [{ type: "text", text: message }]);
      }

      if (text === "/daily-1") {
        const message = await buildDailyReport(supabase, 1);
        await replyMessage(event.replyToken, [{ type: "text", text: message }]);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

interface Student { id: string; display_name: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildDailyReport(supabase: any, daysAgo: number): Promise<string> {
  const now = new Date();
  const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const targetDate = new Date(taiwanNow.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const dateStr = targetDate.toISOString().split("T")[0];
  const dateFormatted = dateStr.replace(/-/g, "/");
  const checkTime = `${new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0].replace(/-/g, "/")} ${String(taiwanNow.getUTCHours()).padStart(2, "0")}:${String(taiwanNow.getUTCMinutes()).padStart(2, "0")}`;

  // Get all students
  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "student");

  const allStudents: Student[] = students || [];
  if (allStudents.length === 0) {
    return "目前沒有學員資料";
  }

  const total = allStudents.length;

  // Get reports for target date
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("user_id")
    .eq("report_date", dateStr);

  const submittedIds = new Set(reports?.map((r: { user_id: string }) => r.user_id) || []);
  const missing = allStudents
    .filter((s: Student) => !submittedIds.has(s.id))
    .map((s: Student) => s.display_name || "未設定名稱")
    .sort();
  const submitted = total - missing.length;

  const label = daysAgo === 0 ? "今日" : "昨日";

  if (missing.length === 0) {
    return [
      `📋 HOPE 日報提醒`,
      ``,
      `清點時間：${checkTime}`,
      `🎉 ${dateFormatted}（${label}）全員繳交！`,
      `✅ 已繳交：${total}/${total} 人`,
      ``,
      `繼續保持，你們都很棒！💪`,
    ].join("\n");
  }

  // Build recent 3 days stats (only for /daily-1)
  let statsBlock = "";
  if (daysAgo === 1) {
    const statsLines: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(taiwanNow.getTime() - i * 24 * 60 * 60 * 1000);
      const ds = d.toISOString().split("T")[0];
      if (ds < "2026-03-23") continue;

      const { data: dayReports } = await supabase
        .from("daily_reports")
        .select("user_id")
        .eq("report_date", ds);

      const daySubmitted = new Set(dayReports?.map((r: { user_id: string }) => r.user_id) || []);
      const dayMissing = allStudents
        .filter((s: Student) => !daySubmitted.has(s.id))
        .map((s: Student) => s.display_name || "未設定名稱")
        .sort();

      statsLines.push(`・${ds.replace(/-/g, "/")}：${dayMissing.length} 人未繳`);
      statsLines.push(`  ${dayMissing.join("、")}`);
    }

    if (statsLines.length > 0) {
      statsBlock = [
        ``,
        `📈 近 ${Math.min(3, statsLines.length / 2)} 天未繳統計：`,
        ...statsLines,
      ].join("\n");
    }
  }

  return [
    `📋 HOPE 日報提醒`,
    ``,
    `清點時間：${checkTime}`,
    `📅 ${dateFormatted}（${label}）`,
    `✅ 已繳交：${submitted}/${total} 人`,
    `❌ 尚未繳交：${missing.length} 人`,
    ``,
    `尚未繳交的學員：`,
    missing.join("、"),
    statsBlock,
    ``,
    `📝 立即填寫：https://hope.huangxi.info/forms/daily`,
    ``,
    `加油！完成${label}的日報 💪`,
  ].filter(Boolean).join("\n");
}

async function replyMessage(replyToken: string, messages: Array<{ type: string; text: string }>) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

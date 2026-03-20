import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    if (event.type === "join" && event.source?.type === "group") {
      const groupId = event.source.groupId;
      await supabase.from("line_groups").upsert({
        group_id: groupId,
        joined_at: new Date().toISOString(),
        active: true,
      });

      await sendLineMessage(groupId, [
        {
          type: "text",
          text: "🌟 HOPE 人生作業系統已加入群組！\n\n每天晚上 21:00 會自動提醒尚未繳交日報的學員。\n\n📝 填寫日報：https://hope.huangxi.info/forms/daily",
        },
      ]);
    }

    if (event.type === "leave" && event.source?.type === "group") {
      await supabase
        .from("line_groups")
        .update({ active: false })
        .eq("group_id", event.source.groupId);
    }
  }

  return NextResponse.json({ ok: true });
}

async function sendLineMessage(to: string, messages: Array<{ type: string; text: string }>) {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages }),
  });
}

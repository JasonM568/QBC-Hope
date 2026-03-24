import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 即時推播 or 排程推播
export async function POST(request: Request) {
  const body = await request.json();
  const { message, scheduledAt, userId } = body;

  if (!message || !userId) {
    return NextResponse.json({ error: "Missing message or userId" }, { status: 400 });
  }

  // 驗證是否為 master 或 admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile || !["admin", "master", "tester"].includes(profile.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 排程推播：存入 DB，由 cron 處理
  if (scheduledAt) {
    const { error } = await supabase.from("scheduled_broadcasts").insert({
      message,
      scheduled_at: scheduledAt,
      created_by: userId,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, type: "scheduled", scheduledAt });
  }

  // 即時推播
  const result = await sendToAllGroups(message);
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  // 記錄已發送
  await supabase.from("scheduled_broadcasts").insert({
    message,
    scheduled_at: new Date().toISOString(),
    created_by: userId,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, type: "immediate" });
}

async function sendToAllGroups(text: string) {
  const { data: groups } = await supabase
    .from("line_groups")
    .select("group_id")
    .eq("active", true);

  if (!groups || groups.length === 0) return { ok: false };

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
  return { ok: true };
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 每 10 分鐘檢查是否有到期的排程推播
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 取得所有到期且未發送的排程
  const { data: pending } = await supabase
    .from("scheduled_broadcasts")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (!pending || pending.length === 0) {
    return NextResponse.json({ message: "No pending broadcasts" });
  }

  let sentCount = 0;

  for (const broadcast of pending) {
    await sendToAllGroups(broadcast.message);

    await supabase
      .from("scheduled_broadcasts")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", broadcast.id);

    sentCount++;
  }

  return NextResponse.json({ message: `Sent ${sentCount} broadcasts` });
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

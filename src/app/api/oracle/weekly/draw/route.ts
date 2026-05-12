import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TIMEZONE = "Asia/Taipei";

/**
 * 七日回顧 — 抽牌 API
 *   - 不限次數（點數扣除在 reading API）
 *   - 撈 7 天日報 + 隨機抽 1 張牌 → 回前端
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  // 撈過去 7 天的日報
  const sevenAgoDateStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const { data: reports } = await supabase
    .from("daily_reports")
    .select(
      "report_date, morning_gratitude, today_goals, action_taken, reflection, energy_level, mood_score"
    )
    .eq("user_id", user.id)
    .gte("report_date", sevenAgoDateStr)
    .order("report_date", { ascending: false })
    .limit(7);

  // 抽 1 張隨機牌
  const { count } = await supabase
    .from("oracle_cards")
    .select("*", { count: "exact", head: true });

  if (!count) {
    return NextResponse.json({ error: "牌卡資料不足" }, { status: 500 });
  }

  const randomNumber = Math.floor(Math.random() * count) + 1;
  const { data: card, error: cardErr } = await supabase
    .from("oracle_cards")
    .select("id, card_number, card_name, card_message, card_image_url, keywords")
    .eq("card_number", randomNumber)
    .single();

  if (cardErr || !card) {
    return NextResponse.json(
      { error: cardErr?.message ?? "抽牌失敗" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    alreadyDrawn: false,
    card,
    reportCount: reports?.length ?? 0,
  });
}

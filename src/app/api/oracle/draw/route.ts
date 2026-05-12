import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOracleUnlimited } from "@/lib/oracle/access";

export const dynamic = "force-dynamic";

const TIMEZONE = "Asia/Taipei";
const CANDIDATES = 3;

/**
 * 抽牌 API
 *   - 檢查今天（Asia/Taipei）有沒有抽過 → 有則回 409 + 既有紀錄
 *   - 沒抽過 → 從 oracle_cards 隨機選 3 張不重複的「候選牌」
 *     User 在前端點哪張就是哪張；後端不在此處儲存任何 state。
 *     reading API 收到 cardId 後直接以那張為準。
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  // 取 user role：admin / master / tester 免每日 1 次限制
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isUnlimited = isOracleUnlimited(profile?.role);

  // 一般學員：檢查當天有沒有抽過
  if (!isUnlimited) {
    const now = new Date();
    const todayLocal = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
    }).format(now);
    const dayStart = new Date(`${todayLocal}T00:00:00+08:00`).toISOString();
    const dayEnd = new Date(`${todayLocal}T23:59:59.999+08:00`).toISOString();

    const { data: existing, error: existErr } = await supabase
      .from("card_readings")
      .select(
        "id, question, ai_response, created_at, card:oracle_cards(id, card_number, card_name, card_message, card_image_url, keywords)"
      )
      .eq("user_id", user.id)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existErr) {
      return NextResponse.json({ error: existErr.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { alreadyDrawn: true, reading: existing },
        { status: 409 }
      );
    }
  }

  // 取總牌數
  const { count, error: countErr } = await supabase
    .from("oracle_cards")
    .select("*", { count: "exact", head: true });

  if (countErr || !count || count < CANDIDATES) {
    return NextResponse.json(
      { error: countErr?.message ?? "牌卡資料不足" },
      { status: 500 }
    );
  }

  // 隨機抽 3 個不重複的 card_number
  const picked = new Set<number>();
  while (picked.size < CANDIDATES) {
    picked.add(Math.floor(Math.random() * count) + 1); // card_number 是 1-indexed
  }
  const numbers = Array.from(picked);

  const { data: cards, error: cardErr } = await supabase
    .from("oracle_cards")
    .select("id, card_number, card_name, card_message, card_image_url, keywords")
    .in("card_number", numbers);

  if (cardErr || !cards || cards.length !== CANDIDATES) {
    return NextResponse.json(
      { error: cardErr?.message ?? "抽牌失敗" },
      { status: 500 }
    );
  }

  // 洗牌（in 查回來順序不保證）
  const shuffled = [...cards].sort(() => Math.random() - 0.5);

  return NextResponse.json({ alreadyDrawn: false, cards: shuffled });
}

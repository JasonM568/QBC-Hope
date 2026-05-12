import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CANDIDATES = 3;

/**
 * 抽牌 API
 *   - 抽牌次數不限，由點數扣除（reading API）控管使用頻率
 *   - 每次呼叫從 oracle_cards 隨機選 3 張不重複「候選牌」
 *   - User 在前端點哪張就是哪張；reading API 收到 cardId 後直接以那張為準
 *   - 不收費；費用在 reading API 才扣（避免只抽不解讀也吃點）
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
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

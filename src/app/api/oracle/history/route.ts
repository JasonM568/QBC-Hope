import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/**
 * 取得當前使用者的抽牌歷史。
 * Query：?page=0（從 0 開始）
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0"));
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("card_readings")
    .select(
      "id, question, ai_response, created_at, card:oracle_cards(id, card_number, card_name, card_message, card_image_url, keywords)",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    readings: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    hasMore: (count ?? 0) > to + 1,
  });
}

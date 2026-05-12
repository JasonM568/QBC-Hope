import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import {
  streamOracleReading,
  type DailyReportLite,
  type OracleCard,
} from "@/lib/oracle/claude";
import { isOracleUnlimited } from "@/lib/oracle/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DRAW_COST = 2;

interface RequestBody {
  cardId: number;
  question: string;
}

/**
 * AI 解讀 API（streaming）
 *   - 收 cardId + question
 *   - 學員：先扣 2 點（餘額不足 402）；coach/admin/master/tester 免扣
 *   - 串流 Claude 回應給前端（純文字 chunks）
 *   - 串完後自動寫入 card_readings
 *   - 抽牌次數不限（靠點數機制控管）
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { cardId, question } = body;
  if (!cardId || !question?.trim()) {
    return NextResponse.json(
      { error: "缺少 cardId 或 question" },
      { status: 400 }
    );
  }

  // 撈牌卡（順便給扣點的 note 用）
  const { data: cardRow, error: cardErr } = await supabase
    .from("oracle_cards")
    .select("id, card_number, card_name, card_message, keywords")
    .eq("id", cardId)
    .single();

  if (cardErr || !cardRow) {
    return NextResponse.json({ error: "找不到牌卡" }, { status: 404 });
  }

  const card: OracleCard = {
    card_number: cardRow.card_number,
    card_name: cardRow.card_name,
    card_message: cardRow.card_message,
    keywords: cardRow.keywords ?? [],
  };

  // 取 user role：unlimited 角色免扣點
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isUnlimited = isOracleUnlimited(profile?.role);

  // 扣點（在 stream 之前；失敗即拒，避免 LLM 白燒）
  if (!isUnlimited) {
    const { error: rpcErr } = await supabase.rpc("consume_points", {
      p_user_id: user.id,
      p_amount: DRAW_COST,
      p_type: "oracle_draw",
      p_reference_id: null,
      p_note: `每日抽牌 - ${cardRow.card_name}`,
    });

    if (rpcErr) {
      const msg = rpcErr.message ?? "";
      const isInsufficient =
        msg.includes("點數餘額不足") || msg.includes("點數不足");
      return NextResponse.json(
        { error: isInsufficient ? "點數不足，請聯絡管理員加值" : msg },
        { status: isInsufficient ? 402 : 500 }
      );
    }
  }

  // 撈最近 3 天的日報
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: reportRows } = await supabase
    .from("daily_reports")
    .select(
      "report_date, morning_gratitude, today_goals, action_taken, reflection, energy_level, mood_score"
    )
    .eq("user_id", user.id)
    .gte("report_date", threeDaysAgo)
    .order("report_date", { ascending: false })
    .limit(3);

  const recentReports: DailyReportLite[] = reportRows ?? [];

  // 串流 Claude，同時累積完整文字（最後寫 DB）
  const encoder = new TextEncoder();
  const userId = user.id;

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        for await (const chunk of streamOracleReading({
          question,
          card,
          recentReports,
        })) {
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "AI 解讀失敗";
        console.error("[oracle/reading] stream error:", err);
        controller.enqueue(encoder.encode(`\n\n[錯誤] ${msg}`));
        controller.close();
        return;
      }

      // 串完 → 自動存（用 service role 避免 RLS 麻煩 + 確保寫入）
      try {
        const admin = createServiceRoleClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { error: insertErr } = await admin
          .from("card_readings")
          .insert({
            user_id: userId,
            card_id: cardId,
            question,
            ai_response: fullText,
          });
        if (insertErr) {
          console.error(
            "[oracle/reading] save error:",
            insertErr.message
          );
        }
      } catch (e) {
        console.error("[oracle/reading] save exception:", e);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

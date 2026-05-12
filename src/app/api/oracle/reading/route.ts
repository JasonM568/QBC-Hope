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

const TIMEZONE = "Asia/Taipei";

interface RequestBody {
  cardId: number;
  question: string;
}

/**
 * AI 解讀 API（streaming）
 *   - 收 cardId + question
 *   - 串流 Claude 回應給前端（純文字 chunks）
 *   - 串完後自動寫入 card_readings
 *
 * 防呆：當天已有紀錄就拒絕（避免重抽鑽漏洞）。
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

  // 取 user role：admin / master / tester 免每日 1 次限制
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isUnlimited = isOracleUnlimited(profile?.role);

  // 一般學員：當天已有紀錄就拒
  if (!isUnlimited) {
    const todayLocal = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
    }).format(new Date());
    const dayStart = new Date(`${todayLocal}T00:00:00+08:00`).toISOString();
    const dayEnd = new Date(`${todayLocal}T23:59:59.999+08:00`).toISOString();

    const { data: existing } = await supabase
      .from("card_readings")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "今天已經抽過牌了，明天再來" },
        { status: 409 }
      );
    }
  }

  // 撈牌卡
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

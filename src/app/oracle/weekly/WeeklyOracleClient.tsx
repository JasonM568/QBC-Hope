"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ExportActions,
  type OracleCardLite,
} from "../OracleClient";

type Mode = "idle" | "drawing" | "reading" | "done";

interface Props {
  reportCount: number;
  initialBalance: number;
  isUnlimited: boolean;
}

const WEEKLY_QUESTION_DISPLAY = "過去 7 天的能量回顧";
const DRAW_COST = 2;

export default function WeeklyOracleClient({
  reportCount,
  initialBalance,
  isUnlimited,
}: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [card, setCard] = useState<OracleCardLite | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(initialBalance);

  const insufficient = !isUnlimited && balance < DRAW_COST;

  async function handleStart() {
    setError(null);
    if (insufficient) {
      setError("點數不足，請聯絡管理員加值");
      return;
    }

    setMode("drawing");

    try {
      const drawRes = await fetch("/api/oracle/weekly/draw", {
        method: "POST",
      });
      if (!drawRes.ok) {
        const data = await drawRes.json().catch(() => ({}));
        throw new Error(data.error ?? "抽牌失敗");
      }
      const drawData: { card: OracleCardLite } = await drawRes.json();
      setCard(drawData.card);

      // 起 streaming
      setMode("reading");
      setAiResponse("");

      const readRes = await fetch("/api/oracle/weekly/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: drawData.card.id }),
      });
      if (!readRes.ok || !readRes.body) {
        const data = await readRes.json().catch(() => ({}));
        if (readRes.status === 402) {
          setError(data.error ?? "點數不足，請聯絡管理員加值");
          setMode("idle");
          setCard(null);
          return;
        }
        throw new Error(data.error ?? "AI 解讀失敗");
      }
      if (!isUnlimited) {
        setBalance((b) => Math.max(0, b - DRAW_COST));
      }
      const reader = readRes.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setAiResponse((prev) => prev + text);
      }
      setMode("done");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "發生未知錯誤");
      setMode("idle");
    }
  }

  function handleResetForNewDraw() {
    setMode("idle");
    setCard(null);
    setAiResponse("");
    setError(null);
  }

  return (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gold-gradient">
          ✦ 七日回顧 ✦
        </h1>
        <p className="text-sm text-muted-foreground">
          {isUnlimited
            ? "教練／管理員 — 不扣點"
            : `每次抽牌 −${DRAW_COST} 點｜目前餘額 `}
          {!isUnlimited && (
            <Link
              href="/points"
              className="text-gold font-semibold hover:underline"
            >
              {balance} 點
            </Link>
          )}
        </p>
      </header>

      {/* IDLE：邀請點按鈕 */}
      {mode === "idle" && (
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <p className="text-sm">
              系統會撈取你過去 7 天的日報，由量子能量牌卡為你做一個
              <span className="text-gold"> 能量回顧 </span>。
            </p>
            <p className="text-xs text-muted-foreground">
              📊 過去 7 天有 {reportCount} 筆日報紀錄
              {reportCount === 0 && (
                <span className="text-red-400 ml-2">
                  （沒寫日報也可以抽牌，但解讀深度有限。建議先寫幾天日報再來。）
                </span>
              )}
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={handleStart}
              disabled={insufficient}
              className="rounded-md bg-gold px-6 py-3 text-sm font-medium text-black hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ✦ 為我抽一張回顧牌
              {!isUnlimited && ` (−${DRAW_COST} 點)`} ✦
            </button>
          </div>
          {insufficient && (
            <p className="text-sm text-yellow-400 text-center">
              ⚠️ 點數不足（需要 {DRAW_COST} 點，目前 {balance} 點）。請聯絡管理員加值，或先去填寫日報領 2 點。
            </p>
          )}
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </section>
      )}

      {/* DRAWING */}
      {mode === "drawing" && (
        <section className="text-center py-16">
          <div className="text-6xl animate-pulse">🎴</div>
          <p className="mt-6 text-sm text-muted-foreground">
            正在感應你這 7 天的能量場...
          </p>
        </section>
      )}

      {/* READING / DONE */}
      {(mode === "reading" || mode === "done") && card && (
        <section className="space-y-6">
          <CardFaceWeekly card={card} />

          <div className="rounded-lg border border-gold/40 bg-card p-6">
            <p className="text-xs text-gold mb-3 tracking-widest">
              ✦ 七日回顧 ✦
            </p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {renderRichLocal(aiResponse)}
              {mode === "reading" && (
                <span className="inline-block w-2 h-4 ml-1 bg-gold animate-pulse align-middle" />
              )}
            </div>
          </div>

          {mode === "done" && (
            <>
              <ExportActions
                card={card}
                question={WEEKLY_QUESTION_DISPLAY}
                aiResponse={aiResponse}
                mode="weekly"
              />
              <footer className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={handleResetForNewDraw}
                  disabled={insufficient}
                  className="rounded-md bg-gold/90 text-black px-4 py-2 text-sm font-medium hover:bg-gold disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ✦ 再抽一張
                  {!isUnlimited && ` (−${DRAW_COST} 點)`}
                </button>
                <Link
                  href="/oracle"
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-card transition text-center"
                >
                  回每日抽牌
                </Link>
                <Link
                  href="/oracle/history"
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-card transition text-center"
                >
                  看歷史紀錄
                </Link>
              </footer>
              {insufficient && (
                <p className="text-xs text-yellow-400 text-center">
                  點數不足，請聯絡管理員加值
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function CardFaceWeekly({ card }: { card: OracleCardLite }) {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative w-44 h-64 sm:w-52 sm:h-80 rounded-lg overflow-hidden border-2 border-gold/60 shadow-lg shadow-gold/20 bg-card">
        {card.card_image_url && (
          <Image
            src={card.card_image_url}
            alt={card.card_name}
            fill
            sizes="(max-width: 640px) 176px, 208px"
            className="object-cover"
            priority
          />
        )}
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          #{String(card.card_number).padStart(2, "0")}
        </p>
        <p className="text-2xl font-bold text-gold-gradient">{card.card_name}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          {card.card_message}
        </p>
      </div>
    </div>
  );
}

/**
 * 本地的 markdown 粗體渲染（複製自 OracleClient，獨立避免循環 import 麻煩）
 */
function renderRichLocal(text: string): React.ReactNode[] {
  if (!text) return [];
  const segments = text.split(/(\*\*[^*\n]+?\*\*)/g);
  return segments.map((seg, i) => {
    const m = seg.match(/^\*\*(.+)\*\*$/);
    if (m) {
      return (
        <strong key={i} style={{ color: "inherit", fontWeight: 600 }}>
          {m[1]}
        </strong>
      );
    }
    return <span key={i}>{seg}</span>;
  });
}

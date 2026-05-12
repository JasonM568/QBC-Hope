"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ExportActions,
  type OracleCardLite,
} from "../OracleClient";

export interface ExistingWeeklyReading {
  id: string;
  ai_response: string;
  created_at: string;
  card: OracleCardLite;
}

type Mode = "idle" | "drawing" | "reading" | "done" | "already";

interface Props {
  initialReading: ExistingWeeklyReading | null;
  reportCount: number;
}

const WEEKLY_QUESTION_DISPLAY = "過去 7 天的能量回顧";

export default function WeeklyOracleClient({
  initialReading,
  reportCount,
}: Props) {
  const [mode, setMode] = useState<Mode>(
    initialReading ? "already" : "idle"
  );
  const [card, setCard] = useState<OracleCardLite | null>(
    initialReading?.card ?? null
  );
  const [aiResponse, setAiResponse] = useState(
    initialReading?.ai_response ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    setMode("drawing");

    try {
      const drawRes = await fetch("/api/oracle/weekly/draw", {
        method: "POST",
      });
      if (drawRes.status === 409) {
        const data = await drawRes.json();
        if (data.reading) {
          setCard(data.reading.card);
          setAiResponse(data.reading.ai_response);
          setMode("already");
          return;
        }
      }
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
        throw new Error(data.error ?? "AI 解讀失敗");
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

  return (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gold-gradient">
          ✦ 七日回顧 ✦
        </h1>
        <p className="text-sm text-muted-foreground">
          結合你過去 7 天的日報，為這一週抽一張牌卡能量總結
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
              className="rounded-md bg-gold px-6 py-3 text-sm font-medium text-black hover:bg-gold/90 transition"
            >
              ✦ 為我抽一張回顧牌 ✦
            </button>
          </div>
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

      {/* READING / DONE / ALREADY */}
      {(mode === "reading" || mode === "done" || mode === "already") && card && (
        <section className="space-y-6">
          {mode === "already" && (
            <div className="rounded-lg border border-gold/30 bg-card/30 p-3 text-center text-xs text-muted-foreground">
              ✨ 你這週已抽過七日回顧。下次抽牌需要等到 7 天後。
            </div>
          )}

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

          {(mode === "done" || mode === "already") && (
            <>
              <ExportActions
                card={card}
                question={WEEKLY_QUESTION_DISPLAY}
                aiResponse={aiResponse}
                mode="weekly"
              />
              <footer className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
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

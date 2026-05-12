"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export interface OracleCardLite {
  id: number;
  card_number: number;
  card_name: string;
  card_message: string;
  card_image_url: string | null;
  keywords: string[] | null;
}

type Mode =
  | "idle" // 還沒抽：顯示問題輸入
  | "preparing" // draw API 載入 3 張候選
  | "selecting" // 三張背面，等使用者點
  | "revealing" // 點選後：兩側淡出 + 中間翻面（~1.2s）
  | "reading" // AI 串流中
  | "done"; // 完成

interface Props {
  initialBalance: number;
  isUnlimited: boolean;
}

const DRAW_COST = 2;

const TOPIC_TEMPLATES: { label: string; template: string }[] = [
  {
    label: "財富",
    template: "關於財富與金錢的流動，我目前的狀態需要看見什麼？",
  },
  {
    label: "健康",
    template: "關於我的身體與能量狀態，現在需要被覺察的是什麼？",
  },
  {
    label: "關係",
    template: "關於我目前的人際關係，我的內在正在投射什麼？",
  },
  {
    label: "家庭",
    template: "關於我與家人之間的連結，我此刻需要看見什麼？",
  },
  {
    label: "事業",
    template: "關於我目前的事業方向，我需要鬆動哪個信念才能前進？",
  },
];

export default function OracleClient({ initialBalance, isUnlimited }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [question, setQuestion] = useState("");
  const [candidates, setCandidates] = useState<OracleCardLite[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [card, setCard] = useState<OracleCardLite | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(initialBalance);

  const insufficient = !isUnlimited && balance < DRAW_COST;

  async function handleDraw() {
    setError(null);
    if (!question.trim()) {
      setError("請先輸入想問的問題");
      return;
    }
    if (question.trim().length < 4) {
      setError("問題太短了，多寫一點讓 AI 能解讀");
      return;
    }
    if (insufficient) {
      setError("點數不足，請聯絡管理員加值");
      return;
    }

    setMode("preparing");
    try {
      const res = await fetch("/api/oracle/draw", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "抽牌失敗");
      }
      const data: { cards: OracleCardLite[] } = await res.json();
      setCandidates(data.cards);
      setMode("selecting");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "發生未知錯誤");
      setMode("idle");
    }
  }

  async function handlePick(idx: number) {
    if (mode !== "selecting") return;
    const picked = candidates[idx];
    setSelectedIndex(idx);
    setCard(picked);
    setMode("revealing");

    // 等翻面動畫播完（1.2s）再開始串流
    await new Promise((r) => setTimeout(r, 1300));

    setMode("reading");
    setAiResponse("");

    try {
      const res = await fetch("/api/oracle/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: picked.id,
          question: question.trim(),
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        // 402 點數不足：拉回 idle，提示使用者
        if (res.status === 402) {
          setError(data.error ?? "點數不足，請聯絡管理員加值");
          setMode("idle");
          setSelectedIndex(null);
          setCard(null);
          return;
        }
        throw new Error(data.error ?? "AI 解讀失敗");
      }
      // 後端已扣 2 點，前端餘額同步
      if (!isUnlimited) {
        setBalance((b) => Math.max(0, b - DRAW_COST));
      }
      const reader = res.body.getReader();
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
      setError(err instanceof Error ? err.message : "AI 解讀失敗");
      setMode("done");
    }
  }

  function handleResetForNewDraw() {
    setMode("idle");
    setQuestion("");
    setCandidates([]);
    setSelectedIndex(null);
    setCard(null);
    setAiResponse("");
    setError(null);
  }

  return (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gold-gradient">量子能量牌卡</h1>
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

      {/* === IDLE：輸入問題 === */}
      {mode === "idle" && (
        <>
          {/* 七日回顧副入口 */}
          <Link
            href="/oracle/weekly"
            className="block rounded-lg border border-gold/40 bg-gradient-to-r from-card via-gold/5 to-card p-4 hover:border-gold transition group"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gold">
                  ✦ 看我這 7 天 ✦
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  結合過去 7 天的日報，為這一週做能量回顧
                </p>
              </div>
              <span className="text-gold/60 group-hover:text-gold transition">
                →
              </span>
            </div>
          </Link>

        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              想不到從哪問起？點一個主題快速開始：
            </p>
            <div className="flex flex-wrap gap-2">
              {TOPIC_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setQuestion(t.template)}
                  className="rounded-full border border-gold/40 bg-card px-3 py-1 text-xs text-gold hover:bg-gold/10 hover:border-gold transition"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm text-muted-foreground">
            你想問什麼問題？
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="例如：最近工作壓力很大，不知道是該繼續還是放下，我內在需要看見什麼？"
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
            maxLength={300}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {question.length} / 300
            </span>
            <button
              onClick={handleDraw}
              disabled={!question.trim() || insufficient}
              className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-black hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              展開牌堆{!isUnlimited && ` (−${DRAW_COST} 點)`}
            </button>
          </div>
          {insufficient && (
            <p className="text-sm text-yellow-400">
              ⚠️ 點數不足（需要 {DRAW_COST} 點，目前 {balance} 點）。請聯絡管理員加值，或先去填寫日報領 2 點。
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>
        </>
      )}

      {/* === PREPARING：載入 3 張候選 === */}
      {mode === "preparing" && (
        <section className="text-center py-12">
          <div className="text-5xl animate-pulse">🎴</div>
          <p className="mt-4 text-sm text-muted-foreground">
            正在感應能量場，為你展開牌堆...
          </p>
        </section>
      )}

      {/* === SELECTING / REVEALING：三張橫排 === */}
      {(mode === "selecting" || mode === "revealing") && (
        <section className="space-y-6">
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">你的提問</p>
            <p className="text-sm">{question}</p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "selecting"
              ? "靜下心，憑直覺選一張"
              : "感應確認中..."}
          </p>

          <div className="flex justify-center items-center gap-2 sm:gap-6">
            {candidates.map((c, idx) => {
              const isSelected = selectedIndex === idx;
              const isDimmed =
                mode === "revealing" && selectedIndex !== null && !isSelected;
              return (
                <FlippableCard
                  key={c.id}
                  card={c}
                  flipped={isSelected && mode === "revealing"}
                  dimmed={isDimmed}
                  onClick={
                    mode === "selecting" ? () => handlePick(idx) : undefined
                  }
                  position={idx - 1}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* === READING / DONE：顯示牌與解讀 === */}
      {(mode === "reading" || mode === "done") && card && (
        <section className="space-y-6">
          <CardFace card={card} />

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">你的提問</p>
            <p className="text-sm">{question}</p>
          </div>

          <div className="rounded-lg border border-gold/40 bg-card p-6">
            <p className="text-xs text-gold mb-3 tracking-widest">
              ✦ 牌卡解讀 ✦
            </p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {renderRich(aiResponse)}
              {mode === "reading" && (
                <span className="inline-block w-2 h-4 ml-1 bg-gold animate-pulse align-middle" />
              )}
            </div>
          </div>

          {mode === "done" && (
            <>
              <ExportActions
                card={card}
                question={question}
                aiResponse={aiResponse}
              />
              <footer className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={handleResetForNewDraw}
                  disabled={insufficient}
                  className="rounded-md bg-gold/90 text-black px-4 py-2 text-sm font-medium hover:bg-gold disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ✦ 再抽一次
                  {!isUnlimited && ` (−${DRAW_COST} 點)`}
                </button>
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

/* ============================================================
 * 翻面牌：背面 / 正面用 3D rotateY 互換
 * 背面 = CSS 牌背（深色 + 金色邊 + 量子符號 ✦）
 * 正面 = next/image 載入 Supabase Storage 的牌卡圖
 * ============================================================ */
function FlippableCard({
  card,
  flipped,
  dimmed,
  onClick,
  position,
}: {
  card: OracleCardLite;
  flipped: boolean;
  dimmed: boolean;
  onClick?: () => void;
  position: number; // -1 / 0 / 1，用來做翻面後置中
}) {
  // 點選後，被選中的牌「滑到中間 + 放大」，其他兩張淡出縮小
  const transitionStyle: React.CSSProperties = {
    transition: "all 700ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const containerStyle: React.CSSProperties = {
    ...transitionStyle,
    perspective: "1200px",
    opacity: dimmed ? 0.15 : 1,
    transform: dimmed
      ? "scale(0.8) translateX(0)"
      : flipped
        ? `translateX(${-position * 100}%) scale(1.15)`
        : "scale(1)",
  };

  const innerStyle: React.CSSProperties = {
    ...transitionStyle,
    transitionDuration: "1200ms",
    transformStyle: "preserve-3d",
    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
    position: "relative",
    width: "100%",
    height: "100%",
  };

  const faceBase: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    borderRadius: "0.5rem",
    overflow: "hidden",
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={containerStyle}
      className={`relative w-[100px] h-[150px] sm:w-[168px] sm:h-[252px] shrink-0 ${
        onClick
          ? "cursor-pointer hover:scale-105 hover:-translate-y-1"
          : "cursor-default"
      }`}
      aria-label={onClick ? "選這張牌" : card.card_name}
    >
      <div style={innerStyle}>
        {/* 背面 */}
        <div
          style={{
            ...faceBase,
            background:
              "radial-gradient(ellipse at center, rgba(40,30,15,0.95), rgba(15,12,8,1))",
            border: "2px solid rgba(212,175,55,0.6)",
            boxShadow:
              "0 0 16px rgba(212,175,55,0.15), inset 0 0 24px rgba(212,175,55,0.08)",
          }}
          className="flex items-center justify-center"
        >
          <CardBackArt />
        </div>

        {/* 正面 */}
        <div
          style={{
            ...faceBase,
            transform: "rotateY(180deg)",
            border: "2px solid rgba(212,175,55,0.6)",
            background: "rgb(15,12,8)",
          }}
        >
          {card.card_image_url && (
            <Image
              src={card.card_image_url}
              alt={card.card_name}
              fill
              sizes="(max-width: 640px) 100px, 168px"
              className="object-cover"
              priority
            />
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * 牌背圖案：量子符號 ✦ + 細邊框
 * 純 SVG，跟著容器縮放
 */
function CardBackArt() {
  return (
    <svg
      viewBox="0 0 100 150"
      className="w-3/4 h-3/4 text-gold"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      {/* 外框 */}
      <rect
        x="8"
        y="12"
        width="84"
        height="126"
        rx="4"
        strokeWidth="0.5"
        opacity="0.5"
      />
      <rect
        x="12"
        y="16"
        width="76"
        height="118"
        rx="3"
        strokeWidth="0.3"
        opacity="0.3"
      />
      {/* 中央量子符號 ✦ */}
      <g transform="translate(50 75)">
        <path
          d="M 0 -22 L 4 -4 L 22 0 L 4 4 L 0 22 L -4 4 L -22 0 L -4 -4 Z"
          fill="currentColor"
          opacity="0.85"
        />
        <circle cx="0" cy="0" r="3" fill="rgba(15,12,8,1)" />
        <circle
          cx="0"
          cy="0"
          r="30"
          strokeWidth="0.4"
          opacity="0.5"
        />
        <circle
          cx="0"
          cy="0"
          r="38"
          strokeWidth="0.3"
          opacity="0.3"
        />
      </g>
      {/* 上下小符號 */}
      <text
        x="50"
        y="32"
        textAnchor="middle"
        fontSize="6"
        fill="currentColor"
        opacity="0.5"
      >
        ✦
      </text>
      <text
        x="50"
        y="124"
        textAnchor="middle"
        fontSize="6"
        fill="currentColor"
        opacity="0.5"
      >
        ✦
      </text>
    </svg>
  );
}

/**
 * 正面顯示（解讀階段用，大尺寸）
 */
function CardFace({ card }: { card: OracleCardLite }) {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative w-40 h-60 sm:w-48 sm:h-72 rounded-lg overflow-hidden border-2 border-gold/60 shadow-lg shadow-gold/10 bg-card">
        {card.card_image_url ? (
          <Image
            src={card.card_image_url}
            alt={card.card_name}
            fill
            sizes="(max-width: 640px) 160px, 192px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gold text-xl">
            #{card.card_number} {card.card_name}
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          #{String(card.card_number).padStart(2, "0")}
        </p>
        <p className="text-xl font-bold text-gold-gradient">{card.card_name}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          {card.card_message}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
 * 解讀完成後的匯出功能：
 *   - 隱藏 540×960 分享卡（黑底金邊，含牌圖/問題/解讀/金句/HOPE 浮水印）
 *   - 兩顆按鈕：下載 PNG、下載 PDF
 *   - 用 html2canvas + jspdf 產出檔案
 * ============================================================ */
export function ExportActions({
  card,
  question,
  aiResponse,
  mode = "daily",
}: {
  card: OracleCardLite;
  question: string;
  aiResponse: string;
  mode?: "daily" | "weekly";
}) {
  const shareRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const today = new Date().toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const safeName = card.card_name.replace(/[^一-鿿A-Za-z0-9]/g, "");
  const filenameBase = `HOPE_牌卡_${card.card_number}_${safeName}`;

  async function captureCanvas() {
    if (!shareRef.current) throw new Error("分享卡尚未準備好");
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(shareRef.current, {
      scale: 2,
      backgroundColor: "#0a0808",
      useCORS: true,
      allowTaint: false,
      logging: false,
    });
  }

  async function handleExportPng() {
    if (exporting) return;
    setExporting("png");
    try {
      const canvas = await captureCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) throw new Error("產生圖片失敗");
      triggerDownload(blob, `${filenameBase}.png`);
    } catch (e) {
      console.error("[export-png]", e);
      alert(e instanceof Error ? e.message : "下載失敗，請重試");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPdf() {
    if (exporting) return;
    setExporting("pdf");
    try {
      const canvas = await captureCanvas();
      const dataUrl = canvas.toDataURL("image/png", 1);
      const { default: jsPDF } = await import("jspdf");
      // A4 直式 210×297mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297);
      pdf.save(`${filenameBase}.pdf`);
    } catch (e) {
      console.error("[export-pdf]", e);
      alert(e instanceof Error ? e.message : "下載失敗，請重試");
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
        <button
          onClick={handleExportPng}
          disabled={!!exporting}
          className="rounded-md border border-gold/50 bg-gold/10 px-4 py-2 text-sm text-gold hover:bg-gold/20 disabled:opacity-50 disabled:cursor-wait transition"
        >
          {exporting === "png" ? "圖卡產生中..." : "📷 下載圖卡 (PNG)"}
        </button>
        <button
          onClick={handleExportPdf}
          disabled={!!exporting}
          className="rounded-md border border-gold/50 bg-gold/10 px-4 py-2 text-sm text-gold hover:bg-gold/20 disabled:opacity-50 disabled:cursor-wait transition"
        >
          {exporting === "pdf" ? "PDF 產生中..." : "📄 下載 PDF"}
        </button>
      </div>

      {/* 隱藏分享卡：A4 直式比例（750×1060，1:1.414），html2canvas 截這塊。
          用 absolute + left:-9999px 讓使用者看不到，但 DOM 完整渲染。
          PDF 輸出 A4 (210×297mm) 填滿。 */}
      <div
        ref={shareRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: 750,
          height: 1060,
          background:
            "linear-gradient(180deg, #0a0808 0%, #1a1410 50%, #0a0808 100%)",
          color: "#e8d49a",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Microsoft JhengHei', sans-serif",
          boxSizing: "border-box",
          padding: 0,
          overflow: "hidden",
        }}
        aria-hidden
      >
        <ShareCardContent
          card={card}
          question={question}
          aiResponse={aiResponse}
          dateStr={today}
          mode={mode}
        />
      </div>
    </>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 分享卡內容 — 固定 540×960，所有樣式用 inline style（html2canvas 對 utility class 處理不穩）。
 */
function ShareCardContent({
  card,
  question,
  aiResponse,
  dateStr,
  mode = "daily",
}: {
  card: OracleCardLite;
  question: string;
  aiResponse: string;
  dateStr: string;
  mode?: "daily" | "weekly";
}) {
  // 分離 AI 解讀本文跟結尾金句（金句的格式為 「...」 —— 顧及然院長）
  const { body, quote } = splitQuote(aiResponse);

  // 解讀字級固定 16px (12pt) — 跟提問內容、底部簽名一致，
  // 與 24px 的 label 形成穩定的層級關係。
  // Claude 端已限制 200-260 字，正常不會被 overflow 截斷。
  const bodyFontSize = 16;
  const bodyLineHeight = 1.85;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "40px 48px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        border: "1px solid rgba(212,175,55,0.4)",
      }}
    >
      {/* 頂部 logo */}
      <div
        style={{
          textAlign: "center",
          letterSpacing: "0.4em",
          fontSize: 27, // 20pt
          fontWeight: 600,
          color: "rgba(212,175,55,0.95)",
          marginBottom: 8,
        }}
      >
        ✦ HOPE OS ✦
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 24, // 18pt
          color: "rgba(232,212,154,0.85)",
          marginBottom: 16,
          letterSpacing: "0.15em",
        }}
      >
        {mode === "weekly" ? "七日回顧" : "量子能量牌卡"} · #
        {String(card.card_number).padStart(2, "0")}{" "}
        <span style={{ color: "#f5deb3", fontWeight: 600 }}>
          {card.card_name}
        </span>
      </div>

      {/* 牌卡圖（已將編號與牌名合進副標題，下方不再單獨列出） */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 200,
            height: 300,
            borderRadius: 10,
            overflow: "hidden",
            border: "2px solid rgba(212,175,55,0.6)",
            boxShadow: "0 6px 32px rgba(212,175,55,0.2)",
            background: "#15110b",
          }}
        >
          {card.card_image_url && (
            // 用 plain img 比 next/image 更適合 html2canvas
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.card_image_url}
              alt={card.card_name}
              crossOrigin="anonymous"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          )}
        </div>
      </div>

      {/* 提問（weekly 模式不顯示） */}
      {mode === "daily" && (
        <>
          <div
            style={{
              fontSize: 24,
              color: "rgba(212,175,55,0.9)",
              letterSpacing: "0.2em",
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            ✦ 我的提問 ✦
          </div>
          <div
            style={{
              fontSize: 16,
              color: "rgba(232,212,154,0.95)",
              lineHeight: 2.0,
              paddingBottom: 6,
              marginBottom: 20,
            }}
          >
            {question}
          </div>
        </>
      )}

      {/* 解讀本文 */}
      <div
        style={{
          fontSize: 24,
          color: "rgba(212,175,55,0.9)",
          letterSpacing: "0.2em",
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        ✦ {mode === "weekly" ? "七日回顧" : "牌卡解讀"} ✦
      </div>
      <div
        style={{
          flex: 1,
          fontSize: bodyFontSize,
          color: "rgba(232,212,154,0.95)",
          lineHeight: bodyLineHeight,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        {renderRich(body)}
      </div>

      {/* 金句 */}
      {quote && (
        <div
          style={{
            borderTop: "1px solid rgba(212,175,55,0.3)",
            paddingTop: 16,
            marginBottom: 14,
            textAlign: "center",
            fontStyle: "italic",
            fontSize: 27, // 20pt
            color: "#f5deb3",
            lineHeight: 1.55,
            fontWeight: 500,
          }}
        >
          「{quote}」
          <div
            style={{
              fontStyle: "normal",
              fontSize: 16, // 12pt
              color: "rgba(212,175,55,0.8)",
              marginTop: 10,
              letterSpacing: "0.15em",
            }}
          >
            —— 顧及然院長
          </div>
        </div>
      )}

      {/* 底部簽名 */}
      <div
        style={{
          borderTop: "1px solid rgba(212,175,55,0.2)",
          paddingTop: 12,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 14,
          color: "rgba(232,212,154,0.6)",
          letterSpacing: "0.1em",
        }}
      >
        <span>{dateStr}</span>
        <span>hope.huangxi.info</span>
      </div>
    </div>
  );
}

/**
 * 把 AI 解讀拆成「本文」與「結尾金句」
 *   - 找最後一個 「...」 + 顧及然院長 的 pattern
 *   - 找不到就回 { body: 全文, quote: null }
 */
/**
 * 把 AI 回應中的 **xxx** 轉成 <strong>xxx</strong>，順手 strip 掉單獨的 `*` 跟 markdown bullets。
 * - 保留換行（外層用 whiteSpace: pre-wrap）
 * - 對 html2canvas 友善（inline <strong>）
 */
function renderRich(text: string): React.ReactNode[] {
  if (!text) return [];
  // 先處理 **bold**
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

function splitQuote(text: string): { body: string; quote: string | null } {
  // 容忍多種引號 + 多餘空白 + 跨行
  const re =
    /[「『"]([^「」『』"\n]{4,80})[」』"][\s\n>—\-–]*(?:顧及然(?:院長|老師))?\s*$/;
  const trimmed = text.trim();
  const match = trimmed.match(re);
  if (!match) return { body: trimmed, quote: null };
  const quote = match[1].trim();
  const body = trimmed
    .slice(0, match.index)
    .replace(/[—\-–]+\s*$/m, "")
    .replace(/>\s*$/m, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { body, quote };
}

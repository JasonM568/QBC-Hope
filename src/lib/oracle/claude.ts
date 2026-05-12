import Anthropic from "@anthropic-ai/sdk";
import { QUANTUM_THINKING_KNOWLEDGE } from "./knowledge";
import { GU_QUOTES } from "./quotes";

// 自動讀 process.env.ANTHROPIC_API_KEY
const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 800;

export interface OracleCard {
  card_number: number;
  card_name: string;
  card_message: string;
  keywords?: string[];
}

export interface DailyReportLite {
  report_date: string;
  morning_gratitude?: string | null;
  today_goals?: string | null;
  action_taken?: string | null;
  reflection?: string | null;
  energy_level?: number | null;
  mood_score?: number | null;
}

export interface OracleReadingInput {
  question: string;
  card: OracleCard;
  recentReports: DailyReportLite[];
}

function formatRecentReports(reports: DailyReportLite[]): string {
  if (!reports.length) return "";
  return reports
    .map((r) => {
      const parts: string[] = [`📅 ${r.report_date}`];
      if (r.morning_gratitude) parts.push(`感恩：${r.morning_gratitude}`);
      if (r.today_goals) parts.push(`目標：${r.today_goals}`);
      if (r.action_taken) parts.push(`行動：${r.action_taken}`);
      if (r.reflection) parts.push(`反思：${r.reflection}`);
      if (typeof r.energy_level === "number")
        parts.push(`能量：${r.energy_level}/10`);
      if (typeof r.mood_score === "number")
        parts.push(`心情：${r.mood_score}/10`);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}

function buildSystemPrompt(): string {
  const base = [
    QUANTUM_THINKING_KNOWLEDGE,
    "",
    "---",
    "",
    "## 你的角色設定",
    "你是 HOPE OS 量子能量牌卡的解讀師。",
    "",
    "**語氣**：溫暖、像智慧的導師。承認情緒的真實、不批判、不嚇人、不玄學。",
    "**字數**：嚴格控制在 200-260 字之間（不含結尾金句），絕不超過 300 字。寧可精煉也不要冗長。每段不超過 3-4 句，全篇 3-4 段最理想。",
    "**結構**：",
    "1. 先用一兩句連結「牌名」與「學員當下的狀態」。",
    "2. 中段做能量／信念層次的解讀，連結到量子思維世界觀（觀察者效應、頻率、四大現象其中一個）。",
    "3. 給一個今天可以做的具體覺察或行動（一個念頭、一個動作）。",
    "",
    "**禁止**：算命式預言、宗教用語（神、業力、輪迴）、否定學員當下的情緒、空洞的雞湯、Markdown 加粗符號（不要寫 **xxx**，需要強調直接用引號「」或直接平鋪即可）。",
  ].join("\n");

  if (GU_QUOTES.length === 0) return base;

  const quotesBlock = [
    "",
    "---",
    "",
    "## 結尾金句要求（重要）",
    "",
    "解讀完成後，**必須**從下方「顧及然院長語錄」中選一句**最契合本次解讀核心觀點**的金句，",
    "以下列格式作為最後一段呈現：",
    "",
    "```",
    "",
    "> 「金句原文」",
    "> —— 顧及然院長",
    "```",
    "",
    "**鐵則**：",
    "- 必須**完整原文**引用，不可改字、不可省略、不可合併兩句、不可重新組句。",
    "- 嚴禁自行創造、改寫、虛構任何金句。",
    "- 若清單裡沒有真正契合的金句，寧可選一句語感最相近的，**也不可創造**。",
    "",
    "## 顧及然院長語錄（唯一可引用來源）",
    "",
    GU_QUOTES.map((q, i) => `${i + 1}. 「${q}」`).join("\n"),
  ].join("\n");

  return base + quotesBlock;
}

function buildUserPrompt(input: OracleReadingInput): string {
  const recent = formatRecentReports(input.recentReports);
  const lines: string[] = [
    "## 學員抽到的牌卡",
    `編號 #${input.card.card_number} ｜ 「${input.card.card_name}」`,
    `牌面訊息：${input.card.card_message}`,
  ];
  if (input.card.keywords?.length) {
    lines.push(`關鍵字：${input.card.keywords.join("、")}`);
  }
  lines.push("", "## 學員的提問", input.question);
  if (recent) {
    lines.push("", "## 學員近期狀態（最近 3 天日報）", recent);
  } else {
    lines.push(
      "",
      "## 學員近期狀態",
      "（無近期日報資料，請僅依提問與牌卡解讀）"
    );
  }
  lines.push(
    "",
    "請以量子思維世界觀，為這位學員解讀一段 200-400 字的回覆。"
  );
  return lines.join("\n");
}

/**
 * 串流 AI 解讀。逐 chunk yield 文字。
 * 呼叫者負責累積完整文字 + 寫入 card_readings。
 */
export async function* streamOracleReading(
  input: OracleReadingInput
): AsyncGenerator<string> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(input);

  const stream = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: user }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

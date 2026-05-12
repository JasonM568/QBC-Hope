import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const client = new Anthropic();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. 隨機抽一張
const { data: cards } = await admin.from("oracle_cards").select("*").limit(52);
const card = cards[Math.floor(Math.random() * cards.length)];
console.log(`\n🎴 抽到：#${card.card_number} ${card.card_name}`);
console.log(`   牌面：${card.card_message.slice(0, 60)}...\n`);

// 2. 模擬問題
const question = "我最近工作很累、家庭關係也不太理想，感覺自己卡在一個出不去的狀態，我內在需要看見什麼？";
console.log(`❓ 提問：${question}\n`);

// 3. 讀知識庫 + 語錄
const ktSrc = await readFile("/Users/jasonmchen/QBC-Hope/src/lib/oracle/knowledge.ts", "utf8");
const kb = ktSrc.match(/`([\s\S]+?)`\.trim\(\)/)[1].trim();
const quotesSrc = await readFile("/Users/jasonmchen/QBC-Hope/src/lib/oracle/quotes.ts", "utf8");
const arrayBlock = quotesSrc.match(/GU_QUOTES:\s*string\[\]\s*=\s*\[([\s\S]+?)\];/)[1];
const quotes = [...arrayBlock.matchAll(/"([^"]+?)"/g)].map((m) => m[1]);
console.log(`📚 載入 ${quotes.length} 句語錄\n`);

const baseSystem = `${kb}

---

## 你的角色設定
你是 HOPE OS 量子能量牌卡的解讀師。
**語氣**：溫暖、像智慧的導師。承認情緒的真實、不批判、不嚇人、不玄學。
**字數**：嚴格控制在 200-400 字之間（不含結尾金句）。
**結構**：(1) 連結牌名與當下狀態 (2) 量子思維解讀 (3) 今天能做的覺察/行動。
**禁止**：算命式預言、宗教用語（神、業力、輪迴）、否定學員當下的情緒、空洞雞湯。`;

const quotesBlock = quotes.length === 0 ? "" : `

---

## 結尾金句要求（重要）

解讀完成後，**必須**從下方「顧及然老師語錄」中選一句**最契合本次解讀核心觀點**的金句，以下列格式作為最後一段呈現：

> 「金句原文」
> —— 顧及然老師

**鐵則**：必須完整原文引用，嚴禁自行創造、改寫、虛構金句。

## 顧及然老師語錄（唯一可引用來源）

${quotes.map((q, i) => `${i + 1}. 「${q}」`).join("\n")}`;

const system = baseSystem + quotesBlock;

const user = `## 學員抽到的牌卡
編號 #${card.card_number} ｜ 「${card.card_name}」
牌面訊息：${card.card_message}

## 學員的提問
${question}

## 學員近期狀態
（無近期日報資料，請僅依提問與牌卡解讀）

請以量子思維世界觀，為這位學員解讀一段 200-400 字的回覆。`;

console.log("🤖 Claude streaming 開始...\n");
console.log("=".repeat(60));

const stream = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  stream: true,
  system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: user }],
});

let full = "";
let firstChunkAt = null;
const t0 = Date.now();
for await (const ev of stream) {
  if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
    if (!firstChunkAt) firstChunkAt = Date.now();
    process.stdout.write(ev.delta.text);
    full += ev.delta.text;
  }
  if (ev.type === "message_delta" && ev.usage) {
    console.log("\n" + "=".repeat(60));
    console.log(`✅ 完成 | 字數: ${full.length}`);
    console.log(`   首 chunk: ${firstChunkAt - t0}ms`);
    console.log(`   總耗時: ${Date.now() - t0}ms`);
  }
  if (ev.type === "message_stop") {
    // 取得最終 usage from accumulated
  }
}

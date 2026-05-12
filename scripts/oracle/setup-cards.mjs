/**
 * 一次完成「壓圖 → 上傳 Supabase Storage → 灌 oracle_cards 表」
 *
 * 前置作業（只需要做一次）：
 *   1. 在 Supabase Studio 跑過 supabase/oracle-cards.sql
 *   2. 確認 .env.local 已有：
 *        NEXT_PUBLIC_SUPABASE_URL
 *        SUPABASE_SERVICE_ROLE_KEY
 *   3. 安裝依賴：npm i -D sharp
 *
 * 執行：
 *   node --env-file=.env.local scripts/oracle/setup-cards.mjs
 *
 * 可重跑：bucket 已存在 / 圖片已上傳 / 資料已存在皆會自動處理（upsert）。
 */

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const CARD_SOURCE_DIR = path.join(PROJECT_ROOT, "量子能量牌卡");
const SEED_JSON = path.join(PROJECT_ROOT, "supabase/oracle_cards_seed.json");

const BUCKET = "oracle-cards";
const TARGET_WIDTH = 800; // 壓縮後寬度（高度等比）
const WEBP_QUALITY = 82;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "❌ 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function ensureBucket() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const exists = data?.some((b) => b.name === BUCKET);
  if (exists) {
    console.log(`✅ Bucket "${BUCKET}" 已存在`);
    return;
  }
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/webp", "image/png", "image/jpeg"],
  });
  if (createErr) throw createErr;
  console.log(`✅ 已建立 public bucket "${BUCKET}"`);
}

async function compressAndUpload(card) {
  const srcPath = path.join(CARD_SOURCE_DIR, card.image_filename);
  const srcBuffer = await readFile(srcPath);

  const webpBuffer = await sharp(srcBuffer)
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const storageKey = `cards/${String(card.card_number).padStart(2, "0")}.webp`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });
  if (uploadErr) throw uploadErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
  const sizeKB = (webpBuffer.length / 1024).toFixed(1);
  console.log(
    `   #${String(card.card_number).padStart(2, "0")} ${card.card_name}  (${sizeKB} KB)`
  );
  return pub.publicUrl;
}

async function upsertCard(card, imageUrl) {
  const { error } = await supabase
    .from("oracle_cards")
    .upsert(
      {
        card_number: card.card_number,
        card_name: card.card_name,
        card_message: card.card_message,
        card_image_url: imageUrl,
        keywords: card.keywords ?? [],
      },
      { onConflict: "card_number" }
    );
  if (error) throw error;
}

async function main() {
  console.log("📦 讀取 seed JSON...");
  const seed = JSON.parse(await readFile(SEED_JSON, "utf8"));
  console.log(`   共 ${seed.length} 張牌\n`);

  console.log("🪣 確認 Storage bucket...");
  await ensureBucket();

  console.log("\n🖼️  壓縮並上傳圖片...");
  const results = [];
  for (const card of seed) {
    const imageUrl = await compressAndUpload(card);
    results.push({ ...card, card_image_url: imageUrl });
  }

  console.log("\n💾 寫入 oracle_cards 表...");
  for (const card of results) {
    await upsertCard(card, card.card_image_url);
  }

  console.log(`\n✅ 完成！${results.length} 張牌已就緒。`);
  console.log(
    `   範例 URL：${results[0].card_image_url}`
  );
}

main().catch((err) => {
  console.error("\n❌ 失敗：", err.message || err);
  console.error(err);
  process.exit(1);
});

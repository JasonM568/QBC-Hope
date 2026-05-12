-- =============================================
-- 模組七 v2：七日回顧（weekly reading）支援
--
-- 變更內容：
--   1. card_readings 加 reading_type 欄位（區分 daily / weekly）
--   2. question 改為 nullable（weekly 沒有提問）
--   3. 加一個檢查週限制用的索引
--
-- 可安全重複執行（idempotent）
-- =============================================

-- 1. 加 reading_type 欄位
ALTER TABLE card_readings
  ADD COLUMN IF NOT EXISTS reading_type TEXT
  NOT NULL DEFAULT 'daily'
  CHECK (reading_type IN ('daily', 'weekly'));

-- 2. question 改為可選（weekly 不需要學員提問）
ALTER TABLE card_readings
  ALTER COLUMN question DROP NOT NULL;

-- 3. 週限制查詢加速索引（一般學員每週 1 次）
CREATE INDEX IF NOT EXISTS idx_card_readings_user_type_date
  ON card_readings(user_id, reading_type, created_at DESC);

-- 4. 強制 PostgREST 重新載入 schema cache
NOTIFY pgrst, 'reload schema';

-- 驗證：列出 card_readings 欄位
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'card_readings'
ORDER BY ordinal_position;

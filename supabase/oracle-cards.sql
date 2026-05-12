-- =============================================
-- 模組七：量子能量牌卡系統
-- 對應 docs/SPEC_模組七_量子能量牌卡系統.md
--
-- 本檔案可安全重複執行（idempotent）：
--   - 表用 CREATE TABLE IF NOT EXISTS
--   - 索引用 CREATE INDEX IF NOT EXISTS
--   - Policy 先 DROP IF EXISTS 再 CREATE
-- =============================================

-- 1. 牌卡資料表（52 張量子能量牌卡）
CREATE TABLE IF NOT EXISTS oracle_cards (
  id SERIAL PRIMARY KEY,
  card_number INTEGER NOT NULL UNIQUE,            -- 編號 1-52
  card_name TEXT NOT NULL,                         -- 牌卡名稱
  card_message TEXT NOT NULL,                      -- 牌面文字（首版用牌名當 placeholder）
  card_image_url TEXT,                             -- Supabase Storage public URL
  keywords TEXT[] DEFAULT '{}',                    -- 關鍵字標籤
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 學員抽牌紀錄
CREATE TABLE IF NOT EXISTS card_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL REFERENCES oracle_cards(id),
  question TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_readings_user
  ON card_readings(user_id, created_at DESC);

-- =============================================
-- RLS：oracle_cards
-- =============================================
ALTER TABLE oracle_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read oracle cards" ON oracle_cards;
CREATE POLICY "Authenticated users can read oracle cards"
  ON oracle_cards FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and masters can insert oracle cards" ON oracle_cards;
CREATE POLICY "Admins and masters can insert oracle cards"
  ON oracle_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

DROP POLICY IF EXISTS "Admins and masters can update oracle cards" ON oracle_cards;
CREATE POLICY "Admins and masters can update oracle cards"
  ON oracle_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

DROP POLICY IF EXISTS "Admins and masters can delete oracle cards" ON oracle_cards;
CREATE POLICY "Admins and masters can delete oracle cards"
  ON oracle_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

-- =============================================
-- RLS：card_readings
-- =============================================
ALTER TABLE card_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own readings, admins view all" ON card_readings;
CREATE POLICY "Users can view own readings, admins view all"
  ON card_readings FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

DROP POLICY IF EXISTS "Users can insert own readings" ON card_readings;
CREATE POLICY "Users can insert own readings"
  ON card_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own readings, admins all" ON card_readings;
CREATE POLICY "Users can update own readings, admins all"
  ON card_readings FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

DROP POLICY IF EXISTS "Users can delete own readings, admins all" ON card_readings;
CREATE POLICY "Users can delete own readings, admins all"
  ON card_readings FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

-- =============================================
-- updated_at 自動更新觸發器（oracle_cards）
-- =============================================
CREATE OR REPLACE FUNCTION update_oracle_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS oracle_cards_updated_at ON oracle_cards;
CREATE TRIGGER oracle_cards_updated_at
  BEFORE UPDATE ON oracle_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_oracle_cards_updated_at();

-- =============================================
-- 強制 PostgREST 重新載入 schema cache
-- （Supabase 通常自動處理，但保險起見）
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 驗證：跑完應該看到 2 筆
-- =============================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('oracle_cards', 'card_readings')
ORDER BY table_name;

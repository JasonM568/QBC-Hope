-- 模組五：利他影響力週報 v2 欄位升級
-- 新增：核心價值、實質成果（勾選）、影響力心得、下週目標

-- PART 2 核心價值
ALTER TABLE weekly_altruism
  ADD COLUMN IF NOT EXISTS core_value TEXT DEFAULT '';

-- PART 3 實質成果（勾選）
ALTER TABLE weekly_altruism
  ADD COLUMN IF NOT EXISTS result_trust BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS result_cooperation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS result_income BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS result_network BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS result_none BOOLEAN DEFAULT false;

-- PART 4 影響力心得
ALTER TABLE weekly_altruism
  ADD COLUMN IF NOT EXISTS impact_insight TEXT DEFAULT '';

-- PART 5 下週利他目標
ALTER TABLE weekly_altruism
  ADD COLUMN IF NOT EXISTS next_shares_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_helps_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_referrals_count INTEGER DEFAULT 0;

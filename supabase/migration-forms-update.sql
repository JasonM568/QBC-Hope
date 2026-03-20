-- =============================================
-- HOPE 表單欄位修正 — 對齊原始 PDF 模板
-- 在 Supabase Dashboard > SQL Editor 中執行
-- =============================================

-- =============================================
-- 1. 21天行動日報表 — 重建為 8 PART 結構
-- =============================================
DROP TABLE IF EXISTS daily_reports CASCADE;

CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  day_number INTEGER CHECK (day_number BETWEEN 1 AND 21),
  energy_state INTEGER CHECK (energy_state BETWEEN 1 AND 10),
  most_important_thing TEXT,

  -- PART 1: 晨間信念打卡
  belief_four_beliefs BOOLEAN DEFAULT false,
  belief_find_hope BOOLEAN DEFAULT false,
  belief_cognition BOOLEAN DEFAULT false,
  belief_upgrade BOOLEAN DEFAULT false,
  belief_shine BOOLEAN DEFAULT false,
  self_declaration TEXT,

  -- PART 2: 今日覺察
  awareness_improve TEXT,
  awareness_notice TEXT,

  -- PART 3: 今日學習
  learning_content TEXT,
  learning_course BOOLEAN DEFAULT false,
  learning_book BOOLEAN DEFAULT false,
  learning_dialogue BOOLEAN DEFAULT false,
  learning_observation BOOLEAN DEFAULT false,
  learning_other BOOLEAN DEFAULT false,

  -- PART 4: 今日行動
  action_content TEXT,
  action_career BOOLEAN DEFAULT false,
  action_wealth BOOLEAN DEFAULT false,
  action_health BOOLEAN DEFAULT false,
  action_family BOOLEAN DEFAULT false,
  action_relationship BOOLEAN DEFAULT false,

  -- PART 5: 今日分享
  sharing_content TEXT,

  -- PART 6: 感恩時刻
  gratitude TEXT,

  -- PART 7: 今日評分
  daily_score INTEGER CHECK (daily_score BETWEEN 1 AND 10),
  compare_yesterday TEXT CHECK (compare_yesterday IN ('better', 'worse')),
  score_note TEXT,

  -- PART 8: 明日行動
  tomorrow_action TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, report_date)
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON daily_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports"
  ON daily_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports"
  ON daily_reports FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_daily_reports_user_date ON daily_reports(user_id, report_date);

-- =============================================
-- 2. 人生資本盤點表 — 四大資本 + A/B 雙評分
-- =============================================
DROP TABLE IF EXISTS capital_inventories CASCADE;

CREATE TABLE capital_inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inventory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_job TEXT,
  life_goal TEXT,
  inventory_cycle TEXT CHECK (inventory_cycle IN ('first', 'half_year', 'annual')),

  -- PART 1 經濟資本
  eco_income_source TEXT,
  eco_score_a INTEGER CHECK (eco_score_a BETWEEN 1 AND 10),
  eco_income_stability TEXT CHECK (eco_income_stability IN ('stable', 'moderate', 'unstable')),
  eco_asset_amount TEXT,
  eco_asset_cash BOOLEAN DEFAULT false,
  eco_asset_stock BOOLEAN DEFAULT false,
  eco_asset_realestate BOOLEAN DEFAULT false,
  eco_asset_equity BOOLEAN DEFAULT false,
  eco_asset_other BOOLEAN DEFAULT false,
  eco_score_b INTEGER CHECK (eco_score_b BETWEEN 1 AND 15),

  -- PART 2 智識資本
  know_core_expertise TEXT,
  know_score_a INTEGER CHECK (know_score_a BETWEEN 1 AND 10),
  know_books_per_year INTEGER,
  know_courses_per_year INTEGER,
  know_score_b INTEGER CHECK (know_score_b BETWEEN 1 AND 15),

  -- PART 3 社會資本
  social_key_people TEXT,
  social_score_a INTEGER CHECK (social_score_a BETWEEN 1 AND 10),
  social_cooperate BOOLEAN DEFAULT false,
  social_introduce BOOLEAN DEFAULT false,
  social_invest BOOLEAN DEFAULT false,
  social_score_b INTEGER CHECK (social_score_b BETWEEN 1 AND 15),

  -- PART 4 心理資本
  psych_difficulty TEXT CHECK (psych_difficulty IN ('quick_recover', 'need_time', 'give_up')),
  psych_score_a INTEGER CHECK (psych_score_a BETWEEN 1 AND 15),
  psych_future TEXT CHECK (psych_future IN ('very_confident', 'normal', 'uncertain')),
  psych_score_b INTEGER CHECK (psych_score_b BETWEEN 1 AND 10),

  -- 總評
  overall_evaluation TEXT CHECK (overall_evaluation IN ('beginner', 'stable', 'fast', 'mature')),

  -- 未來六個月成長計劃
  growth_plan_economic TEXT,
  growth_plan_knowledge TEXT,
  growth_plan_social TEXT,
  growth_plan_psychological TEXT,

  -- 前後比較
  before_economic INTEGER,
  before_knowledge INTEGER,
  before_social INTEGER,
  before_psychological INTEGER,
  after_economic INTEGER,
  after_knowledge INTEGER,
  after_social INTEGER,
  after_psychological INTEGER,
  has_grown TEXT CHECK (has_grown IN ('yes', 'no')),
  growth_reflection TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE capital_inventories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own capital inventories"
  ON capital_inventories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own capital inventories"
  ON capital_inventories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own capital inventories"
  ON capital_inventories FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_capital_inventories_user ON capital_inventories(user_id, created_at DESC);

-- =============================================
-- 3. 個人戰略定位工具 — 4 PART + 機會判斷
-- =============================================
DROP TABLE IF EXISTS strategic_positions CASCADE;

CREATE TABLE strategic_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- PART 1 優勢分析
  core_ability TEXT,
  success_experience TEXT,
  unique_ability TEXT,
  resource_tech BOOLEAN DEFAULT false,
  resource_network BOOLEAN DEFAULT false,
  resource_fund BOOLEAN DEFAULT false,
  resource_brand BOOLEAN DEFAULT false,
  resource_experience BOOLEAN DEFAULT false,

  -- PART 2 戰場選擇
  current_field TEXT,
  target_market TEXT,
  focused_battlefield TEXT,

  -- PART 3 機會判斷
  market_trend TEXT,
  three_year_opportunity TEXT,
  ai_tech_dividend TEXT,

  -- PART 4 個人定位一句話
  who_am_i TEXT,
  who_to_help TEXT,
  what_problem TEXT,
  positioning_statement TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE strategic_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategic positions"
  ON strategic_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategic positions"
  ON strategic_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategic positions"
  ON strategic_positions FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_strategic_positions_user ON strategic_positions(user_id, created_at DESC);

-- =============================================
-- 4. 人生五域平衡月報告 — 1-20 分 + 詳細子欄位
-- =============================================
DROP TABLE IF EXISTS monthly_reports CASCADE;

CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 10),
  monthly_keywords TEXT,

  -- 上個月分數（用於比較）
  last_career_score INTEGER,
  last_wealth_score INTEGER,
  last_health_score INTEGER,
  last_family_score INTEGER,
  last_relationship_score INTEGER,

  -- PART 1 事業 (1-20)
  career_value TEXT,
  career_achievement TEXT,
  career_stuck TEXT,
  career_score INTEGER CHECK (career_score BETWEEN 1 AND 20),
  career_next TEXT,

  -- PART 2 財富 (1-20)
  wealth_income_change TEXT CHECK (wealth_income_change IN ('growth', 'stable', 'decline')),
  wealth_new_source TEXT,
  wealth_investment TEXT,
  wealth_score INTEGER CHECK (wealth_score BETWEEN 1 AND 20),
  wealth_next TEXT,

  -- PART 3 健康 (1-20)
  health_routine TEXT CHECK (health_routine IN ('regular', 'normal', 'poor')),
  health_status TEXT,
  health_exercise TEXT,
  health_score INTEGER CHECK (health_score BETWEEN 1 AND 20),
  health_next TEXT,

  -- PART 4 家庭 (1-20)
  family_complaint BOOLEAN DEFAULT false,
  family_complaint_reason TEXT,
  family_activity TEXT,
  family_interaction TEXT,
  family_score INTEGER CHECK (family_score BETWEEN 1 AND 20),
  family_next TEXT,

  -- PART 5 關係 (1-20)
  relation_new_connection BOOLEAN DEFAULT false,
  relation_new_important TEXT,
  relation_interaction TEXT,
  relation_score INTEGER CHECK (relation_score BETWEEN 1 AND 20),
  relation_next TEXT,

  -- 本月關鍵反思
  reflection_breakthrough TEXT,
  reflection_learning TEXT,
  reflection_mistake TEXT,

  -- 人生平衡檢視
  balance_strongest TEXT,
  balance_weakest TEXT,
  balance_reason TEXT,

  -- 下月成長策略
  next_three_things TEXT,
  next_domain_order TEXT,
  highlight TEXT,
  important_change TEXT,
  next_step TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, month)
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly reports"
  ON monthly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monthly reports"
  ON monthly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monthly reports"
  ON monthly_reports FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_monthly_reports_user ON monthly_reports(user_id, year DESC, month DESC);

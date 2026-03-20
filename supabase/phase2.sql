-- =============================================
-- HOPE Phase 2 — 新增資料表
-- =============================================

-- 1. 人生資本盤點表（每半年）
CREATE TABLE IF NOT EXISTS capital_inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  health_score INTEGER CHECK (health_score BETWEEN 1 AND 10),
  health_note TEXT,
  relationship_score INTEGER CHECK (relationship_score BETWEEN 1 AND 10),
  relationship_note TEXT,
  financial_score INTEGER CHECK (financial_score BETWEEN 1 AND 10),
  financial_note TEXT,
  knowledge_score INTEGER CHECK (knowledge_score BETWEEN 1 AND 10),
  knowledge_note TEXT,
  overall_reflection TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 個人戰略定位工具（不定期）
CREATE TABLE IF NOT EXISTS strategic_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  strengths TEXT,
  battlefield TEXT,
  positioning TEXT,
  action_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 人生五域平衡月報告（每月一次）
CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  career_score INTEGER CHECK (career_score BETWEEN 1 AND 10),
  career_note TEXT,
  relationship_score INTEGER CHECK (relationship_score BETWEEN 1 AND 10),
  relationship_note TEXT,
  health_score INTEGER CHECK (health_score BETWEEN 1 AND 10),
  health_note TEXT,
  wealth_score INTEGER CHECK (wealth_score BETWEEN 1 AND 10),
  wealth_note TEXT,
  growth_score INTEGER CHECK (growth_score BETWEEN 1 AND 10),
  growth_note TEXT,
  overall_reflection TEXT,
  next_month_goals TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- 4. 利他影響力週報（每週）
CREATE TABLE IF NOT EXISTS weekly_altruism (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  shares_count INTEGER DEFAULT 0,
  helps_count INTEGER DEFAULT 0,
  referrals_count INTEGER DEFAULT 0,
  shares_detail TEXT,
  helps_detail TEXT,
  referrals_detail TEXT,
  reflection TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, week_number)
);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE capital_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_altruism ENABLE ROW LEVEL SECURITY;

-- Capital Inventories
CREATE POLICY "Users can view own capital inventories"
  ON capital_inventories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own capital inventories"
  ON capital_inventories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own capital inventories"
  ON capital_inventories FOR UPDATE USING (auth.uid() = user_id);

-- Strategic Positions
CREATE POLICY "Users can view own strategic positions"
  ON strategic_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategic positions"
  ON strategic_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategic positions"
  ON strategic_positions FOR UPDATE USING (auth.uid() = user_id);

-- Monthly Reports
CREATE POLICY "Users can view own monthly reports"
  ON monthly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monthly reports"
  ON monthly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monthly reports"
  ON monthly_reports FOR UPDATE USING (auth.uid() = user_id);

-- Weekly Altruism
CREATE POLICY "Users can view own weekly altruism"
  ON weekly_altruism FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly altruism"
  ON weekly_altruism FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly altruism"
  ON weekly_altruism FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_capital_inventories_user ON capital_inventories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategic_positions_user ON strategic_positions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_user ON monthly_reports(user_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_altruism_user ON weekly_altruism(user_id, year DESC, week_number DESC);

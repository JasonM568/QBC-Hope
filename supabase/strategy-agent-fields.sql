-- =============================================
-- 戰略定位表 — 新增 QBC AI Agent 互動流程欄位
-- =============================================

-- STEP 1 優勢挖掘
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step1_success_three TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step1_praised_ability TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step1_effortless TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step1_ai_response TEXT DEFAULT '';

-- STEP 2 能力轉換
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step2_value_conversion TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step2_solve_problem TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step2_monetize_ways TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step2_ai_response TEXT DEFAULT '';

-- STEP 3 戰場建議
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step3_target_people TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step3_target_industry TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step3_b2b_or_b2c TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step3_ai_response TEXT DEFAULT '';

-- STEP 4 機會分析
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step4_current_trend TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step4_ai_amplify TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step4_growth_3year TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS step4_ai_response TEXT DEFAULT '';

-- STEP 5 定位收斂 — 我的戰略定位結果
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS result_battlefield TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS result_positioning TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS result_advantage TEXT DEFAULT '';
ALTER TABLE strategic_positions ADD COLUMN IF NOT EXISTS result_first_action TEXT DEFAULT '';

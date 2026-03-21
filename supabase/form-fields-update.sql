-- =============================================
-- 表單新增欄位
-- =============================================

-- 1. 日報表新增「是否已在群裡完成公佈」
ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS announced_in_group BOOLEAN DEFAULT false;

-- 2. 週報新增「是否已在群裡完成公佈」
ALTER TABLE weekly_altruism
  ADD COLUMN IF NOT EXISTS announced_in_group BOOLEAN DEFAULT false;

-- 3. 戰略定位新增「其他資源補充說明」
ALTER TABLE strategic_positions
  ADD COLUMN IF NOT EXISTS resource_other_text TEXT DEFAULT '';

-- =============================================
-- Master 可以查看所有學員的表單資料
-- =============================================

-- 日報
CREATE POLICY "Masters can view all daily reports"
  ON daily_reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- 月報
CREATE POLICY "Masters can view all monthly reports"
  ON monthly_reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- 週報
CREATE POLICY "Masters can view all weekly altruism"
  ON weekly_altruism FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- 資本盤點
CREATE POLICY "Masters can view all capital inventories"
  ON capital_inventories FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- 戰略定位
CREATE POLICY "Masters can view all strategic positions"
  ON strategic_positions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- 教練筆記
CREATE POLICY "Masters can view all coach notes"
  ON coach_notes FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- 注意：profiles 表不需要額外 policy，
-- 因為已有 "Profiles are viewable by everyone" USING (true)
-- 且在 profiles 表上建立自我引用 policy 會造成 RLS 遞迴問題

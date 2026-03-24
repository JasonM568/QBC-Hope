-- =============================================
-- 新增 tester（測試人員）角色
-- 權限等級：admin > tester > master > coach > student
-- tester 和 admin 不列入統計人數
-- =============================================

-- 更新 role CHECK 約束
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'coach', 'admin', 'master', 'tester'));

-- tester 可以查看所有學員資料（同 master/admin）
-- 日報
CREATE POLICY "Testers can view all daily reports"
  ON daily_reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tester'
    )
  );

-- 月報
CREATE POLICY "Testers can view all monthly reports"
  ON monthly_reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tester'
    )
  );

-- 週報
CREATE POLICY "Testers can view all weekly reports"
  ON weekly_altruism FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tester'
    )
  );

-- 資本盤點
CREATE POLICY "Testers can view all capital inventories"
  ON capital_inventories FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tester'
    )
  );

-- 戰略定位
CREATE POLICY "Testers can view all strategic positions"
  ON strategic_positions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tester'
    )
  );

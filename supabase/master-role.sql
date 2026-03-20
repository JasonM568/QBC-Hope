-- =============================================
-- 新增 Master 角色 + 刪除申請機制
-- =============================================

-- 1. 擴充 role CHECK 允許 master
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'coach', 'admin', 'master'));

-- 2. 允許 master 更新學員和教練的 profile
CREATE POLICY "Masters can update student and coach profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'master'
    )
    AND role IN ('student', 'coach')
  );

-- 3. 刪除申請表
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Master 和 Admin 都可以查看刪除申請
CREATE POLICY "Masters and admins can view deletion requests"
  ON deletion_requests FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

-- Master 可以建立刪除申請
CREATE POLICY "Masters can create deletion requests"
  ON deletion_requests FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master'
    )
  );

-- Admin 可以更新刪除申請（審核）
CREATE POLICY "Admins can update deletion requests"
  ON deletion_requests FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_deletion_requests_status ON deletion_requests(status, created_at DESC);

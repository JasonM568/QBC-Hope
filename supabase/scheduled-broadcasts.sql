-- 排程推播表
CREATE TABLE IF NOT EXISTS scheduled_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE scheduled_broadcasts ENABLE ROW LEVEL SECURITY;

-- 所有人可讀（管理介面顯示用）
CREATE POLICY "Anyone can read broadcasts"
  ON scheduled_broadcasts FOR SELECT
  USING (true);

-- 只有 admin/master 可以新增
CREATE POLICY "Admin and master can insert broadcasts"
  ON scheduled_broadcasts FOR INSERT
  WITH CHECK (true);

-- 只有 admin/master 可以更新（取消排程、標記已發送）
CREATE POLICY "Admin and master can update broadcasts"
  ON scheduled_broadcasts FOR UPDATE
  USING (true);

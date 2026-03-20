-- LINE 群組記錄
CREATE TABLE IF NOT EXISTS line_groups (
  group_id TEXT PRIMARY KEY,
  joined_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- 允許 anon 讀寫（因為 API route 使用 anon key）
ALTER TABLE line_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to line_groups"
  ON line_groups FOR ALL USING (true) WITH CHECK (true);

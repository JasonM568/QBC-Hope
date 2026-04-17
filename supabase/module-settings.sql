-- 模組開關設定（最高管理者控制）
CREATE TABLE IF NOT EXISTS module_settings (
  module_key TEXT PRIMARY KEY,
  module_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 預設 5 個模組全部啟用
INSERT INTO module_settings (module_key, module_name, enabled) VALUES
  ('daily', '模組一：21天行動系統日報表', true),
  ('capital', '模組二：人生資本盤點表', true),
  ('strategy', '模組三：個人戰略定位工具', true),
  ('monthly', '模組四：人生五域平衡月報告', true),
  ('weekly', '模組五：利他影響力週報', true)
ON CONFLICT (module_key) DO NOTHING;

-- RLS：所有人可讀，只有 master/admin 可改
ALTER TABLE module_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view module settings"
  ON module_settings FOR SELECT USING (true);

CREATE POLICY "Admin/Master can update module settings"
  ON module_settings FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

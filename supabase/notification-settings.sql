-- LINE 通知排程設定
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 預設值：每天 21:00 發送，週末不發送
INSERT INTO notification_settings (setting_key, setting_value)
VALUES (
  'daily_reminder',
  '{"enabled": true, "skip_days": [0, 6], "message_prefix": "📋 HOPE 日報提醒"}'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;

-- 允許 anon 讀取（cron job 使用 anon key）
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notification settings"
  ON notification_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update notification settings"
  ON notification_settings FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert notification settings"
  ON notification_settings FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

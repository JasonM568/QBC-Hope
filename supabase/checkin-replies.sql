-- 打卡牆回覆表
CREATE TABLE IF NOT EXISTS checkin_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES daily_checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE checkin_replies ENABLE ROW LEVEL SECURITY;

-- 所有人可讀
CREATE POLICY "Anyone can read checkin replies"
  ON checkin_replies FOR SELECT USING (true);

-- 教練、admin、master 可以回覆
CREATE POLICY "Coaches and admins can insert replies"
  ON checkin_replies FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin', 'master')
    )
  );

-- 自己可以刪除自己的回覆
CREATE POLICY "Users can delete own replies"
  ON checkin_replies FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_checkin_replies_checkin ON checkin_replies(checkin_id, created_at);

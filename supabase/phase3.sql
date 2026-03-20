-- =============================================
-- HOPE Phase 3 — 教練系統
-- =============================================

-- 1. 輔導長備忘與回饋
CREATE TABLE IF NOT EXISTS coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'feedback' CHECK (note_type IN ('feedback', 'memo', 'alert')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- Coach can view/manage notes they created
CREATE POLICY "Coaches can view own notes"
  ON coach_notes FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can insert own notes"
  ON coach_notes FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Coaches can update own notes"
  ON coach_notes FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can delete own notes"
  ON coach_notes FOR DELETE USING (auth.uid() = coach_id);

-- Students can view feedback about themselves
CREATE POLICY "Students can view own feedback"
  ON coach_notes FOR SELECT USING (auth.uid() = student_id);

-- Allow coaches to view their assigned students' reports
CREATE POLICY "Coaches can view assigned students reports"
  ON daily_reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = daily_reports.user_id
      AND profiles.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students monthly"
  ON monthly_reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = monthly_reports.user_id
      AND profiles.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students weekly"
  ON weekly_altruism FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weekly_altruism.user_id
      AND profiles.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students capital"
  ON capital_inventories FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = capital_inventories.user_id
      AND profiles.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students strategy"
  ON strategic_positions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = strategic_positions.user_id
      AND profiles.coach_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach ON coach_notes(coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_notes_student ON coach_notes(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_coach ON profiles(coach_id);

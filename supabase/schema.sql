-- =============================================
-- HOPE 人生作業系統 — Supabase Schema
-- 在 Supabase Dashboard > SQL Editor 中執行
-- =============================================

-- 1. Profiles（擴充 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'coach', 'admin')),
  coach_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 自動建立 profile（當新用戶註冊時）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. 21天行動日報表
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  morning_gratitude TEXT,
  today_goals TEXT,
  action_taken TEXT,
  reflection TEXT,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, report_date)
);

-- 3. 社群打卡
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 打卡按讚
CREATE TABLE IF NOT EXISTS checkin_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES daily_checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(checkin_id, user_id)
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_likes ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Daily Reports: users can CRUD own
CREATE POLICY "Users can view own reports"
  ON daily_reports FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON daily_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON daily_reports FOR UPDATE USING (auth.uid() = user_id);

-- Daily Checkins: everyone can read, users can insert own
CREATE POLICY "Checkins are viewable by everyone"
  ON daily_checkins FOR SELECT USING (true);

CREATE POLICY "Users can insert own checkins"
  ON daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkins"
  ON daily_checkins FOR DELETE USING (auth.uid() = user_id);

-- Checkin Likes: everyone can read, users can insert/delete own
CREATE POLICY "Likes are viewable by everyone"
  ON checkin_likes FOR SELECT USING (true);

CREATE POLICY "Users can insert own likes"
  ON checkin_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON checkin_likes FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date ON daily_reports(user_id, report_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_created ON daily_checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_likes_checkin ON checkin_likes(checkin_id);

-- 學員進階模組開通權限
-- 預設 false，由教練或管理者手動開通
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS advanced_modules_enabled BOOLEAN DEFAULT false;

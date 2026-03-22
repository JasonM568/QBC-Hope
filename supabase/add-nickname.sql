-- 在 profiles 表新增 nickname 欄位
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT;

-- =============================================
-- v2 點數規則對齊 — Phase 1
--
-- 對應 SPEC：docs/SPEC_點數系統_重設計版.md（第 4.1 / 4.2 / 4.5 節）
-- 前置條件：supabase/points-system.sql 已部署完成
--
-- 本檔做什麼：
--   1. profiles 加 current_streak / longest_streak / last_report_date 三欄
--   2. point_transactions.type CHECK 從 4 個值擴充到 11 個（新增 7 個）
--   3. 從 daily_reports 回填既有用戶 streak（一次性，可重跑）
--   4. 替換 grant_daily_report_points()：日報 +2 → +1，加 streak +3 / +10
--
-- v2 規則（取自 SPEC 第二節）：
--   - 完成日報：+1 點（原本 +2）
--   - 連續 7 天（每 7 倍數）：額外 +3 點
--   - 連續 21 天：額外 +10 點
--
-- 本檔可重複執行（idempotent）— streak 回填會從 daily_reports 真實資料重算，
-- 不會因重跑而疊加錯誤。
-- =============================================

-- =============================================
-- 1. profiles 新增 streak 欄位
-- （訂閱欄位留給 Session 3 一起加，這場只動 streak）
-- =============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_report_date DATE;

-- =============================================
-- 2. point_transactions.type CHECK：4 → 11 值
--
-- 原 4 個：signup_bonus / daily_report / oracle_draw / admin_adjust
-- 新增 7 個：streak_7 / streak_21 / subscription / subscription_monthly
--           / purchase_99 / purchase_199 / purchase_499
-- =============================================
ALTER TABLE point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'signup_bonus',
    'daily_report',
    'oracle_draw',
    'admin_adjust',
    'streak_7',
    'streak_21',
    'subscription',
    'subscription_monthly',
    'purchase_99',
    'purchase_199',
    'purchase_499'
  ));

-- =============================================
-- 3. 從 daily_reports 回填既有用戶的 streak
--
-- 邏輯（與 trigger 一致）：
--   - current_streak = 結束於 last_report_date 的那段連續區間長度
--   - longest_streak = 歷史最長連續區間長度
--   - last_report_date = 該 user 最近一筆 report_date
--
-- 演算法：用 (report_date - row_number 天) 抓同一段連續區間，groupby 計長度。
-- =============================================
WITH dates AS (
  SELECT DISTINCT user_id, report_date
  FROM daily_reports
),
grouped AS (
  SELECT
    user_id,
    report_date,
    report_date
      - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY report_date))::INT
      AS streak_grp
  FROM dates
),
streaks AS (
  SELECT
    user_id,
    streak_grp,
    COUNT(*)::INT      AS streak_len,
    MAX(report_date)   AS end_date
  FROM grouped
  GROUP BY user_id, streak_grp
),
per_user AS (
  SELECT
    user_id,
    MAX(streak_len)::INT AS longest,
    -- 最近一段（end_date 最大）的長度＝current_streak
    (SELECT streak_len FROM streaks s2
       WHERE s2.user_id = s.user_id
       ORDER BY s2.end_date DESC LIMIT 1)::INT AS current,
    MAX(end_date) AS last_date
  FROM streaks s
  GROUP BY user_id
)
UPDATE profiles p
SET
  current_streak   = COALESCE(pu.current, 0),
  longest_streak   = COALESCE(pu.longest, 0),
  last_report_date = pu.last_date
FROM per_user pu
WHERE p.id = pu.user_id;

-- =============================================
-- 4. 替換 grant_daily_report_points() — v2 版
--
-- 變更：
--   - 日報送點從 +2 改為 +1
--   - 加入 streak 計算 + +3 / +10 獎勵
--   - 注意 grant_points 參數順序 = (user_id, amount, type, note TEXT, reference_id UUID)
--     reference_id 是第 5 位（修正原 SPEC 第 4.5 節文字 bug）
--
-- 函式名 / trigger 名都沿用既有，避免改動 trigger 接點。
-- =============================================
CREATE OR REPLACE FUNCTION public.grant_daily_report_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak    INT;
  v_last_date DATE;
BEGIN
  -- 讀當前 streak 狀態
  SELECT current_streak, last_report_date
    INTO v_streak, v_last_date
  FROM profiles
  WHERE id = NEW.user_id
  FOR UPDATE;

  -- 計算這次提交後的 streak 值
  IF v_last_date = NEW.report_date - INTERVAL '1 day' THEN
    -- 昨天有寫 → streak +1
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSIF v_last_date = NEW.report_date THEN
    -- 同一天重複觸發（理論上 UNIQUE(user_id, report_date) 擋住，這裡防呆）
    RETURN NEW;
  ELSE
    -- 第一次寫 / 中斷後重啟 → streak = 1
    v_streak := 1;
  END IF;

  -- 寫回 profiles
  UPDATE profiles SET
    current_streak   = v_streak,
    longest_streak   = GREATEST(longest_streak, v_streak),
    last_report_date = NEW.report_date
  WHERE id = NEW.user_id;

  -- 日報 +1 點
  BEGIN
    PERFORM public.grant_points(
      NEW.user_id,
      1,
      'daily_report',
      '提交 Day ' || COALESCE(NEW.day_number::TEXT, '?') || ' 日報',
      NEW.id
    );
  EXCEPTION WHEN unique_violation THEN
    -- 同筆 daily_report.id 已領過 → 跳過（idempotent）
    NULL;
  END;

  -- 連續 7 天 / 14 / 21 ... 每 7 倍數 → +3 點
  IF v_streak > 0 AND v_streak % 7 = 0 THEN
    BEGIN
      PERFORM public.grant_points(
        NEW.user_id,
        3,
        'streak_7',
        '連續 ' || v_streak || ' 天 streak 獎勵',
        NEW.id
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  -- 連續 21 天里程碑 → 額外 +10 點（在 streak_7 之上加碼）
  IF v_streak = 21 THEN
    BEGIN
      PERFORM public.grant_points(
        NEW.user_id,
        10,
        'streak_21',
        '連續 21 天里程碑',
        NEW.id
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- trigger 已在 points-system.sql 建好（trg_daily_report_grant_points），
-- 這裡只更新函式 body 即可。為了保險，重綁一次。
DROP TRIGGER IF EXISTS trg_daily_report_grant_points ON daily_reports;
CREATE TRIGGER trg_daily_report_grant_points
  AFTER INSERT ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_daily_report_points();

-- =============================================
-- PostgREST 重新載入 schema cache
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 驗證查詢
--   應看到：
--     1) profiles 三個新欄位
--     2) point_transactions_type_check 包含 11 個值
--     3) 既有用戶的 longest_streak / current_streak / last_report_date
--     4) grant_daily_report_points 函式存在
-- =============================================

-- 4-1. 新欄位
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('current_streak', 'longest_streak', 'last_report_date')
ORDER BY column_name;

-- 4-2. CHECK constraint 內容
SELECT pg_get_constraintdef(c.oid) AS check_def
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'point_transactions'
  AND c.conname = 'point_transactions_type_check';

-- 4-3. streak 回填結果（看前 10 個有寫過日報的人）
SELECT
  p.email,
  p.current_streak,
  p.longest_streak,
  p.last_report_date
FROM profiles p
WHERE p.last_report_date IS NOT NULL
ORDER BY p.longest_streak DESC, p.last_report_date DESC
LIMIT 10;

-- 4-4. 函式存在
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'grant_daily_report_points';

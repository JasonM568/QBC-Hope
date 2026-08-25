-- =============================================
-- plan_rounds：21 天輪程紀錄 + 達成率封存
-- =============================================
--
-- 背景：
--   原本每輪的起訖日只存在 profiles.plan_start_date / plan_round，
--   開新一輪就被覆蓋掉 → 歷屆輪程的達成率永遠算不回來。
--   這張表把每一輪獨立記一筆，封存時把達成率定格。
--
-- 重要限制：
--   既有會員只能回填「當前這一輪」（因為舊輪的起訖日已經沒了）。
--   歷屆資料從這次上線之後才開始累積。
--
-- 達成率定義：
--   分子 = 該輪窗口內實際填寫的日報天數
--   分母 = 21（封存時該輪已經走完，所以固定 21）
--   進行中的那一輪由前端即時計算（分子分母都只算到「昨天」，
--   今天還沒過完不列入分母，避免早上九點就被扣分）。
--
-- 本檔可重複執行（idempotent）。
-- =============================================

-- ---------------------------------------------
-- 1. 資料表
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS plan_rounds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round_number    INT  NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,                     -- start_date + 20（21 天含頭尾）
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  completed_days  INT,                               -- 封存時定格
  completion_rate NUMERIC(5,2),                      -- 封存時定格，0.00–100.00
  reset_count     INT  NOT NULL DEFAULT 0,           -- 這一輪被「重新啟動」過幾次
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ,
  UNIQUE (user_id, round_number)
);

-- 每人同時只能有一輪在進行中
CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_rounds_one_active
  ON plan_rounds(user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_plan_rounds_user
  ON plan_rounds(user_id, round_number DESC);

-- ---------------------------------------------
-- 2. RLS（沿用 point_balances 的慣例）
-- ---------------------------------------------
ALTER TABLE plan_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view own rounds, staff all" ON plan_rounds;
CREATE POLICY "view own rounds, staff all"
  ON plan_rounds FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master', 'coach', 'tester')
    )
  );

-- 不設 INSERT/UPDATE/DELETE policy = 預設拒絕。
-- 輪程生命週期一律走下方的 SECURITY DEFINER 函式，
-- 學員無法自己竄改 completion_rate。

-- ---------------------------------------------
-- 3. 回填既有會員的「當前輪」
-- ---------------------------------------------
INSERT INTO plan_rounds (user_id, round_number, start_date, end_date, status)
SELECT
  p.id,
  COALESCE(p.plan_round, 1),
  p.plan_start_date,
  p.plan_start_date + 20,
  'active'
FROM profiles p
WHERE p.plan_start_date IS NOT NULL
ON CONFLICT (user_id, round_number) DO NOTHING;

-- ---------------------------------------------
-- 4. start_plan_round：第一次啟動計畫
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.start_plan_round(p_start_date DATE)
RETURNS plan_rounds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_row   plan_rounds;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '未登入';
  END IF;

  IF p_start_date IS NULL THEN
    RAISE EXCEPTION '起始日不可為空';
  END IF;

  -- 起始日不得晚於今天（台北時區）。前端已有 confirm 防呆，這裡是最後一道。
  IF p_start_date > (now() AT TIME ZONE 'Asia/Taipei')::DATE THEN
    RAISE EXCEPTION '起始日不可晚於今天';
  END IF;

  -- 已經有進行中的輪程就不重複建立
  SELECT * INTO v_row FROM plan_rounds
   WHERE user_id = v_uid AND status = 'active';

  IF FOUND THEN
    UPDATE plan_rounds
       SET start_date = p_start_date,
           end_date   = p_start_date + 20
     WHERE id = v_row.id
     RETURNING * INTO v_row;
  ELSE
    INSERT INTO plan_rounds (user_id, round_number, start_date, end_date, status)
    VALUES (v_uid, 1, p_start_date, p_start_date + 20, 'active')
    ON CONFLICT (user_id, round_number)
      DO UPDATE SET start_date = EXCLUDED.start_date,
                    end_date   = EXCLUDED.end_date,
                    status     = 'active'
    RETURNING * INTO v_row;
  END IF;

  UPDATE profiles
     SET plan_start_date = v_row.start_date,
         plan_round      = v_row.round_number
   WHERE id = v_uid;

  RETURN v_row;
END;
$$;

-- ---------------------------------------------
-- 5. begin_next_round：封存本輪 → 開下一輪
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.begin_next_round()
RETURNS plan_rounds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_today     DATE := (now() AT TIME ZONE 'Asia/Taipei')::DATE;
  v_cur       plan_rounds;
  v_completed INT;
  v_next      INT;
  v_row       plan_rounds;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '未登入';
  END IF;

  SELECT * INTO v_cur FROM plan_rounds
   WHERE user_id = v_uid AND status = 'active';

  IF FOUND THEN
    -- 定格本輪達成率：分母固定 21（本輪已走完）
    SELECT COUNT(*) INTO v_completed
      FROM daily_reports
     WHERE user_id = v_uid
       AND report_date BETWEEN v_cur.start_date AND v_cur.end_date;

    UPDATE plan_rounds
       SET status          = 'archived',
           completed_days  = v_completed,
           completion_rate = ROUND(v_completed::NUMERIC * 100 / 21, 2),
           archived_at     = now()
     WHERE id = v_cur.id;

    v_next := v_cur.round_number + 1;
  ELSE
    v_next := COALESCE(
      (SELECT MAX(round_number) + 1 FROM plan_rounds WHERE user_id = v_uid),
      1
    );
  END IF;

  INSERT INTO plan_rounds (user_id, round_number, start_date, end_date, status)
  VALUES (v_uid, v_next, v_today, v_today + 20, 'active')
  RETURNING * INTO v_row;

  UPDATE profiles
     SET plan_start_date = v_row.start_date,
         plan_round      = v_row.round_number
   WHERE id = v_uid;

  RETURN v_row;
END;
$$;

-- ---------------------------------------------
-- 6. reset_active_round：重新啟動本輪（每帳號限一次）
-- ---------------------------------------------
-- 不封存、不進位輪次，只把本輪起始日移到今天。
CREATE OR REPLACE FUNCTION public.reset_active_round()
RETURNS plan_rounds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'Asia/Taipei')::DATE;
  v_used  BOOLEAN;
  v_row   plan_rounds;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '未登入';
  END IF;

  SELECT round_reset_used INTO v_used FROM profiles WHERE id = v_uid;
  IF COALESCE(v_used, FALSE) THEN
    RAISE EXCEPTION '重新啟動額度已使用過';
  END IF;

  UPDATE plan_rounds
     SET start_date  = v_today,
         end_date    = v_today + 20,
         reset_count = reset_count + 1
   WHERE user_id = v_uid AND status = 'active'
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION '沒有進行中的輪程';
  END IF;

  UPDATE profiles
     SET plan_start_date  = v_row.start_date,
         round_reset_used = TRUE
   WHERE id = v_uid;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_plan_round(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_next_round()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_active_round()   TO authenticated;

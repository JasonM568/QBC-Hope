-- =============================================
-- 點數系統（point wallet）
--
-- 商業規則：
--   - 每位 user 一個點數帳戶（point_balances）
--   - 所有點數異動寫入流水（point_transactions），含 balance_after 快照
--   - 加點：新註冊送 4 點、提交日報送 2 點、admin 手動加（如訂閱 199 → 20 點）
--   - 扣點：抽牌 -2 點（daily / weekly 都是）
--   - coach/admin/master/tester 抽牌免扣（沿用 isOracleUnlimited）
--   - 點數累積不歸零，無有效期
--   - 同一筆日報只能領一次點（靠 reference_id 的 partial unique 防重）
--
-- 寫入安全：學員 / 教練都不能直接 INSERT/UPDATE 這兩張表，
--          一律透過 SECURITY DEFINER 的 grant_points / consume_points 函式。
--
-- 本檔可重複執行（idempotent）。
-- =============================================

-- =============================================
-- 1. point_balances：每位 user 一筆，存當前餘額
-- =============================================
CREATE TABLE IF NOT EXISTS point_balances (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. point_transactions：流水紀錄
--
-- type 列表：
--   signup_bonus    新註冊送 4 點
--   daily_report    提交日報送 2 點
--   oracle_draw     抽牌扣 2 點
--   admin_adjust    管理員手動加減（含每月訂閱 199 → 20 點）
-- =============================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'signup_bonus', 'daily_report', 'oracle_draw', 'admin_adjust'
  )),
  amount INTEGER NOT NULL,                          -- 正數加點、負數扣點
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  reference_id UUID,                                -- 關聯 daily_reports.id / card_readings.id（防重複領）
  note TEXT,                                        -- 管理員備註（例如「2026-05 訂閱付款」）
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user
  ON point_transactions(user_id, created_at DESC);

-- 防重複加點：同 user 同 type 同 reference_id 只能寫一次
-- （admin_adjust 不帶 reference_id 所以不受限）
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_tx_dedupe
  ON point_transactions(user_id, type, reference_id)
  WHERE reference_id IS NOT NULL;

-- =============================================
-- RLS
-- =============================================
ALTER TABLE point_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view own balance, admin all" ON point_balances;
CREATE POLICY "view own balance, admin all"
  ON point_balances FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master', 'coach')
    )
  );

DROP POLICY IF EXISTS "view own tx, admin all" ON point_transactions;
CREATE POLICY "view own tx, admin all"
  ON point_transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master', 'coach')
    )
  );

-- 學員、教練都不能直接 INSERT/UPDATE/DELETE 這兩張表；
-- 一律透過下方的 SECURITY DEFINER 函式（會繞過 RLS）。
-- 不設 INSERT/UPDATE policy = 預設拒絕。

-- =============================================
-- 3. grant_points：加點（也可扣點，amount 為負）
-- =============================================
CREATE OR REPLACE FUNCTION public.grant_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_note TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_amount = 0 THEN
    RAISE EXCEPTION '金額不可為 0';
  END IF;

  -- 確保 balance row 存在並鎖列
  INSERT INTO point_balances (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM point_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance := v_balance + p_amount;

  IF v_balance < 0 THEN
    RAISE EXCEPTION '點數餘額不足';
  END IF;

  UPDATE point_balances
  SET balance = v_balance, updated_at = now()
  WHERE user_id = p_user_id;

  -- 寫流水（uq_point_tx_dedupe 會擋重複 reference_id）
  INSERT INTO point_transactions
    (user_id, type, amount, balance_after, reference_id, note)
  VALUES
    (p_user_id, p_type, p_amount, v_balance, p_reference_id, p_note);

  RETURN v_balance;
END;
$$;

-- =============================================
-- 4. consume_points：扣點（給抽牌 API 用）
--   - 餘額不足 raise '點數不足'，前端可 catch 並提示
--   - 回傳扣完後的餘額
-- =============================================
CREATE OR REPLACE FUNCTION public.consume_points(
  p_user_id UUID,
  p_amount INTEGER,                                  -- 傳正數，例如 2
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION '扣點金額需為正數';
  END IF;

  RETURN grant_points(p_user_id, -p_amount, p_type, p_note, p_reference_id);
END;
$$;

-- 開放 RPC 呼叫
GRANT EXECUTE ON FUNCTION public.grant_points(UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_points(UUID, INTEGER, TEXT, UUID, TEXT) TO authenticated, service_role;

-- =============================================
-- 5. handle_new_user：擴充原本 trigger，新註冊送 4 點
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );

  -- 送 4 點體驗額度（夠抽 2 次）
  INSERT INTO public.point_balances (user_id, balance) VALUES (NEW.id, 4);
  INSERT INTO public.point_transactions
    (user_id, type, amount, balance_after, note)
  VALUES
    (NEW.id, 'signup_bonus', 4, 4, '新註冊體驗額度');

  RETURN NEW;
END;
$$;

-- trigger 已存在（schema.sql 已建），這裡只更新 function body 即可

-- =============================================
-- 6. 補送：既有用戶建立 balance row（balance = 0、不補簽到禮）
-- =============================================
INSERT INTO point_balances (user_id, balance)
SELECT id, 0 FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- 7. daily_reports AFTER INSERT trigger：自動送 2 點
--   - 同一筆 report id 只能領一次（reference_id 防重複）
--   - update（編輯日報）不會觸發
-- =============================================
CREATE OR REPLACE FUNCTION public.grant_daily_report_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.grant_points(
    NEW.user_id,
    2,
    'daily_report',
    '提交 Day ' || COALESCE(NEW.day_number::TEXT, '?') || ' 日報',
    NEW.id
  );
  RETURN NEW;
EXCEPTION
  -- 防呆：unique 防重複觸發時，靜默吞掉，不擋 insert
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_report_grant_points ON daily_reports;
CREATE TRIGGER trg_daily_report_grant_points
  AFTER INSERT ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_daily_report_points();

-- =============================================
-- 強制 PostgREST 重新載入 schema cache
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 驗證：跑完應看到 2 張表 + 2 個函式
-- =============================================
SELECT 'table' AS kind, table_name AS name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('point_balances', 'point_transactions')
UNION ALL
SELECT 'function', routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN ('grant_points', 'consume_points', 'grant_daily_report_points')
ORDER BY kind, name;

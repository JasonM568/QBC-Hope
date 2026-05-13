-- =============================================
-- HOPE OS v2：訂閱方案 + 一次性訂單 schema
--
-- 對應 docs/SPEC_點數系統_重設計版.md 第 4.3、4.4 節
--
-- 涵蓋兩張表：
--   1. subscriptions    訂閱合約（trial 21 天 / monthly 定期定額 / annual 一次性）
--   2. hope_purchase_orders  一次性訂單（trial / annual / 加購點數三包）
--
-- 兩張表都包含：
--   - 綠界金流欄位（merchant_trade_no、trade_no、ecpay_agreement_no）
--   - 發票欄位（B2C 載具/捐贈 + B2B 統編三聯式，對應 SPEC 第八節）
--   - RLS：本人可看 + admin/master 全看；INSERT/UPDATE 一律由後端 service_role 處理
--
-- 本檔可重複執行（idempotent）。
--
-- 注意：daily_reports trigger 改寫（+1 + streak）、profiles 新增 streak 欄位、
--       point_transactions type 擴充等，皆屬 Session 2「點數規則對齊」範圍，
--       本檔不重複處理。
-- =============================================

-- =============================================
-- 1. subscriptions：訂閱合約
--
-- 一位 user 可能有多筆：
--   - 月繳 active + 年繳 queued（升級排程中）
--   - 過期月繳 + 新年繳 active
-- 查詢「當前方案」一律抓 status IN ('active','queued','cancelling') 最新一筆
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  plan TEXT NOT NULL CHECK (plan IN ('trial', 'monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',      -- 服務中
    'queued',      -- 升級排程：月繳未到期前先建好的年繳
    'cancelling',  -- 用戶已申請取消，服務跑到本期結束
    'expired',     -- 到期自然結束
    'cancelled'    -- 管理員強制取消 / queued 被退費
  )),

  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  amount_twd  INT NOT NULL CHECK (amount_twd >= 0),

  -- 綠界欄位
  ecpay_agreement_no TEXT,            -- 月繳定期定額合約編號（trial/annual 不用）
  merchant_trade_no  TEXT,            -- 我方訂單編號（年繳/體驗用）
  trade_no           TEXT,            -- 綠界交易編號

  cancelled_at  TIMESTAMPTZ,
  cancel_reason TEXT,

  -- 發票欄位（B2C + B2B）— 對應 SPEC 第 8.2、8.3 節
  invoice_type      TEXT CHECK (invoice_type IN ('b2c', 'b2b')),
  buyer_name        TEXT,             -- 個人姓名 / 公司抬頭
  buyer_email       TEXT,             -- 發票寄送 email
  buyer_tax_id      TEXT,             -- 統一編號（B2B 必填、8 碼）
  carrier_type      TEXT CHECK (carrier_type IN ('mobile', 'citizen_digital', 'member', 'paper', 'donation')),
  carrier_num       TEXT,             -- 載具號碼（手機條碼 / 自然人憑證）
  donation_code     TEXT,             -- 捐贈碼（3-7 碼）
  invoice_number    TEXT,             -- 綠界回傳的發票號碼
  invoice_issued_at TIMESTAMPTZ,      -- 發票開立時間

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- B2B 統編必須 8 碼；B2C 不必填
  CONSTRAINT subscriptions_tax_id_format CHECK (
    buyer_tax_id IS NULL OR buyer_tax_id ~ '^[0-9]{8}$'
  ),
  -- 捐贈碼必須 3-7 碼數字
  CONSTRAINT subscriptions_donation_code_format CHECK (
    donation_code IS NULL OR donation_code ~ '^[0-9]{3,7}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires
  ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_merchant_trade_no
  ON subscriptions(merchant_trade_no) WHERE merchant_trade_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_agreement_no
  ON subscriptions(ecpay_agreement_no) WHERE ecpay_agreement_no IS NOT NULL;

-- =============================================
-- 2. hope_purchase_orders：一次性訂單
--
-- 涵蓋：
--   - subscription_trial   體驗方案 $99 / 21 天
--   - subscription_annual  年繳方案 $1,999 / 12 個月
--   - points_99 / points_199 / points_499  三包加購點數
--
-- 月繳付款記錄寫進 subscriptions 本身（合約導向），不重複寫這裡。
-- =============================================
CREATE TABLE IF NOT EXISTS hope_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  order_type TEXT NOT NULL CHECK (order_type IN (
    'subscription_trial',
    'subscription_annual',
    'points_99',
    'points_199',
    'points_499'
  )),
  amount_twd      INT NOT NULL CHECK (amount_twd >= 0),
  points_granted  INT NOT NULL DEFAULT 0 CHECK (points_granted >= 0),

  -- 綠界欄位
  payment_provider  TEXT NOT NULL DEFAULT 'ecpay',
  merchant_trade_no TEXT UNIQUE,                 -- 我方訂單編號（建立訂單時產生、唯一）
  trade_no          TEXT,                        -- 綠界交易編號（callback 後寫入）
  payment_status    TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'paid', 'failed', 'refunded'
  )),
  paid_at TIMESTAMPTZ,

  -- 對應 subscriptions（若此訂單促成訂閱合約，建立後回填）
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- 發票欄位（B2C + B2B）
  invoice_type      TEXT CHECK (invoice_type IN ('b2c', 'b2b')),
  buyer_name        TEXT,
  buyer_email       TEXT,
  buyer_tax_id      TEXT,
  carrier_type      TEXT CHECK (carrier_type IN ('mobile', 'citizen_digital', 'member', 'paper', 'donation')),
  carrier_num       TEXT,
  donation_code     TEXT,
  invoice_number    TEXT,
  invoice_issued_at TIMESTAMPTZ,

  -- 退款
  refunded_at   TIMESTAMPTZ,
  refund_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT hope_purchase_orders_tax_id_format CHECK (
    buyer_tax_id IS NULL OR buyer_tax_id ~ '^[0-9]{8}$'
  ),
  CONSTRAINT hope_purchase_orders_donation_code_format CHECK (
    donation_code IS NULL OR donation_code ~ '^[0-9]{3,7}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_hope_purchase_orders_user
  ON hope_purchase_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hope_purchase_orders_status
  ON hope_purchase_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_hope_purchase_orders_trade_no
  ON hope_purchase_orders(trade_no) WHERE trade_no IS NOT NULL;

-- =============================================
-- RLS
--
-- 兩張表的寫入一律走 service_role（API route 用 supabase server client + service key）。
-- 一般 authenticated user 只能 SELECT 自己的紀錄；admin/master 可全看。
-- 不開放 INSERT/UPDATE/DELETE policy = 預設拒絕。
-- =============================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hope_purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view own subscriptions, admin all" ON subscriptions;
CREATE POLICY "view own subscriptions, admin all"
  ON subscriptions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

DROP POLICY IF EXISTS "view own orders, admin all" ON hope_purchase_orders;
CREATE POLICY "view own orders, admin all"
  ON hope_purchase_orders FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

-- =============================================
-- 強制 PostgREST 重新載入 schema cache
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 驗證：跑完應看到 2 張表 + 各自 RLS = true
-- =============================================
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('subscriptions', 'hope_purchase_orders')
ORDER BY c.relname;

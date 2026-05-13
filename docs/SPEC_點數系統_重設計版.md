# 點數系統 SPEC — 重設計版 v2

> 本文件為點數系統與訂閱方案的完整規格。
> 在 VS Code 終端機執行 `claude`，說「請讀取 docs/SPEC_點數系統_重設計版.md，依照第七節實作步驟開始執行」即可。

**建立日期：** 2026-05-13
**最後更新：** 2026-05-13
**狀態：** 🟡 規格定稿、待分階段實作
**前置條件：** `supabase/points-system.sql` 已在 prod 執行完畢

---

## 環境前提（2026-05-13 確認）

### 已就緒
- ✅ 綠界一般金流：已申請、可正常收款
- ✅ 賣方統編：已申請
- ✅ 電子發票：已申請（採方案 A 一體式整合）

### 待確認
- ⚠️ **綠界「信用卡定期定額」**：需登入綠界廠商後台確認該服務模組是否已開通
  - 入口：https://vendor.ecpay.com.tw/ → 系統管理 → 商店資訊 / 付款方式管理
  - 未開通 → 聯絡綠界業務窗口開通（通常 1-2 工作天）
  - **測試環境全功能開通**，可先開發、上正式環境前再確認

### 業務假設
- 學員年齡：**18 歲以上**（沒有未成年用戶，免處理未成年信用卡監護人同意條款）
- 發票對象：**B2C + B2B 都要支援**（個人載具/捐贈 + 公司統編三聯式）

---

## 一、訂閱方案定義

### 1.1 三個方案總覽

| 方案 | 售價 | 期限 | 訂閱月點 | 適用對象 |
|------|------|------|---------|---------|
| 體驗方案 | $99（一次性） | 21 天 | — | 新用戶試用 |
| 月繳方案 | $199／月 | 無限（每月續約） | +15 點/月 | 彈性用戶 |
| 年繳方案 | $1,999／年 | 12 個月 | +20 點/月 | 重度用戶 |

### 1.2 方案定價說明

**體驗方案（$99／21天）**
- 一次性付款，不自動續約
- 相當於 $4.7/天
- 到期後若未升級，系統鎖定日報與週報

**月繳方案（$199／月，原價 $260）**
- 使用綠界定期定額（每月自動扣款）
- 訂閱成功當日立即發放 15 點
- 每月續約日再發 15 點
- 可隨時在後台申請取消，取消後本期服務不中斷、不退費

**年繳方案（$1,999／年）**
- 一次性付款 $1,999（原價 $2,388，省 $389）
- 等同只付 10 個月費用，享有 12 個月服務
- 付款成功後立即發放 20 點，之後每月 1 日再補發 20 點（共補發 11 次 = 全年 240 點）
- 效期從付款成功日起算 12 個月
- 不退費

---

## 二、點數規則

### 2.1 點數獲得

| 來源 | 點數 | 觸發方式 |
|------|------|---------|
| 新用戶加入禮 | +4 點 | 帳號建立時自動發放（handle_new_user trigger） |
| 體驗方案付款 | — | 不額外給訂閱點，只有加入禮 |
| 月繳訂閱成功 | +15 點 | 每次扣款成功後發放 |
| 年繳付款成功 | +20 點 | 付款成功當日發放 |
| 年繳每月補點 | +20 點 | 每月 1 日 Cron Job 發放（付款後第 2-12 個月） |
| 每日完成日報 | +1 點 | daily_reports AFTER INSERT trigger |
| 連續 7 天日報 | +3 點 | streak 計算，每達 7 的倍數自動觸發 |
| 連續 21 天日報 | +10 點 | streak 計算，第 21 天觸發 |
| 管理員手動加值 | 自訂 | type = admin_adjust |

### 2.2 點數消耗

| 行為 | 點數 |
|------|------|
| 抽日牌（daily oracle） | -2 點 |
| 抽週牌（weekly oracle） | -2 點 |

### 2.3 點數加購方案

| 方案 | 售價 | 點數 | 可抽次數 | 每點成本 |
|------|------|------|---------|---------|
| 體驗包 | $99 | 11 點 | 約 5 次 | $9.0 |
| 標準包 | $199 | 25 點 | 約 12 次 | $7.9 |
| 大包 | $499 | 70 點 | 約 35 次 | $7.1 |

### 2.4 點數基本規則

- 點數**永久累積，不設有效期**
- 訂閱到期後，**剩餘點數仍可繼續使用**
- `coach / admin / master / tester` 角色抽牌**免扣點**（維持現狀）
- 加購點數透過綠界一次性付款

### 2.5 每月活躍用戶點數試算

| 來源 | 月繳用戶 | 年繳用戶 |
|------|---------|---------|
| 訂閱月點 | 15 點 | 20 點 |
| 日報完成（30天） | 30 點 | 30 點 |
| 7天 streak（4次） | 12 點 | 12 點 |
| 21天 milestone | 10 點 | 10 點 |
| **月合計上限** | **67 點（33 次）** | **72 點（36 次）** |

---

## 三、訂閱升級 / 取消規則

### 3.1 月繳 → 年繳升級

**採用「本期用完再切換」方案：月繳照跑到期，年繳於到期後自動生效。**

1. 用戶點「升級年繳」
2. 產生 $1,999 一次性付款訂單，導向綠界付款頁
3. 付款成功後：
   - **不終止月繳合約**，月繳繼續運行至 `subscription_expires_at`
   - 在 `subscriptions` 新增一筆 `status = 'queued'` 的年繳記錄，`started_at = 當前月繳到期日`
   - 前台顯示：「你的年繳方案將於 **{月繳到期日}** 自動生效」
4. 月繳到期當天，Cron Job 自動執行切換：
   - 月繳 `status` → `expired`
   - 年繳 `status` → `active`（`queued` 轉正）
   - 發放 20 點（type = `subscription`）
   - 更新 `profiles.subscription_plan = 'annual'`
   - 更新 `profiles.subscription_expires_at = 年繳到期日（當日起算 12 個月）`
5. 後續每月 1 日 Cron Job 補發 20 點，直到年繳到期

> **取消保護規則：**
> - 年繳尚未生效（`queued`）→ 可取消排程並退費 $1,999
> - 年繳已生效（`active`）→ 不退費，服務持續至到期日

### 3.2 用戶自助取消訂閱

**入口**：用戶後台 `/profile` 或 `/subscription` → 「取消訂閱」按鈕

**月繳取消流程：**
1. 用戶點「取消訂閱」→ 顯示確認彈窗，說明「取消後服務繼續至本期結束，不退費」
2. 確認後，系統呼叫綠界 `CloseAgreement` API 關閉合約
3. 將 `profiles.subscription_status` 更新為 `cancelling`
4. 服務持續至 `subscription_expires_at` 到期日
5. 到期後自動鎖定，`subscription_status` 更新為 `expired`

**年繳取消流程：**
1. 年繳為一次性付款，**沒有定期扣款合約**
2. 用戶可標記「不續約」，系統在 `subscription_expires_at` 到期後自動鎖定
3. 剩餘天數**不退費**

**取消政策（前台需明確顯示）：**
- 取消訂閱不會立即停止服務
- 服務持續至當期結束
- 不另外退費或刷退

---

## 四、資料庫異動

### 4.1 profiles 新增欄位

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT
  CHECK (subscription_plan IN ('trial', 'monthly', 'annual', NULL)),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive'
  CHECK (subscription_status IN ('active', 'cancelling', 'expired', 'inactive')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_report_date DATE;
```

### 4.2 point_transactions 新增 type 值

```sql
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
```

### 4.3 新增 subscriptions 資料表

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('trial', 'monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'queued', 'cancelling', 'expired', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ecpay_agreement_no TEXT,         -- 月繳定期定額合約編號
  merchant_trade_no TEXT,          -- 我方訂單編號（年繳 / 體驗用）
  amount_twd INT NOT NULL,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- 發票相關欄位（B2C + B2B）
  invoice_type TEXT CHECK (invoice_type IN ('b2c', 'b2b')),
  buyer_name TEXT,                 -- 個人姓名 / 公司抬頭
  buyer_email TEXT,                -- 發票寄送 email
  buyer_tax_id TEXT,               -- 統一編號（B2B 必填、8 碼）
  carrier_type TEXT CHECK (carrier_type IN ('mobile', 'citizen_digital', 'member', 'paper', 'donation', NULL)),
  carrier_num TEXT,                -- 載具號碼（手機條碼 / 自然人憑證）
  donation_code TEXT,              -- 捐贈碼（3-7 碼）
  invoice_number TEXT,             -- 綠界回傳的發票號碼
  invoice_issued_at TIMESTAMPTZ,   -- 發票開立時間

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'master'))
  );
```

### 4.4 新增 hope_purchase_orders 資料表（一次性訂單：訂閱方案 + 點數加購）

```sql
CREATE TABLE IF NOT EXISTS hope_purchase_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  order_type TEXT NOT NULL
    CHECK (order_type IN ('subscription_trial', 'subscription_annual', 'points_99', 'points_199', 'points_499')),
  amount_twd INT NOT NULL,
  points_granted INT DEFAULT 0,
  payment_provider TEXT DEFAULT 'ecpay',
  trade_no TEXT,                          -- 綠界交易編號
  merchant_trade_no TEXT UNIQUE,          -- 我方訂單編號
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,

  -- 發票相關欄位（B2C + B2B）
  invoice_type TEXT CHECK (invoice_type IN ('b2c', 'b2b')),
  buyer_name TEXT,                        -- 個人姓名 / 公司抬頭
  buyer_email TEXT,                       -- 發票寄送 email
  buyer_tax_id TEXT,                      -- 統一編號（B2B 必填、8 碼）
  carrier_type TEXT CHECK (carrier_type IN ('mobile', 'citizen_digital', 'member', 'paper', 'donation', NULL)),
  carrier_num TEXT,                       -- 載具號碼
  donation_code TEXT,                     -- 捐贈碼（3-7 碼）
  invoice_number TEXT,                    -- 綠界回傳的發票號碼
  invoice_issued_at TIMESTAMPTZ,          -- 發票開立時間

  -- 取消 / 退款
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hope_purchase_orders_user ON hope_purchase_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hope_purchase_orders_status ON hope_purchase_orders(payment_status);

ALTER TABLE hope_purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON hope_purchase_orders;
CREATE POLICY "Users can view own orders" ON hope_purchase_orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'master'))
  );
```

### 4.5 修改 daily_reports trigger（+1 點 + streak）

```sql
CREATE OR REPLACE FUNCTION handle_daily_report_points()
RETURNS TRIGGER AS $$
DECLARE
  v_streak INT;
  v_last_date DATE;
BEGIN
  SELECT current_streak, last_report_date
  INTO v_streak, v_last_date
  FROM profiles WHERE id = NEW.user_id;

  IF v_last_date = NEW.report_date - INTERVAL '1 day' THEN
    v_streak := v_streak + 1;
  ELSIF v_last_date = NEW.report_date THEN
    RETURN NEW;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE profiles SET
    current_streak = v_streak,
    longest_streak = GREATEST(longest_streak, v_streak),
    last_report_date = NEW.report_date
  WHERE id = NEW.user_id;

  -- 每日 +1 點
  -- 注意：grant_points 參數順序為 (user_id, amount, type, note TEXT, reference_id UUID)
  --       reference_id 是第 5 位、不是第 4 位。reference_id 確保編輯日報不重複領點。
  PERFORM grant_points(
    NEW.user_id,
    1,
    'daily_report',
    '提交 Day ' || COALESCE(NEW.day_number::TEXT, '?') || ' 日報',
    NEW.id
  );

  -- 連續 7 天（每 7 的倍數）+3 點
  IF v_streak % 7 = 0 THEN
    PERFORM grant_points(
      NEW.user_id,
      3,
      'streak_7',
      '連續 ' || v_streak || ' 天 streak 獎勵',
      NEW.id
    );
  END IF;

  -- 連續 21 天 +10 點
  IF v_streak = 21 THEN
    PERFORM grant_points(
      NEW.user_id,
      10,
      'streak_21',
      '連續 21 天里程碑',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_daily_report_insert ON daily_reports;

CREATE TRIGGER on_daily_report_insert
  AFTER INSERT ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION handle_daily_report_points();
```

---

## 五、API 規格

### 5.1 訂閱相關 API

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/subscription/create` | POST | 建立訂閱訂單，回傳綠界付款表單 |
| `/api/subscription/callback` | POST | 綠界付款 callback（不需 auth） |
| `/api/subscription/return` | GET | 付款完成 redirect 頁面 |
| `/api/subscription/cancel` | POST | 用戶申請取消訂閱 |
| `/api/subscription/upgrade` | POST | 月繳升級年繳 |
| `/api/subscription/status` | GET | 取得當前訂閱狀態 |

#### POST `/api/subscription/create`
```typescript
// Request
{
  plan: 'trial' | 'monthly' | 'annual'
}

// Response
{
  order_id: string,
  ecpay_html: string  // 直接 submit 的 form HTML
}
```

#### POST `/api/subscription/cancel`
```typescript
// Request: 無（從 session 取 user_id）

// 執行：
// 1. 若為月繳：呼叫綠界 CloseAgreement API
// 2. 更新 subscriptions.status = 'cancelling'
// 3. 更新 profiles.subscription_status = 'cancelling'

// Response
{
  success: boolean,
  expires_at: string  // 服務到期時間
}
```

#### POST `/api/subscription/upgrade`
```typescript
// Request: 無（從 session 取 user_id）

// 執行：
// 1. 呼叫綠界 CloseAgreement 終止月繳合約
// 2. 建立 $1,999 年繳一次性付款訂單

// Response
{
  order_id: string,
  ecpay_html: string
}
```

### 5.2 點數加購 API

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/points/balance` | GET | 餘額 + streak + 流水 |
| `/api/points/purchase/create` | POST | 建立加購訂單 |
| `/api/points/purchase/callback` | POST | 綠界 callback（不需 auth） |
| `/api/points/purchase/return` | GET | 付款完成頁面 |

---

## 六、前端頁面規格

### 6.1 `/pricing`（新增）
對應第一節方案卡片，三欄佈局：
- 體驗方案（$99）、月繳方案（$199）、年繳方案（$1,999，標記「最超值」）
- 每個方案顯示點數說明、功能列表、CTA 按鈕
- 底部方案比較表

### 6.2 `/subscription`（新增）或合併到 `/profile`
- 當前方案名稱、狀態（active / cancelling / expired）
- 到期日
- 已累積點數
- 「升級年繳」按鈕（月繳用戶才顯示）
- 「取消訂閱」按鈕 → 確認彈窗（說明不退費政策）→ 呼叫 cancel API

### 6.3 `/points`（既有，需更新）
- 新增連續天數顯示：目前連續 N 天 🔥，最長 N 天
- 新增點數加購方案卡片（三個方案）
- 流水記錄補充各 type 的顯示文字

### 6.4 `/oracle` 與 `/oracle/weekly`（既有，需更新）
- 餘額不足時，顯示「加購點數」連結

---

## 七、實作步驟（給 Claude Code 執行）

在 VS Code 終端機執行 `claude`，依照以下順序實作：

### Step 1：資料庫更新（先執行，其他步驟依賴此步）
前往 **Supabase Studio（prod）→ SQL Editor**，依序執行：

1. 第四節 4.1：`profiles` 新增欄位
2. 第四節 4.2：`point_transactions` 更新 type constraint
3. 第四節 4.3：建立 `subscriptions` 資料表
4. 第四節 4.4：建立 `hope_purchase_orders` 資料表
5. 第四節 4.5：替換 `daily_reports` trigger

確認方式：
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

### Step 2：訂閱 API
建立以下檔案：
- `src/app/api/subscription/create/route.ts`
- `src/app/api/subscription/callback/route.ts`
- `src/app/api/subscription/return/page.tsx`
- `src/app/api/subscription/cancel/route.ts`
- `src/app/api/subscription/upgrade/route.ts`
- `src/app/api/subscription/status/route.ts`

綠界 API 參考：
- 定期定額建立：ECPay `AioCheckOut`（PeriodAmt、PeriodType、Frequency）
- 定期定額關閉：ECPay `CloseAgreement`
- 一次性付款：ECPay `AioCheckOut`（一般模式）

### Step 3：點數加購 API
- `src/app/api/points/purchase/create/route.ts`
- `src/app/api/points/purchase/callback/route.ts`
- `src/app/api/points/purchase/return/page.tsx`

### Step 4：年繳每月補點 Cron Job
在 `vercel.json` 新增排程，每月 1 日 00:00 執行：
```json
{
  "path": "/api/cron/subscription-points",
  "schedule": "0 0 1 * *"
}
```
建立 `src/app/api/cron/subscription-points/route.ts`：
查詢所有 `subscription_plan = 'annual'` 且 `subscription_status = 'active'` 的用戶，
各補發 20 點（type = `subscription_monthly`）。

### Step 5：前端頁面
1. 新增 `src/app/pricing/page.tsx`（方案介紹頁）
2. 新增 `src/app/subscription/page.tsx`（訂閱管理頁）
3. 更新 `src/app/points/page.tsx`（streak + 加購）
4. 更新 `src/app/oracle/page.tsx`（餘額不足 → 加購入口）
5. 更新 `src/app/oracle/weekly/page.tsx`（同上）

### Step 6：發票系統串接
詳見第八節。重點：
- AioCheckOut 帶 `InvoiceMark=Y` 與 B2C/B2B 欄位
- 付款 callback 同時記錄發票號碼至訂單表
- 結帳表單支援個人 / 公司切換

### Step 7：訂單管理後台 `/admin/orders`
詳見第九節。重點：
- 列表 + 詳情 + 篩選 + 統計
- 手動延長 / 取消 / 退款 / 重開發票
- 6 個 admin API

### Step 8：測試清單
- [ ] 體驗方案付款 → 帳號解鎖 21 天 + 發票自動開立
- [ ] 月繳付款成功 → 發 15 點，`subscription_plan = 'monthly'`，每期發票
- [ ] 年繳付款成功 → 發 20 點，`subscription_plan = 'annual'`，效期 12 個月
- [ ] 每日完成日報 → +1 點（不是 +2）
- [ ] 連續第 7 天 → 額外 +3 點
- [ ] 連續第 21 天 → 額外 +10 點
- [ ] 中斷連續後重新開始，streak 重設為 1
- [ ] 月繳升級年繳 → 月繳合約終止，年繳生效，發 20 點
- [ ] 取消月繳 → 本期繼續，到期鎖定
- [ ] 點數不足抽牌 → 顯示加購入口
- [ ] 加購點數付款 → 正確發點
- [ ] B2C 發票（含載具 / 捐贈）正確開立
- [ ] B2B 發票（含統編 / 三聯式）正確開立
- [ ] `/admin/orders` 列表 / 篩選 / 詳情正確
- [ ] Admin 手動延長到期日 / 取消 / 重開發票

---

### 多 session 執行路線（2026-05-13 規劃）

v2 全套切成 10 個 Claude Code session 並行/序列執行（詳細任務見 HANDOFF）：

| Session | 範圍 | 依賴 | Git 分支 |
|---|---|---|---|
| 1 | SPEC 收尾 + HANDOFF | — | main |
| 2 | Phase 1 點數規則對齊 | 1 | `feat/v2-points-rules` |
| 3 | DB schema + 綠界 SDK 骨架 | 1 | `feat/v2-subscription-schema` |
| 4 | 一次性付款 + 發票 | 3 | `feat/v2-onetime-payment` |
| 5 | 定期定額（月繳）| 3 | `feat/v2-recurring-payment` |
| 6 | 前端 /pricing + /subscription | 3 | `feat/v2-frontend-pricing` |
| 7 | Cron 補月點 | 3 | `feat/v2-cron-monthly-points` |
| 8 | 升級 / 取消流程 | 4+5+6 | `feat/v2-upgrade-cancel` |
| 9 | /admin/orders 後台 | 3+4 | `feat/v2-admin-orders` |
| 10 | 完整 prod 測試 + 公告 | 全部 | main |

**並行 Wave**：
- Wave B：Session 2 + 3（雙開）
- Wave C：Session 4 + 5 + 6 + 7（四開，需 3 完成）
- Wave D：Session 8 + 9（雙開）

---

## 八、發票系統（B2C + B2B）

### 8.1 串接方案
**採方案 A：金流 + 發票一體式整合（InvoiceMark=Y）**

付款流程內帶發票參數，綠界於付款成功後自動開立發票並回傳發票號碼。
- 優點：開發省事、付款與發票原子化（不會付款成功但發票漏開）
- 限制：客製化彈性較低，重開發票需另外串獨立 API

### 8.2 結帳表單欄位

`/pricing/checkout` 表單需支援「個人 / 公司」切換：

**個人（B2C）**
| 欄位 | 必填 | 對應綠界參數 |
|------|------|-------------|
| 姓名 | ✅ | `CustomerName` |
| Email | ✅ | `CustomerEmail` |
| 載具類型 | ✅ | `CarrierType` |
| 載具號碼 | 條件 | `CarrierNum`（手機條碼 / 自然人憑證需填） |
| 捐贈碼 | 條件 | `LoveCode`（選擇捐贈才填） |

**載具選項**：
- `mobile`：手機條碼（/ 開頭 8 碼）
- `citizen_digital`：自然人憑證（16 碼大寫字母+數字）
- `member`：會員載具（自動帶 HOPE 系統 user_id）
- `paper`：紙本郵寄（少數人需要）
- `donation`：捐贈（需選擇受贈機構，存 `LoveCode`）

**公司（B2B）**
| 欄位 | 必填 | 對應綠界參數 |
|------|------|-------------|
| 公司抬頭 | ✅ | `CustomerName` |
| 統一編號 | ✅ | `CustomerIdentifier`（8 碼） |
| Email | ✅ | `CustomerEmail` |

### 8.3 綠界 AioCheckOut 發票參數

```typescript
{
  // 啟用發票
  InvoiceMark: 'Y',
  RelateNumber: merchant_trade_no,
  CustomerIdentifier: tax_id || '',     // B2B 統編、B2C 空字串
  CustomerName: buyer_name,
  CustomerAddr: '',                     // 可選
  CustomerEmail: buyer_email,
  ClearanceMark: '1',                   // 1=非經海關出口
  TaxType: '1',                         // 1=應稅
  CarrierType: carrier_type_code,       // '' / 1 / 2 / 3
  CarrierNum: carrier_num,
  Donation: donation_code ? '1' : '0',
  LoveCode: donation_code || '',
  Print: tax_id ? '1' : '0',            // B2B 列印、B2C 不列印
  InvoiceItems: '[{...商品明細...}]',
  InvoiceRemark: '',
  DelayDay: '0',                        // 立即開立
  InvType: '07',                        // 一般稅額
}
```

### 8.4 發票記錄

- 開立成功後綠界 callback 回傳發票號碼 → 寫進 `subscriptions.invoice_number` 或 `hope_purchase_orders.invoice_number`
- 發票寄送：綠界自動寄到 `buyer_email`
- 用戶可在 `/subscription` 看到自己的發票號碼

### 8.5 重開發票（將來需求）

如用戶反映發票沒收到 / 資料錯誤：
- `/admin/orders/[id]` 後台提供「重開發票」按鈕
- 呼叫綠界獨立發票 API（`InvoiceRoute` 或重發 email）
- 此功能可在 Phase 4 後再做

---

## 九、訂單管理後台 `/admin/orders`

### 9.1 主列表頁
**路徑**：`/admin/orders`
**權限**：admin / master

**功能**：
- 訂閱訂單清單（從 `subscriptions` + `hope_purchase_orders` 兩表 union）
- 篩選器：
  - 訂閱狀態（active / queued / cancelling / expired / cancelled）
  - 訂單類型（trial / monthly / annual / points_*）
  - 付款狀態（pending / paid / failed / refunded）
  - 到期區間（即將到期 7/14/30 天）
- 搜尋：用戶 email / 訂單編號 / 發票號碼
- 欄位：用戶 / 方案 / 金額 / 狀態 / 付款日 / 到期日 / 發票號碼

### 9.2 單筆詳情頁
**路徑**：`/admin/orders/[id]`

**顯示**：
- 用戶資訊（連結到 profile）
- 完整訂單欄位
- 發票資訊（號碼、開立時間、買方資訊）
- 點數異動關聯（哪筆 grant_points 觸發）
- 綠界交易明細（trade_no / merchant_trade_no）

**手動操作**：
- 延長到期日（補償用，寫 `note` 紀錄原因）
- 強制取消訂閱
- 重開發票（呼叫綠界）
- 退款（呼叫綠界退款 API + 更新 `refunded_at`）

### 9.3 營收統計 dashboard widget
**位置**：`/admin/orders` 上方 或 `/admin/dashboard`（如有）

**指標**：
- 本月收入（paid orders 金額總和）
- 有效訂閱人數（status=active）
- 即將到期人數（7/14/30 天內）
- 流失率（本月 expired - 新增 active）
- 訂閱方案分布（trial / monthly / annual 比例）

### 9.4 API
| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/admin/orders` | GET | 列表（含篩選） |
| `/api/admin/orders/[id]` | GET | 單筆詳情 |
| `/api/admin/orders/[id]/extend` | POST | 延長到期日 |
| `/api/admin/orders/[id]/cancel` | POST | 強制取消 |
| `/api/admin/orders/[id]/reissue-invoice` | POST | 重開發票 |
| `/api/admin/orders/[id]/refund` | POST | 退款 |
| `/api/admin/orders/stats` | GET | 營收統計 |

---

## 十、待確認事項

- [x] **年繳每月補點**：在每月 1 日統一補（簡單實作優先、用戶感受可接受）
- [x] **加購點數發票整合**：是，採方案 A 一體式
- [x] **B2C + B2B 都要支援**
- [ ] 用戶取消訂閱後是否需要 Email 通知確認？（傾向：要，附剩餘服務天數）
- [ ] 體驗方案到期後，是否自動提醒升級（LINE / Email）？（傾向：到期前 3 天提醒）
- [ ] 退款政策細節：年繳付款後 N 天內可全額退款？（先暫定：不退費，例外 case 由 admin 後台手動處理）

---

*最後更新：2026-05-13*
*Notion：https://www.notion.so/35f77d11fff181bc95e4e43a23605158*

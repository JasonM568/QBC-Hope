# 模組六：金流訂閱系統 SPEC

## 概述

HOPE 21天卓越系統採收費制，學員註冊後可免費使用第一輪（21天），第一輪結束後須完成付費才能繼續使用。收費採年費制（365天），從付費成功當天起算。

---

## 商業規則

### 訂閱方案
- **免費體驗**：註冊後可免費使用一輪（21天）
- **年費方案**：付費成功日起算 365 天
- **到期處理**：到期未續約，鎖定所有表單模組（僅可查看歷史資料）
- **續約提醒**：到期前 30 天透過 LINE 和系統內通知提醒學員續約

### 權限控制邏輯
```
新學員 → 免費使用第一輪（21天）
第一輪結束 → 檢查訂閱狀態
  ├─ 已付費且未到期 → 可開啟第二輪，正常使用所有模組
  └─ 未付費或已到期 → 鎖定表單，顯示付費引導頁面
```

### 不受限制的角色
- master（院長）、admin（管理員）、coach（教練）、tester（測試人員）不受訂閱限制

---

## 金流串接：綠界 ECPay

### 串接方式
- 使用綠界「全方位金流 API」
- 測試環境先行開發，確認流程後切換正式環境

### 付款流程
```
1. 學員點擊「升級方案」按鈕
2. 系統建立訂單（POST /api/payment/create-order）
3. 導向綠界付款頁面（信用卡 / ATM / 超商）
4. 學員完成付款
5. 綠界回調通知（POST /api/payment/callback）
6. 系統驗證回調、更新訂閱狀態
7. 導回 HOPE 系統顯示付款成功
```

### 所需綠界資訊（開發前需準備）
- 商店代號（MerchantID）
- HashKey
- HashIV
- 測試環境帳號

---

## 資料庫設計

### subscriptions 表
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'annual',       -- 方案類型
  amount INTEGER NOT NULL,                         -- 金額（新台幣）
  paid_at TIMESTAMPTZ,                             -- 付費時間
  expires_at TIMESTAMPTZ,                          -- 到期時間
  status TEXT NOT NULL DEFAULT 'pending',           -- pending / active / expired / cancelled
  payment_method TEXT,                             -- credit_card / atm / cvs
  trade_no TEXT,                                   -- 綠界交易編號
  merchant_trade_no TEXT UNIQUE,                   -- 系統訂單編號
  notified_expiry BOOLEAN DEFAULT false,           -- 是否已發送到期提醒
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);
```

### RLS 政策
- 學員可查看自己的訂閱紀錄
- master/admin 可查看所有訂閱紀錄
- 只有系統（service_role）可新增/更新訂閱

---

## API 端點

### POST /api/payment/create-order
- 建立訂單，產生綠界付款表單參數
- 驗證學員身份
- 防止重複建立（檢查是否有 pending 訂單）

### POST /api/payment/callback
- 接收綠界付款結果通知（Server to Server）
- 驗證 CheckMacValue 確認來源合法
- 更新訂閱狀態為 active
- 設定 expires_at = paid_at + 365 天

### GET /api/payment/return
- 學員付款後的前端導回頁面
- 顯示付款成功/失敗訊息

### GET /api/payment/status
- 查詢當前學員的訂閱狀態
- 回傳：是否在有效期內、剩餘天數、到期日

---

## 前端頁面

### /subscription（訂閱管理頁）
- 顯示當前訂閱狀態（免費體驗中 / 已訂閱 / 已到期）
- 剩餘天數、到期日
- 「立即訂閱」或「續約」按鈕
- 付款歷史紀錄

### 表單鎖定 UI
- 免費輪次結束且未付費時，各表單頁面顯示鎖定畫面
- 引導文字 + 前往付費的按鈕
- 歷史資料仍可查看（唯讀）

---

## 排程任務（Cron Jobs）

### 到期提醒（每天執行一次）
- 檢查所有 active 訂閱
- expires_at 在 30 天內的，發送 LINE 通知提醒續約
- 標記 notified_expiry = true 避免重複通知

### 過期處理（每天執行一次）
- 檢查所有 active 訂閱
- expires_at 已過期的，更新 status 為 expired

---

## 管理後台功能

### 訂閱管理區塊
- 查看所有學員的訂閱狀態（有效/到期/未訂閱）
- 篩選：依狀態、即將到期
- 手動操作：
  - 開通訂閱（免費贈送/補償）
  - 延長到期日
  - 取消訂閱

### 營收統計
- 本月收入
- 有效訂閱人數
- 即將到期人數（30天內）
- 已到期未續約人數

---

## 安全性考量

- 綠界回調需驗證 CheckMacValue，防止偽造
- 訂單編號使用 UUID + 時間戳，確保唯一
- 付款金額在 Server 端固定，不接受前端傳入
- 敏感金流資訊（HashKey/HashIV）存放在環境變數
- 所有金流 API 需要 HTTPS

---

## 待確認事項

- [ ] 年費金額（新台幣）
- [ ] 綠界商店代號、HashKey、HashIV
- [ ] 是否需要支援多種付款方式（信用卡 / ATM / 超商）
- [ ] 是否需要開立電子發票
- [ ] 退費政策
- [ ] 是否有早鳥價或優惠碼機制

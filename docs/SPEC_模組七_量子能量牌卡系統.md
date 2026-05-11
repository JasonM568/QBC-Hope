# 模組七：量子能量牌卡系統 SPEC

## 概述

提供 64 張量子能量牌卡，學員輸入問題後隨機抽取一張牌卡，系統結合牌卡訊息與學員的問題，透過 AI 進行解讀回覆。類似廟宇抽籤詩或塔羅牌的體驗，但由 AI 擔任解讀者。

---

## 使用流程

```
1. 學員進入牌卡頁面
2. 輸入想問的問題（文字輸入）
3. 點擊「抽牌」
4. 抽牌動畫 → 顯示牌卡（圖片 + 牌面文字）
5. AI 結合「問題 + 牌卡訊息 + 學員近期狀態」進行解讀
6. 顯示 AI 解讀結果
7. 學員可儲存或分享解讀紀錄
```

---

## 牌卡資料

### 64 張量子能量牌卡
- 每張牌卡包含：
  - 編號（1-64）
  - 牌卡名稱
  - 牌面圖片（可選，若無則使用預設樣式）
  - 牌面文字（一小段啟示性的話語）
  - 關鍵字標籤（用於 AI 解讀參考）

### 素材需求（開發前需準備）
- [ ] 64 張牌卡的名稱與文字內容（Excel / CSV / JSON）
- [ ] 牌卡圖片（建議統一尺寸，如 600x900px）
- [ ] 若無圖片，需確認牌卡視覺風格（顏色、字體、背景）

---

## 資料庫設計

### oracle_cards 表（64 張牌卡資料）
```sql
CREATE TABLE oracle_cards (
  id SERIAL PRIMARY KEY,
  card_number INTEGER NOT NULL UNIQUE,           -- 編號 1-64
  card_name TEXT NOT NULL,                        -- 牌卡名稱
  card_message TEXT NOT NULL,                     -- 牌面文字（一段話）
  card_image_url TEXT,                            -- 牌卡圖片 URL（可選）
  keywords TEXT[] DEFAULT '{}',                   -- 關鍵字標籤
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### card_readings 表（學員抽牌紀錄）
```sql
CREATE TABLE card_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL REFERENCES oracle_cards(id),
  question TEXT NOT NULL,                         -- 學員提問
  ai_response TEXT NOT NULL,                      -- AI 解讀結果
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_card_readings_user ON card_readings(user_id, created_at DESC);
```

### RLS 政策
- 所有登入用戶可讀取 oracle_cards（牌卡資料公開）
- 學員只能查看自己的 card_readings
- master/admin 可查看所有學員的抽牌紀錄

---

## AI 解讀設計

### 解讀 API：POST /api/oracle/reading

**輸入：**
- 學員的問題
- 抽到的牌卡編號

**AI 解讀 Prompt 結構：**
```
你是 HOPE 人生作業系統的量子能量解讀師。

學員抽到了一張量子能量牌卡：
- 牌卡名稱：{card_name}
- 牌面訊息：{card_message}

學員的提問：
{question}

學員近期狀態（來自最近 3 天的日報摘要）：
{recent_daily_summary}

請根據以上資訊，為學員進行一段溫暖且具啟發性的解讀。
解讀應：
1. 連結牌卡訊息與學員的提問
2. 參考學員近期的狀態與覺察
3. 給予正向的方向指引
4. 語氣溫暖、鼓勵，像一位智慧的導師
5. 控制在 200-400 字之間
```

### 學員近期狀態取得
- 從 daily_reports 取最近 3 天的資料
- 摘要欄位：most_important_thing, awareness_notice, gratitude, score_note
- 若無日報資料，則僅根據問題和牌卡解讀

### AI 模型選擇
- 建議使用 Claude API（與現有系統一致）
- 備選：OpenAI GPT-4

---

## 前端頁面

### /oracle（牌卡主頁）

**步驟一：提問**
- 文字輸入框：「你想問什麼問題？」
- 提示語引導（例：「可以問關於事業、感情、人生方向的問題」）
- 「抽牌」按鈕

**步驟二：抽牌動畫**
- 牌卡翻轉或展開動畫
- 顯示牌卡正面（圖片 + 牌卡名稱 + 牌面文字）

**步驟三：AI 解讀**
- Streaming 逐字顯示 AI 解讀結果
- 解讀完成後顯示：
  - 「儲存紀錄」按鈕
  - 「再抽一張」按鈕
  - 「分享」按鈕（產生圖片）

### /oracle/history（抽牌歷史）
- 按時間排列的抽牌紀錄
- 每筆顯示：日期、問題、牌卡名稱、AI 解讀摘要
- 點擊可展開完整解讀

---

## 使用限制

### 待確認規則
- [ ] 每天可抽幾次？（建議：每天 1 次，培養儀式感）
- [ ] 免費用戶可否使用？（建議：免費用戶也可抽牌，增加黏著度）
- [ ] 是否限制同一問題重複抽牌？

---

## 牌卡管理（管理後台）

### 牌卡管理區塊
- 查看 64 張牌卡列表
- 編輯牌卡文字內容
- 上傳/更換牌卡圖片
- 新增/刪除牌卡（未來擴充用）

### 抽牌統計
- 各牌卡被抽到的次數排行
- 學員使用頻率統計
- 熱門問題類型分析

---

## 視覺設計方向

### 牌卡風格（待確認）
- [ ] 東方禪風（水墨、書法）
- [ ] 宇宙能量風（星空、光芒）
- [ ] 簡約現代風（幾何、漸層）
- [ ] 其他風格參考圖

### 抽牌動畫
- 牌卡從牌堆中飛出
- 翻轉動畫揭曉正面
- 金色光暈效果（與 HOPE 品牌色一致）

---

## API 端點總覽

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/oracle/draw` | POST | 隨機抽牌，回傳牌卡資料 |
| `/api/oracle/reading` | POST | AI 解讀（streaming） |
| `/api/oracle/save` | POST | 儲存抽牌紀錄 |
| `/api/oracle/history` | GET | 取得學員抽牌歷史 |
| `/api/oracle/cards` | GET | 取得所有牌卡資料（管理用） |
| `/api/oracle/cards/[id]` | PUT | 更新牌卡內容（管理用） |

---

## 待確認事項

- [ ] 64 張牌卡的完整內容（名稱 + 文字）
- [ ] 牌卡圖片素材
- [ ] AI 解讀的語氣風格（溫暖鼓勵 / 直接分析 / 神秘玄學）
- [ ] 每日抽牌次數限制
- [ ] 免費用戶是否可使用此功能
- [ ] 牌卡視覺風格偏好
- [ ] 是否需要「每日一卡」推播功能（LINE 每天推送一張牌卡）

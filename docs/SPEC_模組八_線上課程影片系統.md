# 線上課程影片系統 SPEC — 模組八

> 本文件為「線上課程影片觀看」模組的完整規格。
> 在 VS Code 終端機執行 `claude`，說「請讀取 docs/SPEC_模組八_線上課程影片系統.md，依第八節分階段實作」即可。

**建立日期：** 2026-06-03
**最後更新：** 2026-06-03
**狀態：** 🟡 規格定稿、待分階段實作
**前置條件：**
- `supabase/v2-subscriptions-schema.sql` 已在 prod 執行（`subscriptions` 表存在）
- 真實授權測試依賴 Wave C 訂閱結帳 API（可並行開發，先用手動 insert 的 active subscription 測 gate）

---

## 一、定案範圍（需求決策）

| 項目 | 決定 |
| --- | --- |
| 影片代管 | **MVP 先用 YouTube 嵌入** → 驗證流程後切換 **Vimeo Pro**（影片來源設計成可抽換） |
| 課程結構 | **單支 / 多章節皆支援**（課程 → 單元 一對多；單支課 = 只有 1 個單元） |
| 授權方式 | **訂閱會員包含**（讀 `subscriptions`，非逐課買斷） |
| 授權範圍 | **依方案分級解鎖**（trial / monthly / annual × 課程 對應） |
| 加值功能 | **試看單元 + 觀看進度追蹤** 都做 |
| 批次開通 | 管理員可**批次匯入會員（含未註冊→建帳號）+ 批次開通指定課程**；開通預設永久、可選填到期日 |

### 影片防護程度（務必先理解上限）

- **MVP（YouTube 不公開）**：保護＝**只有播放頁面被會員身份把關**。YouTube 不公開影片的原始連結任何人有連結就能看、也無法限制嵌入網域。→ MVP 階段「raw 連結可被分享」是已知缺口，僅供流程測試。
- **正式（Vimeo Pro）**：網域白名單（影片只能嵌在 `hope.huangxi.info`）+ 頁面把關。**仍無逐人 token**（那是 Vimeo Enterprise/OTT 或 Mux/Cloudflare 等級），已登入會員刻意側錄擋不住。這是 Vimeo Pro 的天花板。

---

## 二、影片來源抽換設計（核心：MVP→正式 只改資料、不改架構）

`course_lessons` 用 `video_provider` + `video_id` + `video_hash` 三欄描述影片，前端用單一 `<LessonPlayer>` 元件依 provider 切換 render。切換步驟＝改該單元的 provider/id（後台可改），不動 schema 與頁面。

| provider | video_id | video_hash | 播放方式 |
| --- | --- | --- | --- |
| `youtube` | YouTube videoId（如 `dQw4w9WgXcQ`） | 不使用 | `youtube-nocookie.com/embed/{id}` + IFrame Player API |
| `vimeo` | Vimeo 影片 ID | 私密 hash（`h=` 參數） | `player.vimeo.com/video/{id}?h={hash}` + player.js |

> 進度追蹤也抽象在 `<LessonPlayer>` 內：YouTube 用 IFrame Player API 的 `onStateChange`/`getCurrentTime`，Vimeo 用 player.js 的 `timeupdate`，對外都吐同一個 `onProgress(positionSec, durationSec)` callback。

---

## 三、資料模型（5 張新表）

```sql
-- 課程
CREATE TABLE IF NOT EXISTS courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  summary     TEXT,
  cover_url   TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 單元（影片）
CREATE TABLE IF NOT EXISTS course_lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order   INT NOT NULL DEFAULT 0,
  title        TEXT NOT NULL,
  video_provider TEXT NOT NULL DEFAULT 'youtube' CHECK (video_provider IN ('youtube','vimeo')),
  video_id     TEXT NOT NULL,
  video_hash   TEXT,                         -- vimeo 私密 hash；youtube 留空
  duration_sec INT,
  is_preview   BOOLEAN NOT NULL DEFAULT false, -- true = 不需訂閱即可試看（招生）
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 課程 ↔ 方案 對應（分級解鎖核心，多對多）
CREATE TABLE IF NOT EXISTS course_plan_access (
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  plan      TEXT NOT NULL CHECK (plan IN ('trial','monthly','annual')),
  PRIMARY KEY (course_id, plan)
);

-- 觀看進度（繼續觀看 / 完課）
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id        UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  last_position_sec INT NOT NULL DEFAULT 0,
  completed_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- 手動 / 批次開通授權（管理員批次匯入用；與訂閱並存的第二個授權來源）
CREATE TABLE IF NOT EXISTS course_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source      TEXT NOT NULL DEFAULT 'manual_import'
              CHECK (source IN ('manual_import','admin_grant','purchase')),
  granted_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- 哪個 admin 開的
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,                  -- NULL = 永久；有值 = 到期失效
  revoked_at  TIMESTAMPTZ,                  -- 管理員撤銷
  UNIQUE (user_id, course_id)               -- 同人同課一列，重複匯入 upsert
);
```

> 用 `course_plan_access` 對應表（而非 `min_tier` 整數），因為「分級」不一定階層式（某課可能只給 monthly 不給 annual）。對應表最有彈性，加方案/加課都不用改 schema。

### RLS 原則
- `courses` / `course_lessons` / `course_plan_access`：已登入者可 `select`（已上架的）；寫入限 admin（service role / role=admin）。
- `lesson_progress`：使用者只能讀寫**自己**的列（`user_id = auth.uid()`）。
- `course_enrollments`：使用者可 `select` 自己的列；新增/修改/撤銷限 admin（批次匯入走 service role）。
- 真正的「能不能看影片」**不靠 RLS、靠後端 gate function**（見第四節），RLS 只是基本資料邊界。

---

## 四、存取判斷（後端單一 gate function）

```
canWatch(user, lesson):
  if lesson.is_preview == true:            return ALLOW   # 任何人（含未訂閱），招生用
  if course.is_published == false:         return DENY    # admin 例外

  # 來源 1：手動 / 批次開通授權
  enr = course_enrollments WHERE user_id = user AND course_id = lesson.course_id
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > now())
  if enr exists:                            return ALLOW

  # 來源 2：訂閱（依方案分級）
  active = subscriptions WHERE user_id = user
             AND status IN ('active','cancelling')          # cancelling 跑到期末仍可看
             AND expires_at > now()
  if active exists AND EXISTS course_plan_access(course_id, active.plan):
                                            return ALLOW

  return DENY
```

> 兩個授權來源**任一通過即可看**：管理員批次開通（`course_enrollments`）與訂閱（`subscriptions` × 方案分級）並存。前者用於線下報名 / 舊學員 / 外部名單，後者用於站上訂閱。

- **前端只顯示狀態（鎖頭 / 試看 / 可播），能不能看一律後端決定**（沿用專案既有原則：前端不決定權限）。
- 播放頁為 server component：gate 通過才把 `<LessonPlayer>`（含影片 id）吐到前端；未通過只回課程資訊 + 升級 CTA + 試看單元。
- 影片串流網址**不在前端硬寫**；MVP 的 YouTube id 雖然前端會出現（無法避免），但非試看單元只在 gate 通過後才 render。

---

## 五、前端頁面

| 路徑 | 內容 |
| --- | --- |
| `/courses` | 課程目錄。未訂閱顯示鎖頭 + 試看入口 + 升級 CTA；已訂閱顯示可看課程 |
| `/courses/[slug]` | 課程詳情：單元列表，`is_preview` 可直接播、其餘鎖住 |
| `/my-courses` | 我的課程：有效訂閱可看的課 + 各課進度 / 繼續觀看 |
| 播放頁（課程詳情內或獨立） | 左側單元列表、右側 `<LessonPlayer>`、進度條；完課打勾 |

### 進度行為
- `<LessonPlayer>` 監聽播放事件（節流 ~15s）→ `POST /api/courses/progress { lessonId, positionSec, durationSec }` → upsert `lesson_progress`。
- 觀看達 **≥ 90%** → 寫 `completed_at`（完課）。
- 重新進入單元 → 讀 `last_position_sec` seek 回上次位置（「繼續觀看」）。

---

## 六、API Routes

| Method | 路徑 | 用途 |
| --- | --- | --- |
| GET | `/api/courses` | 列出已上架課程（含使用者可看狀態） |
| GET | `/api/courses/[slug]` | 課程 + 單元；非試看單元的 `video_id` 僅在 gate 通過時回傳 |
| POST | `/api/courses/progress` | upsert `lesson_progress`（驗證 enrollment + 自己的列） |
| — admin — | | |
| GET/POST/PATCH/DELETE | `/api/admin/courses` | 課程 CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/courses/[id]/lessons` | 單元 CRUD（貼 provider/id/hash、排序、試看） |
| PUT | `/api/admin/courses/[id]/plans` | 設定該課解鎖方案（寫 `course_plan_access`） |
| POST | `/api/admin/enrollments/import` | **批次匯入會員 + 批次開通指定課程**（CSV）；回比對報告 |
| GET | `/api/admin/courses/[id]/enrollments` | 看某課的手動開通名單 |
| DELETE | `/api/admin/enrollments/[id]` | 撤銷某筆手動開通（寫 `revoked_at`） |

---

## 七、後台

- `/admin/courses`：課程 CRUD + 封面 + 上架開關 + 排序。
- 課程內單元管理：新增單元時填 **video_provider（youtube/vimeo）+ video_id + (vimeo) hash**、時長、是否試看、排序。
- 設定該課解鎖方案（trial / monthly / annual 多選）。
- **影片來源切換**＝把單元的 provider 從 `youtube` 改成 `vimeo` 並換 id/hash，存檔即生效，不需改 code。

---

## 八、批次匯入會員與批次開通（管理員）

需求：管理員可**批次匯入名單**並**批次開通指定課程**的觀看權限。涵蓋兩種來源：
- **站上已註冊會員** → 批次開通指定課程
- **外部名單（可能未註冊）** → 建帳號 + 批次開通

### 8.1 匯入工具（單一上傳，兩種比對行為）

admin 進 `/admin/enrollments/import`（或課程內「開通名單」頁）：
1. 選要開通的課程（可多選）。
2. 設定到期日（留空 = 永久）。
3. 上傳 CSV / 貼上 email 清單。
4. 選比對模式：
   - **只比對已註冊**：email 不在 `profiles` 的列入「未建立」報告、不開通。
   - **未註冊就建帳號**：email 不存在 → 建帳號（見 8.3）→ 再開通。
5. 執行 → 回**報告**：開通成功 / 既有更新 / 新建帳號 / 找不到 / 錯誤列。

### 8.2 CSV 格式

必填 `email`；選填 `name`、`phone`。
```
email,name,phone
abc@example.com,王小明,0912345678
def@example.com,李美麗,
```
- 主鍵 = **email**（小寫正規化、去空白）。
- 同 email 已有該課 enrollment → upsert（更新到期日 / 解除 revoked），不重複建列（靠 `UNIQUE(user_id, course_id)`）。冪等，重跑同檔安全。

### 8.3 未註冊者建帳號（預設密碼 + 首登強制改）

- 用 Supabase admin `createUser`（`email_confirm: true`）建帳號；密碼用**該批自訂的預設密碼**（CSV 未帶密碼時）或 CSV 帶的密碼。
- `profiles` 加欄位 `must_change_password BOOLEAN NOT NULL DEFAULT false`，新建者設 `true`。
- **首登強制改密碼**：登入後若 `must_change_password = true` → 全站 layout / middleware 強制導向 `/auth/change-password`，改完清 flag 才放行其他頁。
- 預設密碼由 admin 自行通知學員（**不依賴寄信**）。⚠️ 預設密碼每批可自訂，避免固定值外洩。

### 8.4 一致性與安全

- 整批匯入用 **service role** 後端執行（繞 RLS），但 API 入口先驗 admin 身份。
- 每筆開通寫 `granted_by`（哪個 admin）、`source='manual_import'`。
- 大量匯入**分批處理**（每批 N 筆）+ 逐列結果，避免單次 timeout。
- 撤銷 = 寫 `revoked_at`，不硬刪（保留稽核）。

---

## 九、分階段實作（可 worktree 並行，沿用 Wave 方法）

> 每個 Phase 一條 feature branch / worktree，完成後 PR → merge → push → Vercel auto deploy。新 schema 上 prod 前先 `\d <table>` 確認 prod 無撞名（沿用 5/13 hope_purchase_orders 教訓）。

### Phase 1 — Schema + 後台 + 單一播放頁（YouTube）
- 新增 `supabase/course-system.sql`（**5 張表** + RLS + index）+ `profiles.must_change_password` 欄位，prod 用 Supabase Studio 跑。
- `/admin/courses` CRUD + 單元管理。
- 單一 gated 播放頁，先用 YouTube 嵌入；測試用手動 insert 一筆 `course_enrollments` 或 active subscription 驗 gate。
- **驗收**：admin 建一門課 + YouTube 單元，有授權者登入可看、無授權看不到（非試看）。

### Phase 2 — Gate 接訂閱 + 目錄 + 詳情 + 試看
- gate function 兩個來源（`course_enrollments` + `subscriptions × course_plan_access` 分級解鎖）。
- `/courses` 目錄、`/courses/[slug]` 詳情、`is_preview` 試看可播。
- **驗收**：不同方案（trial/monthly/annual）看到的解鎖課程不同；未訂閱可看試看單元。

### Phase 3 — 批次匯入會員 + 手動開通（管理員）
- `course_enrollments` 寫入路徑 + `/api/admin/enrollments/import`（CSV 解析、email 正規化、upsert）。
- 兩種比對模式（只比對已註冊 / 未註冊就建帳號）+ 建帳號（預設密碼 + `must_change_password=true`）。
- **首登強制改密碼**流程：`/auth/change-password` + layout/middleware 攔截。
- `/admin/enrollments/import` UI + 匯入報告 + 課程開通名單 + 撤銷。
- **驗收**：上傳 CSV（含已註冊 + 未註冊混合）→ 已註冊直接開通、未註冊建帳號 + 開通；新帳號首登被導去改密碼；重跑同檔不重複。

### Phase 4 — 進度追蹤
- `<LessonPlayer>` 抽象層（YouTube IFrame API）+ `/api/courses/progress`。
- 繼續觀看 + 完課（≥90%）+ `/my-courses` 進度顯示。
- **驗收**：看到一半離開再回來會 seek 回上次位置；看完打勾。

### Phase 5 — 切換 Vimeo（驗證 MVP 後）
- Vimeo Pro 上傳影片 + 設網域白名單；`<LessonPlayer>` 加 vimeo 分支（player.js）。
- 後台把現有單元 provider 改 `vimeo` + 填 id/hash。
- **驗收**：原 YouTube 課程改 Vimeo 後照常播放、進度照常記錄；raw Vimeo 連結貼到別站放不出來。

### Phase 6（選配）
- 完課證書、my-courses 體驗打磨、課程搜尋/分類。

---

## 十、依賴與待辦（使用者 action）

- 🔴 **依賴 Wave C 訂閱結帳上線**：訂閱授權來源需有效訂閱（但**手動批次開通不依賴訂閱**，可先用）。課程模組可並行開發。
- 🟡 **MVP 影片**：準備幾支 YouTube（不公開）影片 + videoId，供 Phase 1 測試。
- 🟡 **批次匯入名單**：準備學員 CSV（email 必填、name/phone 選填）+ 決定每批預設密碼，供 Phase 3 測試。
- 🟡 **課程 ↔ 方案規劃**：哪些課給 trial、哪些只給 annual，定一份對照（可上線後在 admin 調）。
- 🟢 **正式切 Vimeo（Phase 5 前）**：申請 Vimeo Pro、上傳、設網域白名單 `hope.huangxi.info`、收集 id/hash。

---

## 十一、未列入 v1（保留未來空間）

- **單課買斷**：目前授權走訂閱 + 手動批次開通。`hope_purchase_orders` 已有泛用訂單欄位，未來要加單課買斷時，可加 `item_type='course' / item_id`，付款 callback 成功後寫 `course_enrollments`（`source='purchase'`），**直接複用既有授權表與 gate function**。
- 逐人 token / DRM（需升級 Vimeo Enterprise 或改 Mux / Cloudflare Stream）。
- 批次開通的學員自助領取（寄信 / magic link）取代預設密碼（需接 email 寄送）。
- 完課證書、測驗、留言討論區。
- 逐人 token / DRM（需升級 Vimeo Enterprise 或改 Mux / Cloudflare Stream）。
- 完課證書、測驗、留言討論區。

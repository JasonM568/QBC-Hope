# HOPE OS — Claude 工作規則

## 專案速覽

- 本機路徑：`/Users/jasonmchen/QBC-Hope`
- GitHub：https://github.com/JasonM568/QBC-Hope
- 正式網址：https://hope.huangxi.info/
- 技術棧：Next.js 14 + Supabase + LINE Bot + Vercel

## 開工流程

每次新對話開始，**先讀 `HANDOFF.md` 最上方那筆紀錄**，了解上次做到哪、有什麼未完成項目，再開始今天的工作。

## 開發驗證流程（重要）

任何系統功能的調整，**一律先在 localhost 驗證、測試**，確認沒問題後，**才能** commit 並推上 Vercel。

- 改完功能先跑 `npm run dev`，在 `http://localhost:3000` 實際操作驗證（必要時跑型別檢查 `npx tsc --noEmit`）。
- **未經 localhost 驗證，不得 commit / push。**
- 確認功能 OK 後，才 commit、push，讓 Vercel 部署。
- 推上去前向使用者確認，不要自作主張直接 push 到正式環境。

## 收工流程（重要）

當使用者說以下任一句子，**必須**把本次 session 的工作紀錄追加到 `HANDOFF.md` 最上方：

- 「收工」「下班」
- 「今天先這樣」「先這樣」「差不多了」
- 「先到這個段落」「告一段落」「告個段落」

### 寫入 HANDOFF.md 的格式

在「Session 紀錄（最新在上）」標題下方、舊紀錄上方，插入：

```markdown
### YYYY-MM-DD — Session: <一句話主題>

**做了什麼**
- <commit / 功能 / 修復 / 設定變更>
- <檔案路徑與重點>

**未完成項 / 待辦**
- <下次要繼續的事，越具體越好>

**系統當前狀態**
- Git branch / 是否與 origin 同步
- Dev server 狀態
- 最近一筆 commit hash + 訊息

**下次開工建議**
- <一兩個具體下一步>

---
```

### 注意事項

- **絕不蓋掉舊紀錄**，只在最上方追加新紀錄
- HANDOFF.md 在 `.gitignore` 內，不會 commit 上 GitHub
- 中途短暫休息（「我去吃個飯」「先喝口水」）不要觸發，要是「結束今天」的語意才寫
- 寫完後告知使用者：「已更新 HANDOFF.md，下次新對話直接讀這份就能接續」

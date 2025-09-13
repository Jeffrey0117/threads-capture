# Threads 捕捉系統測試計劃

此文件記錄測試策略、計劃與結果。使用 Jest 進行單元/整合測試，Cypress 進行端到端測試。隨時更新測試案例與執行結果。

## 測試原則

- **覆蓋率**：目標 80% 以上 (單元測試)。
- **環境**：本地開發 (Next.js dev server)，模擬 Threads 回應 (mock Axios)。
- **工具**：
  - Jest + React Testing Library (單元/UI)。
  - Cypress (E2E)。
  - 手動測試 (瀏覽器 + 社群媒體驗證 meta)。
- **執行頻率**：每次 commit 前運行單元測試，PR 前全測試。

## 單元測試 (Jest)

聚焦 API routes、解析邏輯、短 ID 生成。

- [ ] **API /capture 輸入驗證**：無效 URL 返回錯誤。
- [ ] **抓取邏輯**：Axios GET 成功，mock HTML 回應。
- [ ] **Cheerio 解析**：從 mock Threads HTML 提取正確標題 (e.g., 使用者 + 帖子) 與首行描述 (完整文字，包含 emoji)。
- [ ] **快照生成**：html2canvas 轉換 HTML 片段為圖片 (mock canvas)，驗證尺寸 1200x630px。
- [ ] **短 ID 生成**：產生唯一 base62 ID，無衝突。
- [ ] **資料儲存**：JSON 寫入/讀取正確，包含 id, originalUrl, title, description, image。
- [ ] **Meta 生成**：驗證 OG/Twitter 標籤物件正確 (title, desc, image URL, canonical URL)。

執行：`npm test` (在 /api 目錄)。

## 整合測試 (Jest)

- [ ] **端到端 API 流程**：輸入 URL -> 抓取 -> 解析 -> 儲存 -> 返回短 URL (mock 外部依賴)。
- [ ] **短連結路由**：`/short/[id]` 讀取資料，生成 meta，模擬 redirect。

## UI 測試 (React Testing Library)

- [ ] **主頁表單**：輸入 URL，點擊 Capture 按鈕觸發 API call。
- [ ] **載入狀態**：顯示 spinner，隱藏按鈕。
- [ ] **結果顯示**：短連結出現，可複製 (spy clipboard)。
- [ ] **錯誤處理**：無效輸入顯示訊息。
- [ ] **響應式**：模擬 mobile viewport，驗證輸入/按鈕佈局。

## 端到端測試 (Cypress)

- [ ] **使用者流程**：訪問 `/`，輸入有效 Threads URL，提交，驗證短連結顯示 & 複製。
- [ ] **短連結驗證**：訪問 `/short/id`，檢查 meta 標籤 (title, desc, image src)，確認 redirect 至原 URL (status 301)。
- [ ] **社群分享**：模擬分享，驗證 OG image 載入 (1200x630px)。
- [ ] **錯誤案例**：無效 URL，無 ID 頁面返回 404。
- [ ] **手機測試**：Cypress mobile 模擬，驗證觸控與佈局。

執行：`npx cypress run`。

## 手動測試清單

- [ ] **功能**：輸入真實 Threads URL，生成短連結，訪問驗證 meta (使用 Facebook Debugger 或 Twitter Card Validator)。
- [ ] **效能**：載入時間 < 5s，圖片優化。
- [ ] **邊緣案例**：長描述截斷，無文字文章，私有/刪除帖子。
- [ ] **安全性**：無 XSS (sanitize 描述)，ID 驗證。
- [ ] **相容性**：Chrome, Safari, Firefox；iOS/Android 手機。
- [ ] **部署測試**：Vercel preview，驗證 serverless API。

## 測試結果記錄

- **日期**：YYYY-MM-DD
- **測試類型**：單元/E2E/手動
- **結果**：通過/失敗
- **細節**：錯誤描述、修復 (若失敗)。

初始狀態：所有測試待實施。更新此清單於每次測試後。

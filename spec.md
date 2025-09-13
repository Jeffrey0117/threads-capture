# Threads 文章捕捉與短連結生成系統規格

## 專案概述

此系統旨在捕捉 Threads 文章內容，生成快照圖片與短連結頁面，設定適當的 Open Graph (OG) 與部分 Twitter Card meta 標籤。使用者透過簡單的網頁介面輸入 Threads 文章 URL，即可生成一個短連結。該短連結頁面包含 OG meta 設定，當分享到社群媒體時會顯示自訂標題、描述、縮圖與 URL。使用者點擊短連結後，會自動轉向原 Threads 文章頁面。

系統支援手機裝置，介面簡潔。後端處理爬取、解析與生成，無需第三方短網址服務，使用自建 API 生成。

## 技術堆疊

- **框架**：Node.js with Next.js (全端開發，前端頁面 + API routes)。
- **抓取工具**：Axios (HTTP 請求) + Cheerio (HTML 解析，若內容非動態；若需處理 JS 渲染，可後續升級為 Puppeteer)。
- **快照生成**：html2canvas (Client-side 轉換 HTML 為圖片；若需 server-side，考慮 Puppeteer screenshot)。
- **短網址**：自建，使用 base62 編碼生成短 ID，儲存於 JSON 檔案或 SQLite 資料庫 (映射短 ID 至原 URL、meta 資料)。
- **樣式**：Tailwind CSS (響應式設計)。
- **部署**：Vercel (Next.js 原生支援)。
- **其他**：無外部依賴短網址服務，meta 標籤使用 Next.js Head 組件。

## 系統架構

### 前端

- 主頁 (`/`)：輸入 Threads URL 的表單，提交至 API。
- 短連結頁面 (`/short/[id]`)：動態路由，渲染 OG meta 並 redirect 至原 URL。

### 後端 (API routes)

- `/api/capture`：接收 URL，爬取內容，解析文字，生成快照，儲存資料，返回短連結。
- 資料儲存：使用檔案系統 (e.g., `/data/threads.json`) 或簡單 DB 儲存 { id, originalUrl, title, description, imagePath }。

### 資料流程

1. 使用者輸入 Threads URL 於主頁。
2. 提交 POST 至 `/api/capture`。
3. API 使用 Axios 抓取頁面，Cheerio 解析提取文章標題與首行完整文字 (description)。
4. 生成快照：使用 html2canvas (若 client-side，則在 API 回應後前端生成並上傳；或 server-side 替代)。
5. 生成短 ID (e.g., 隨機 6-8 位 base62)，儲存映射。
6. 返回短連結 (e.g., `${domain}/short/${id}`)。
7. 短連結頁面載入時，讀取資料設定 meta，然後 redirect (使用 Next.js redirect)。

## 使用者介面規格 (UI/UX)

- **設計原則**：簡潔、響應式 (mobile-first，使用 Tailwind CSS)，支援暗黑模式 (可選)。
- **主頁 (`/`) 元素**：
  - 輸入框：單行文字輸入 Threads URL (placeholder: "輸入 Threads 文章連結，例如 https://www.threads.net/@user/post/abc")，驗證 URL 格式。
  - 按鈕：下方 "Capture" 按鈕 (藍色，圓角)，點擊提交。
  - 載入狀態：按鈕點擊後顯示 spinner (旋轉動畫) 或進度條 (e.g., "處理中... 抓取內容")，持續 2-5 秒。
  - 結果顯示：成功後顯示 "已轉換！" 訊息 + 短連結文字 (可點擊複製，使用 navigator.clipboard)，包含複製按鈕 (圖示)。
  - 錯誤處理：無效 URL 顯示紅色錯誤訊息 (e.g., "請輸入有效 Threads 連結")。
- **手機支援**：使用 viewport meta，輸入框全寬，按鈕觸控友好 (至少 44px 高)，無側邊欄。
- **無障礙**：ARIA 標籤於輸入與按鈕，鍵盤導航。

## 後端 API 規格

### `/api/capture` (POST)

- **輸入**：{ url: string } (Threads 文章 URL)。
- **處理步驟**：
  1. 驗證 URL (必須為 threads.net 域名)。
  2. 使用 Axios GET 抓取 HTML。
  3. Cheerio 解析：
     - 標題 (og:title)：從 meta 或文章標頭提取 (e.g., 使用者名稱 + " 的 Threads")。
     - 描述：文章第一行完整文字 (從特定 selector 如 .post-content 第一 p 提取，包含 emoji)。
  4. 生成快照：
     - 使用 html2canvas 轉換提取的文章區塊 HTML 為圖片 (1200x630px)，儲存至 `/public/images/` (e.g., `${id}.png`)。
     - 若 Threads 使用 canvas，需額外處理 (e.g., Puppeteer 截圖整個文章區塊)。
  5. 生成短 ID (使用短 ID 庫或自訂 base62)。
  6. 儲存至資料檔案：{ id, originalUrl: url, title, description, image: `/images/${id}.png` }。
- **輸出**：{ success: true, shortUrl: `${domain}/short/${id}` } 或 { success: false, error: string }。
- **錯誤處理**：抓取失敗 (e.g., 403) 返回錯誤；限速 (e.g., 每分鐘 10 請求)。

### Meta 標籤設定 (於 `/short/[id]`)

- 使用 Next.js `<Head>` 組件：
  - **OG Meta**：
    - `og:title`：提取的標題 (e.g., "Threads 文章標題")。
    - `og:description`：文章首行完整文字 (限 200 字，若過長截斷)。
    - `og:image`：快照圖片 URL (絕對路徑，尺寸 1200x630px，格式 PNG)。
    - `og:url`：短連結 URL (e.g., https://domain/short/id)。
    - `og:type`：article。
  - **Twitter Card Meta**：
    - `twitter:card`：summary_large_image。
    - `twitter:title`：同 og:title。
    - `twitter:description`：同 og:description。
    - `twitter:image`：同 og:image。
- 頁面內容：最小化 HTML (僅 meta + redirect script)，使用 `useRouter` 或 meta refresh redirect 至 originalUrl (延遲 0 秒)。

## 短連結邏輯規格

- **生成**：在 `/api/capture` 中產生唯一短 ID (避免衝突，使用 UUID 截取或計數器 + base62)。
- **儲存**：JSON 檔案 (e.g., data/threads.json 陣列) 或 SQLite (table: threads, columns: id, original_url, title, description, image_path, created_at)。
- **存取**：`/short/[id]` 路由：
  1. 查詢儲存資料 (若無，404)。
  2. 設定 meta 標籤 (如上)。
  3. 立即 redirect (301 永久) 至 original_url。
- **安全性**：驗證 ID 有效性，防止注入；快取 meta (TTL 1 天)。
- **限制**：每短連結有效期 (e.g., 30 天後過期)，追蹤點擊 (可選，記錄於 log)。

## 流程圖

以下為系統主要流程的 Mermaid 流程圖：

```mermaid
flowchart TD
    A[使用者輸入 Threads URL] --> B[提交至 /api/capture]
    B --> C{URL 有效?}
    C -->|否| D[顯示錯誤訊息]
    C -->|是| E[Axios 抓取 HTML]
    E --> F[Cheerio 解析: 提取標題與首行文字]
    F --> G[生成快照圖片 (html2canvas, 1200x630px)]
    G --> H[生成短 ID 並儲存資料]
    H --> I[返回短連結]
    I --> J[顯示短連結並提供複製]
    K[使用者訪問 /short/id] --> L[讀取儲存資料]
    L --> M[設定 OG & Twitter meta]
    M --> N[Redirect 至原 Threads URL]
    D --> J
    style A fill:#e1f5fe
    style K fill:#f3e5f5
```

## 部署與測試

- **環境變數**：NEXT_PUBLIC_DOMAIN (短連結基底)。
- **依賴**：npm install next axios cheerio html2canvas (若 client-side)，或 puppeteer (server-side)。
- **測試**：單元測試 API (Jest)，端到端測試 (Cypress) 驗證 meta 與 redirect。
- **限制**：Threads 可能有反爬蟲，需 User-Agent 模擬瀏覽器；圖片儲存限 1MB。

此規格可作為開發藍圖，若需調整請回饋。

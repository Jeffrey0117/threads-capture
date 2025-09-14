# Threads Capture

一個用於擷取和保存 Threads 文章的工具，提供兩種不同的擷取方式。

## 功能特色

### 1. 截圖模式（原有功能）

- 使用 Puppeteer 瀏覽器自動化
- 生成高品質的文章截圖
- 自動擷取 meta 標籤資訊
- 生成短連結分享

### 2. 純爬蟲模式（新功能）✨

- **不依賴 Puppeteer**，跨平台相容性更好
- 使用 Axios + Cheerio 純爬蟲技術
- 爬取內容包括：
  - 文章文字內容
  - 作者資訊（用戶名、顯示名稱、頭像）
  - 發布時間和互動數據（讚、留言、分享數）
  - 自動下載和保存圖片
- 輸出格式：
  - 結構化 JSON 數據
  - HTML 預覽頁面
  - 下載的圖片檔案

## 技術棧

- **框架**: Next.js 15 + TypeScript
- **UI**: React 19 + Tailwind CSS
- **爬蟲工具**:
  - Puppeteer（截圖模式）
  - Axios + Cheerio（純爬蟲模式）
- **其他**: DOMPurify, nanoid

## 安裝與執行

1. 安裝依賴：

```bash
npm install
```

2. 啟動開發伺服器：

```bash
npm run dev
```

3. 開啟瀏覽器訪問：

- 主頁（截圖模式）: http://localhost:3002
- 純爬蟲測試頁: http://localhost:3002/scrape-test

## API 端點

### `/api/capture` (POST)

原有的截圖擷取 API，使用 Puppeteer 生成文章截圖。

**請求範例：**

```json
{
  "url": "https://www.threads.net/@username/post/xxx"
}
```

### `/api/scrape` (POST)

新的純爬蟲 API，不使用截圖，直接爬取結構化數據。

**請求範例：**

```json
{
  "url": "https://www.threads.net/@username/post/xxx",
  "method": "axios" // 可選，預設為 "axios"
}
```

**回應範例：**

```json
{
  "id": "unique_id",
  "originalUrl": "https://...",
  "author": {
    "username": "user123",
    "displayName": "User Name",
    "avatarUrl": "https://...",
    "verified": false
  },
  "content": {
    "text": "文章內容...",
    "images": ["/scraped-images/xxx.jpg"],
    "links": ["https://..."]
  },
  "metadata": {
    "publishedAt": "2024-01-01T00:00:00Z",
    "likes": 100,
    "replies": 10
  },
  "scrapedAt": "2024-01-01T00:00:00Z",
  "success": true
}
```

### `/api/scrape` (GET)

獲取已爬取的資料列表或特定資料。

**獲取所有資料：**

```
GET /api/scrape
```

**獲取特定資料：**

```
GET /api/scrape?id=unique_id
```

## 資料儲存

- **截圖模式**：

  - 截圖保存在 `public/images/`
  - 資料保存在 `data/threads.json`

- **純爬蟲模式**：
  - 圖片保存在 `public/scraped-images/`
  - JSON 數據保存在 `data/scraped/`
  - HTML 預覽保存在 `data/scraped/`

## 分支說明

### master 分支

主分支，包含原有的截圖功能，使用 Puppeteer 進行網頁自動化和截圖。這是最初的實作方式，提供完整的視覺化擷取。

### feature/pure-scraping 分支

純爬蟲功能分支，使用 Axios + Cheerio 技術實現，不依賴 Puppeteer。提供更輕量化的爬取方案，專注於結構化數據的提取。

### feature/meta-extraction 分支

Meta 標籤提取優化分支，專門處理和優化 Open Graph 和 Twitter Card 等 meta 標籤的擷取，提升分享預覽的準確性和完整性。

## 🚧 開發狀態

> **重要聲明**：本專案目前暫停開發，等待建立自己的後端伺服器和 API 後再繼續。
>
> 目前的實作依賴於直接爬取 Threads 網站，這種方式存在以下限制：
>
> - 依賴網站結構，容易因改版而失效
> - 缺乏穩定的 API 支援
> - 可能面臨速率限制問題
>
> **未來計畫**：
>
> - 建立獨立的後端服務
> - 實作穩定的 API 接口
> - 提供更可靠的數據擷取方案
> - 支援更多社交媒體平台

## 優勢對比

| 特性           | 截圖模式 | 純爬蟲模式   |
| -------------- | -------- | ------------ |
| Puppeteer 依賴 | 需要     | 不需要       |
| 跨平台相容性   | 一般     | 優秀         |
| 效能           | 較慢     | 較快         |
| 視覺呈現       | 完整截圖 | 結構化數據   |
| 資料處理       | 圖片為主 | 可程式化處理 |

## 專案架構

```
threads-capture/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API 路由
│   │   │   ├── capture/  # 截圖 API
│   │   │   └── scrape/   # 爬蟲 API
│   │   └── scrape-test/  # 測試頁面
│   ├── lib/              # 共用函式庫
│   └── types/            # TypeScript 型別定義
├── public/
│   ├── images/           # 截圖儲存
│   └── scraped-images/   # 爬取的圖片
├── data/                 # 資料儲存
│   ├── threads.json      # 截圖模式資料
│   └── scraped/          # 爬蟲模式資料
└── __tests__/            # 測試檔案
```

## 待完成事項（暫停中）

- [ ] 建立後端伺服器架構
- [ ] 設計並實作 RESTful API
- [ ] 整合資料庫系統
- [ ] 實作用戶認證機制
- [ ] 優化爬蟲演算法，提高成功率
- [ ] 添加更多社交媒體平台支援
- [ ] 實作批量爬取功能
- [ ] 添加定時爬取任務
- [ ] 整合資料分析功能

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License

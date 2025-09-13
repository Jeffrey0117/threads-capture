import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

interface ThreadData {
  id: string;
  originalUrl: string;
  title: string;
  description: string;
  image: string;
  createdAt: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "threads.json");

// 確保資料目錄存在
function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 讀取現有資料
function readThreadsData(): ThreadData[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("讀取資料失敗:", error);
    return [];
  }
}

// 儲存資料
function saveThreadsData(data: ThreadData[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("儲存資料失敗:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    // 驗證 URL
    if (
      !url ||
      (!url.includes("threads.net") && !url.includes("threads.com"))
    ) {
      return NextResponse.json(
        { success: false, error: "請提供有效的 Threads URL" },
        { status: 400 }
      );
    }

    // 使用 Puppeteer 抓取動態內容
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let title = "Threads 文章";
    let description = "來自 Threads 的內容";
    let screenshotBuffer = null;
    let renderMethod = "puppeteer_high_quality"; // 預設使用高解析度 Puppeteer

    try {
      const page = await browser.newPage();

      // 設定 User-Agent 和 viewport，使用高解析度
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 2, // 2x 解析度，生成更清晰的圖片
      });

      // 嘗試注入 html2canvas 腳本以獲得更高品質的圖片
      let html2canvasLoaded = false;
      try {
        await page.addScriptTag({
          url: "https://html2canvas.hertzen.com/dist/html2canvas.min.js",
        });
        // 等待一下確保腳本載入
        await new Promise((resolve) => setTimeout(resolve, 1000));
        html2canvasLoaded = true;
      } catch (error) {
        console.log("html2canvas 載入失敗，回退到 Puppeteer 截圖");
        html2canvasLoaded = false;
      }

      // 導航到頁面
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 15000,
      });

      // 等待內容載入
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 提取標題和描述
      const pageData = await page.evaluate(() => {
        // 嘗試多種選擇器來抓取 Threads 內容
        const titleSelectors = [
          'meta[property="og:title"]',
          "title",
          '[data-testid="post-header"]',
          ".post-header",
          "h1",
        ];

        const descriptionSelectors = [
          'meta[property="og:description"]',
          'meta[name="description"]',
          '[data-testid="post-content"]',
          ".post-content",
          '[role="article"] div[dir="auto"]',
          'article div[dir="auto"]',
        ];

        let title = "Threads 文章";
        let description = "來自 Threads 的內容";

        // 提取標題
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element.tagName === "META") {
              title = element.getAttribute("content") || title;
            } else {
              title = element.textContent?.trim() || title;
            }
            if (title !== "Threads 文章") break;
          }
        }

        // 提取描述
        for (const selector of descriptionSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element.tagName === "META") {
              description = element.getAttribute("content") || description;
            } else {
              description = element.textContent?.trim() || description;
            }
            if (
              description !== "來自 Threads 的內容" &&
              description.length > 10
            )
              break;
          }
        }

        return { title, description };
      });

      title = pageData.title;
      description = pageData.description;

      // Sanitize 描述防 XSS
      const window = new JSDOM("").window;
      const DOMPurifyInstance = DOMPurify(window);
      description = DOMPurifyInstance.sanitize(description, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });

      // 截斷描述如果太長
      if (description.length > 200) {
        description = description.substring(0, 197) + "...";
      }

      // 生成截圖：優先使用 html2canvas，失敗時回退到 Puppeteer
      if (html2canvasLoaded) {
        try {
          // 使用 html2canvas 生成高品質圖片
          const canvasDataUrl = await page.evaluate(() => {
            return new Promise<string>((resolve, reject) => {
              // 嘗試多種選擇器來找到文章內容區塊
              const articleSelectors = [
                // 用戶提到的 class
                '[class*="x1n2onr6"]',
                '[class*="x1f9n5g"]',
                '[class*="x17dsfyh"]',
                // 常見的 Threads 文章選擇器
                '[data-testid="post-container"]',
                '[data-testid="post-content"]',
                "article",
                '[role="article"]',
                // 通用內容區塊
                ".post-content",
                ".thread-content",
                ".article-content",
                // 根據結構猜測
                'div[dir="auto"]',
                "div[lang]",
              ];

              let targetElement: Element | null = null;

              // 找到目標元素
              for (const selector of articleSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                  const rect = element.getBoundingClientRect();
                  // 確保元素有足夠的內容和尺寸
                  if (rect.width > 200 && rect.height > 100) {
                    targetElement = element;
                    break;
                  }
                }
              }

              if (!targetElement) {
                // 如果找不到，回退到使用 html2canvas 截取整個可視區域
                const html2canvas = (window as any).html2canvas;
                if (html2canvas) {
                  html2canvas(document.body, {
                    width: 1200,
                    height: 630,
                    scale: 2, // 2倍解析度，生成更清晰的圖片
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: "#ffffff",
                    logging: false,
                  })
                    .then((canvas: HTMLCanvasElement) => {
                      resolve(canvas.toDataURL("image/png", 1.0));
                    })
                    .catch(reject);
                } else {
                  reject(new Error("html2canvas not available"));
                }
                return;
              }

              // 使用 html2canvas 生成高品質圖片
              const html2canvas = (window as any).html2canvas;
              if (html2canvas) {
                // 創建一個臨時容器來隔離元素
                const tempContainer = document.createElement("div");
                tempContainer.style.position = "absolute";
                tempContainer.style.left = "-9999px";
                tempContainer.style.top = "-9999px";
                tempContainer.style.width = "1200px";
                tempContainer.style.maxWidth = "1200px";
                tempContainer.style.backgroundColor = "#ffffff";
                tempContainer.style.padding = "20px";
                tempContainer.style.boxSizing = "border-box";

                // 複製目標元素
                const clonedElement = targetElement.cloneNode(true) as Element;
                tempContainer.appendChild(clonedElement);
                document.body.appendChild(tempContainer);

                html2canvas(tempContainer, {
                  width: 1200,
                  height: 630,
                  scale: 2, // 2倍解析度，生成更清晰的圖片
                  useCORS: true,
                  allowTaint: false,
                  backgroundColor: "#ffffff",
                  logging: false,
                })
                  .then((canvas: HTMLCanvasElement) => {
                    // 清理臨時元素
                    document.body.removeChild(tempContainer);
                    // 返回高品質 PNG
                    resolve(canvas.toDataURL("image/png", 1.0));
                  })
                  .catch((error: any) => {
                    // 清理臨時元素
                    if (document.body.contains(tempContainer)) {
                      document.body.removeChild(tempContainer);
                    }
                    reject(error);
                  });
              } else {
                reject(new Error("html2canvas not available"));
              }
            });
          });

          // 將 base64 轉換為 buffer
          const base64Data = canvasDataUrl.replace(
            /^data:image\/png;base64,/,
            ""
          );
          screenshotBuffer = Buffer.from(base64Data, "base64");

          console.log(
            `使用 html2canvas 生成高品質圖片，尺寸: 1200x630 (2x 解析度)`
          );
          renderMethod = "html2canvas_high_quality";
        } catch (error) {
          console.log("html2canvas 生成失敗，回退到 Puppeteer 截圖:", error);
          html2canvasLoaded = false;
        }
      }

      // 如果 html2canvas 不可用或失敗，使用 Puppeteer 截圖
      if (!html2canvasLoaded || !screenshotBuffer) {
        // 找到文章內容區塊並生成精準截圖
        const articleData = await page.evaluate(() => {
          // 嘗試多種選擇器來找到文章內容區塊
          const articleSelectors = [
            // 用戶提到的 class
            '[class*="x1n2onr6"]',
            '[class*="x1f9n5g"]',
            '[class*="x17dsfyh"]',
            // 常見的 Threads 文章選擇器
            '[data-testid="post-container"]',
            '[data-testid="post-content"]',
            "article",
            '[role="article"]',
            // 通用內容區塊
            ".post-content",
            ".thread-content",
            ".article-content",
            // 根據結構猜測
            'div[dir="auto"]',
            "div[lang]",
          ];

          for (const selector of articleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const rect = element.getBoundingClientRect();
              // 確保元素有足夠的內容和尺寸
              if (rect.width > 200 && rect.height > 100) {
                return {
                  x: rect.left,
                  y: rect.top,
                  width: Math.min(rect.width, 1200), // 限制最大寬度
                  height: Math.min(rect.height, 630), // 限制最大高度
                  found: true,
                };
              }
            }
          }

          // 如果找不到特定區塊，回退到全頁截圖
          return {
            x: 0,
            y: 0,
            width: 1200,
            height: 630,
            found: false,
          };
        });

        // 生成高品質截圖 - 確保足夠大的尺寸
        const minWidth = 1000; // 提高最小寬度
        const minHeight = 500; // 提高最小高度
        const maxWidth = 1200;
        const maxHeight = 630;

        let clipRegion = {
          x: Math.max(0, articleData.x),
          y: Math.max(0, articleData.y),
          width: articleData.width,
          height: articleData.height,
        };

        // 如果內容區塊太小，截取更大的區域
        if (articleData.width < minWidth || articleData.height < minHeight) {
          // 擴展到更大的區域，確保至少 1000x500
          clipRegion = {
            x: Math.max(0, articleData.x - 100), // 更多左邊距
            y: Math.max(0, articleData.y - 50), // 更多上邊距
            width: Math.min(
              maxWidth,
              Math.max(minWidth, articleData.width + 200)
            ), // 更多右邊距
            height: Math.min(
              maxHeight,
              Math.max(minHeight, articleData.height + 100)
            ), // 更多下邊距
          };
        }

        screenshotBuffer = await page.screenshot({
          type: "png",
          clip: clipRegion,
        });

        console.log(
          `使用 Puppeteer 高品質截圖 (2x 解析度): ${
            articleData.found ? "文章內容區塊" : "全頁回退"
          }, 原始尺寸: ${articleData.width}x${
            articleData.height
          }, 最終截圖尺寸: ${clipRegion.width}x${clipRegion.height}`
        );
      }
    } finally {
      await browser.close();
    }

    // 生成短 ID
    const id = nanoid(8);

    // 儲存截圖到檔案
    let imagePath = `/images/${id}.png`;
    let hasScreenshot = false;

    if (screenshotBuffer) {
      try {
        // 確保 images 目錄存在
        const imagesDir = path.join(process.cwd(), "public", "images");
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        // 儲存截圖
        const imageFilePath = path.join(imagesDir, `${id}.png`);
        fs.writeFileSync(imageFilePath, screenshotBuffer);
        hasScreenshot = true;
        console.log(`截圖已儲存: ${imageFilePath}`);
      } catch (error) {
        console.error("儲存截圖失敗:", error);
        // 如果截圖儲存失敗，仍然繼續處理
      }
    }

    // 創建資料記錄
    const threadData: ThreadData = {
      id,
      originalUrl: url,
      title,
      description,
      image: imagePath,
      createdAt: new Date().toISOString(),
    };

    // 儲存到資料檔案
    const existingData = readThreadsData();
    existingData.push(threadData);
    saveThreadsData(existingData);

    // 返回短連結 - 動態獲取當前域名
    const host = request.headers.get("host") || "localhost:3002";
    const protocol = host.includes("localhost") ? "http" : "https";
    const domain = `${protocol}://${host}`;
    const shortUrl = `${domain}/short/${id}`;

    return NextResponse.json({
      success: true,
      shortUrl,
      title,
      description,
      hasScreenshot,
      renderMethod,
    });
  } catch (error) {
    console.error("處理失敗:", error);

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { success: false, error: "無法抓取 Threads 內容，請檢查連結是否正確" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "請提供 URL" },
        { status: 400 }
      );
    }

    // 使用 axios 從伺服器端抓取頁面，避免 CORS 問題
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
      maxRedirects: 5, // 允許重定向
    });

    const $ = cheerio.load(response.data);

    // 提取所有相關的 meta 標籤
    const metaTags = {
      title: $("title").text() || "未找到標題",
      description:
        $('meta[name="description"]').attr("content") || "未找到描述",
      ogTitle:
        $('meta[property="og:title"]').attr("content") || "未找到 OG 標題",
      ogDescription:
        $('meta[property="og:description"]').attr("content") ||
        "未找到 OG 描述",
      ogImage:
        $('meta[property="og:image"]').attr("content") || "未找到 OG 圖片",
      ogUrl: $('meta[property="og:url"]').attr("content") || "未找到 OG URL",
      ogType: $('meta[property="og:type"]').attr("content") || "未找到 OG 類型",
      twitterCard:
        $('meta[name="twitter:card"]').attr("content") || "未找到 Twitter Card",
      twitterTitle:
        $('meta[name="twitter:title"]').attr("content") ||
        "未找到 Twitter 標題",
      twitterDescription:
        $('meta[name="twitter:description"]').attr("content") ||
        "未找到 Twitter 描述",
      twitterImage:
        $('meta[name="twitter:image"]').attr("content") ||
        "未找到 Twitter 圖片",
    };

    // 檢查圖片是否存在
    let imageStatus = "未檢查";
    if (metaTags.ogImage && metaTags.ogImage !== "未找到 OG 圖片") {
      try {
        const imageResponse = await axios.head(metaTags.ogImage, {
          timeout: 5000,
        });
        imageStatus = imageResponse.status === 200 ? "存在" : "不存在";
      } catch (error) {
        imageStatus = "不存在";
      }
    }

    return NextResponse.json({
      success: true,
      url: response.request.res.responseUrl || url, // 最終 URL（處理重定向）
      metaTags,
      imageStatus,
      statusCode: response.status,
    });
  } catch (error) {
    console.error("Meta 檢查失敗:", error);

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: `無法抓取頁面: ${error.message}`,
          statusCode: error.response?.status || 0,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}

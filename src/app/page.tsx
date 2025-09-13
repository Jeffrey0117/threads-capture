"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    step: number;
    message: string;
    percentage: number;
  } | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    shortUrl?: string;
    error?: string;
    renderMethod?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.includes("threads.net") && !url.includes("threads.com")) {
      setResult({ success: false, error: "請輸入有效的 Threads 連結" });
      return;
    }

    setLoading(true);
    setResult(null);
    setProgress(null); // 先清除之前的進度
    setTimeout(
      () => setProgress({ step: 1, message: "驗證連結...", percentage: 10 }),
      100
    );

    try {
      // 模擬進度更新
      setTimeout(
        () =>
          setProgress({ step: 2, message: "啟動瀏覽器...", percentage: 25 }),
        200
      );
      setTimeout(
        () =>
          setProgress({
            step: 3,
            message: "載入 Threads 頁面...",
            percentage: 40,
          }),
        600
      );
      setTimeout(
        () =>
          setProgress({ step: 4, message: "提取文章內容...", percentage: 60 }),
        1200
      );
      setTimeout(
        () =>
          setProgress({ step: 5, message: "生成預覽圖片...", percentage: 80 }),
        1800
      );

      const response = await fetch("/api/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      setProgress({ step: 6, message: "完成！", percentage: 100 });

      // 延遲一下顯示完成狀態，然後顯示結果
      setTimeout(() => {
        setResult(data);
        setProgress(null);
      }, 500);
    } catch (error) {
      setResult({ success: false, error: "處理失敗，請稍後再試" });
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("已複製到剪貼簿！");
    } catch (err) {
      console.error("複製失敗:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Threads Capture
          </h1>
          <p className="text-gray-600">將 Threads 文章轉換為短連結</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Threads 文章連結
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.threads.net/@user/post/abc"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center min-h-[48px]"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                處理中...
              </div>
            ) : (
              "Capture"
            )}
          </button>

          {progress && (
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {progress.step}/6: {progress.message}
              </p>
            </div>
          )}
        </form>

        {result && (
          <div className="mt-6">
            {result.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-semibold mb-2">已轉換！</h3>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={result.shortUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(result.shortUrl!)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors"
                  >
                    複製
                  </button>
                </div>
                {result.renderMethod && (
                  <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    渲染方法:{" "}
                    {result.renderMethod === "html2canvas_high_quality"
                      ? "HTML2Canvas 高品質"
                      : result.renderMethod === "puppeteer_high_quality"
                      ? "Puppeteer 高品質 (2x)"
                      : "標準品質"}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

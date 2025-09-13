import { POST } from "../../src/app/api/capture/route";
import fs from "fs";
import path from "path";

// Mock 外部依賴
jest.mock("puppeteer", () => ({
  launch: jest.fn(),
}));

jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "testid12"),
}));

jest.mock("fs");
jest.mock("path");
jest.mock("dompurify", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    sanitize: jest.fn((text) => text),
  })),
}));
jest.mock("jsdom", () => ({
  JSDOM: jest.fn(() => ({
    window: {},
  })),
}));

describe("/api/capture", () => {
  let mockPuppeteer: any;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 設定 Puppeteer mock
    mockPage = {
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      goto: jest.fn(),
      evaluate: jest.fn(),
      screenshot: jest.fn(),
      close: jest.fn(),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    mockPuppeteer = {
      launch: jest.fn().mockResolvedValue(mockBrowser),
    };

    require("puppeteer").launch = mockPuppeteer.launch;

    // Mock fs 和 path
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.readFileSync as jest.Mock).mockReturnValue("[]");
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    (path.dirname as jest.Mock).mockReturnValue("data");
  });

  describe("輸入驗證", () => {
    it("應拒絕無效的 URL", async () => {
      const request = {
        json: jest.fn().mockResolvedValue({ url: "invalid-url" }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain("有效的 Threads URL");
    });

    it("應拒絕空的 URL", async () => {
      const request = {
        json: jest.fn().mockResolvedValue({ url: "" }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it("應接受有效的 threads.net URL", async () => {
      mockPage.evaluate.mockResolvedValue({
        title: "測試標題",
        description: "測試描述",
      });
      mockPage.screenshot.mockResolvedValue(Buffer.from("fake-image"));

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.net/@user/post/123",
        }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });

    it("應接受有效的 threads.com URL", async () => {
      mockPage.evaluate.mockResolvedValue({
        title: "測試標題",
        description: "測試描述",
      });
      mockPage.screenshot.mockResolvedValue(Buffer.from("fake-image"));

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.com/@user/post/123",
        }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });

  describe("內容抓取與解析", () => {
    it("應正確提取標題和描述", async () => {
      const mockTitle = "Threads 用戶名稱";
      const mockDescription = "這是文章內容，包含 emoji 😀";

      mockPage.evaluate.mockResolvedValue({
        title: mockTitle,
        description: mockDescription,
      });
      mockPage.screenshot.mockResolvedValue(Buffer.from("fake-image"));

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.net/@user/post/123",
        }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.title).toBe(mockTitle);
      expect(result.description).toBe(mockDescription);
    });

    it("應截斷過長的描述", async () => {
      const longDescription = "a".repeat(250);

      mockPage.evaluate.mockResolvedValue({
        title: "測試標題",
        description: longDescription,
      });
      mockPage.screenshot.mockResolvedValue(Buffer.from("fake-image"));

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.net/@user/post/123",
        }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(result.description.length).toBeLessThanOrEqual(200);
      expect(result.description).toMatch(/\.\.\.$/);
    });

    it("應處理抓取失敗", async () => {
      mockPage.goto.mockRejectedValue(new Error("Network error"));

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.net/@user/post/123",
        }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toContain("伺服器錯誤");
    });
  });

  describe("資料儲存", () => {
    it("應儲存有效的資料結構", async () => {
      mockPage.evaluate.mockResolvedValue({
        title: "測試標題",
        description: "測試描述",
      });
      mockPage.screenshot.mockResolvedValue(Buffer.from("fake-image"));

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.net/@user/post/123",
        }),
      } as any;

      await POST(request);

      expect(fs.writeFileSync).toHaveBeenCalled();
      // 找到寫入 JSON 資料的調用（不是圖片）
      const jsonWriteCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
        (call) => typeof call[1] === "string" && call[1].startsWith("[")
      );
      expect(jsonWriteCall).toBeDefined();
      const savedData = JSON.parse(jsonWriteCall![1]);

      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toHaveProperty("id");
      expect(savedData[0]).toHaveProperty("originalUrl");
      expect(savedData[0]).toHaveProperty("title");
      expect(savedData[0]).toHaveProperty("description");
      expect(savedData[0]).toHaveProperty("image");
      expect(savedData[0]).toHaveProperty("createdAt");
    });

    it("應返回正確的短連結", async () => {
      mockPage.evaluate.mockResolvedValue({
        title: "測試標題",
        description: "測試描述",
      });
      mockPage.screenshot.mockResolvedValue(Buffer.from("fake-image"));

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.net/@user/post/123",
        }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(result.shortUrl).toMatch(
        /^http:\/\/localhost:3002\/short\/[a-zA-Z0-9_-]{8}$/
      );
    });
  });

  describe("快照生成", () => {
    it("應生成並儲存截圖", async () => {
      const mockScreenshot = Buffer.from("fake-screenshot-data");

      mockPage.evaluate.mockResolvedValue({
        title: "測試標題",
        description: "測試描述",
      });
      mockPage.screenshot.mockResolvedValue(mockScreenshot);

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.net/@user/post/123",
        }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: "png",
        clip: {
          x: 0,
          y: 0,
          width: 1200,
          height: 630,
        },
      });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".png"),
        mockScreenshot
      );

      expect(result.hasScreenshot).toBe(true);
    });

    it("應處理截圖失敗", async () => {
      mockPage.evaluate.mockResolvedValue({
        title: "測試標題",
        description: "測試描述",
      });
      mockPage.screenshot.mockRejectedValue(new Error("Screenshot failed"));

      const request = {
        json: jest.fn().mockResolvedValue({
          url: "https://www.threads.net/@user/post/123",
        }),
      } as any;

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500); // 截圖失敗會導致整個操作失敗
      expect(result.success).toBe(false);
    });
  });
});

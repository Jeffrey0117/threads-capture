import { Metadata } from "next";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";

interface ThreadData {
  id: string;
  originalUrl: string;
  title: string;
  description: string;
  image: string;
  createdAt: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "threads.json");

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

function findThreadById(id: string): ThreadData | null {
  const threads = readThreadsData();
  return threads.find((thread) => thread.id === id) || null;
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const thread = findThreadById(id);

  if (!thread) {
    return {
      title: "找不到頁面",
      description: "此短連結不存在或已過期",
    };
  }

  const domain = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";
  const imageUrl = `${domain}${thread.image}`;
  const shortUrl = `${domain}/short/${thread.id}`;

  return {
    title: thread.title,
    description: thread.description,
    openGraph: {
      title: thread.title,
      description: thread.description,
      url: shortUrl,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: thread.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: thread.title,
      description: thread.description,
      images: [imageUrl],
    },
  };
}

export default async function ShortLinkPage({ params }: Props) {
  const { id } = await params;
  const thread = findThreadById(id);

  if (!thread) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">找不到頁面</h1>
          <p className="text-gray-600">此短連結不存在或已過期</p>
        </div>
      </div>
    );
  }

  // 使用 HTML meta refresh 進行延遲重定向，讓社群媒體爬蟲有時間讀取 Meta 標籤
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="refresh" content={`2;url=${thread.originalUrl}`} />
        <title>{thread.title}</title>
        <meta name="description" content={thread.description} />
        <meta property="og:title" content={thread.title} />
        <meta property="og:description" content={thread.description} />
        <meta
          property="og:image"
          content={`${
            process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3002"
          }${thread.image}`}
        />
        <meta
          property="og:url"
          content={`${
            process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3002"
          }/short/${thread.id}`}
        />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={thread.title} />
        <meta name="twitter:description" content={thread.description} />
        <meta
          name="twitter:image"
          content={`${
            process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3002"
          }${thread.image}`}
        />
      </head>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "Arial, sans-serif",
            backgroundColor: "#f3f4f6",
          }}
        >
          <h1 style={{ color: "#1f2937", marginBottom: "1rem" }}>
            {thread.title}
          </h1>
          <p
            style={{ color: "#6b7280", textAlign: "center", maxWidth: "600px" }}
          >
            {thread.description}
          </p>
          <p style={{ color: "#9ca3af", marginTop: "2rem" }}>
            正在跳轉到原始內容...
          </p>
          <a
            href={thread.originalUrl}
            style={{
              color: "#3b82f6",
              textDecoration: "underline",
              marginTop: "1rem",
            }}
          >
            如果沒有自動跳轉，請點擊這裡
          </a>
        </div>
      </body>
    </html>
  );
}

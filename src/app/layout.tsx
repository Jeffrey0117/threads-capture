import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Threads Capture",
  description: "Capture Threads posts and generate short links with OG meta",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}

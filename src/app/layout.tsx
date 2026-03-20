import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOPE 人生作業系統",
  description: "HOPE 人生作業系統 2.0 線上平台 — 打造你的人生引擎",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}

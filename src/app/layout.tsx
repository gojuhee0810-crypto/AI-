import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 광고 소재 만들기",
  description: "AI 배너 자동 생성 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Design Ref: Figma 실측 — 본문·타이틀 모두 Pretendard.
            이전엔 Geist(라틴 전용)라 한글이 시스템 폰트로 폴백돼 실제 광고센터와
            다르게 보였다. 별도 패키지 추가 없이 공식 CDN을 쓴다. */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

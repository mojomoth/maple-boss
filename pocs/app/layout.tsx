import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// On <html>, so tokens.css can read --font-noto at :root. Noto Sans KR is the gothic the operator's drafts are set in.
const noto = Noto_Sans_KR({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-noto", display: "swap" });

// Each screen sets its own title; the template adds the app name after it.
export const metadata: Metadata = {
  title: { default: "Maple Boss", template: "%s · Maple Boss" },
  description: "등록한 캐릭터의 maplescouter 배율로 보스별 파티 조합을 찾아요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={noto.variable}>
      <body>{children}</body>
    </html>
  );
}

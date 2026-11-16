import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

// On <html>, so tokens.css can read --font-plex at :root.
const plex = IBM_Plex_Sans_KR({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = {
  title: "Maple Boss PoC",
  description: "캐릭터, 보스, 파티 PoC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={plex.variable}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";

// The page is a client component, which cannot export metadata; this layout names the screen for it.
export const metadata: Metadata = { title: "캐릭터 가져오기", description: "maplescouter에서 보낸 캐릭터를 저장해요." };

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return children;
}

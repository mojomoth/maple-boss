import type { Metadata } from "next";

// The page is a client component, which cannot export metadata; this layout names the screen for it.
export const metadata: Metadata = { title: "캐릭터 등록", description: "닉네임으로 캐릭터를 등록하고 보스별 배율을 봐요." };

export default function CharacterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

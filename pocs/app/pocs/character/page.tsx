import type { Metadata } from "next";
import { dbInfo } from "@/lib/db";
import CharacterScreen from "./CharacterScreen";

export const metadata: Metadata = { title: "캐릭터 등록", description: "닉네임으로 캐릭터를 등록하고 보스별 배율을 봐요." };

// Still prerendered: the server adds only whether the storage keeps what it saves (fixed per deployment).
export default function CharacterPage() {
  return <CharacterScreen persistent={dbInfo.persistent} />;
}

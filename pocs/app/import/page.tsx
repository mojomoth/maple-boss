import type { Metadata } from "next";
import { dbInfo } from "@/lib/db";
import ImportScreen from "./ImportScreen";

export const metadata: Metadata = { title: "캐릭터 가져오기", description: "maplescouter에서 보낸 캐릭터를 저장해요." };

// Still prerendered: the server adds only whether the storage keeps what it saves (fixed per deployment).
export default function ImportPage() {
  return <ImportScreen persistent={dbInfo.persistent} />;
}

import { formParty, listParties, PartyError } from "@/party";
import { notAllowed } from "@/lib/http";

export async function GET() {
  try {
    return Response.json(await listParties());
  } catch (e) {
    console.error("GET /api/party:", e);
    return Response.json({ error: "파티 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

// body: { bossId, members: string[] } -> 201 { id, sum, clearable }
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!Array.isArray(b?.members) || !b.members.every((m: unknown) => typeof m === "string"))
      throw new PartyError("members에 캐릭터 이름 배열을 넣어 주세요.");
    return Response.json(await formParty(String(b.bossId), b.members), { status: 201 });
  } catch (e) {
    if (e instanceof PartyError) return Response.json({ error: e.message }, { status: 400 });
    console.error("POST /api/party:", e);
    return Response.json({ error: "파티를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

const no = notAllowed("GET, POST");
export { no as PUT, no as PATCH, no as DELETE };

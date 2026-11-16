import { formParty, listParties, PartyError } from "@/party";

export async function GET() {
  try {
    return Response.json(await listParties());
  } catch (e) {
    console.error("GET /api/party:", e);
    return Response.json({ error: "파티 목록을 불러오지 못했어요." }, { status: 500 });
  }
}

// body: { bossId, members: string[] } -> 201 { id, sum, clearable }
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!Array.isArray(b?.members)) throw new PartyError("members 배열이 필요해요.");
    return Response.json(await formParty(String(b.bossId), b.members.map(String)), { status: 201 });
  } catch (e) {
    if (e instanceof PartyError) return Response.json({ error: e.message }, { status: 400 });
    console.error("POST /api/party:", e);
    return Response.json({ error: "파티를 저장하지 못했어요." }, { status: 500 });
  }
}

import { createRequest, listSeekers, PartyError } from "@/party";
import { notAllowed, readSmallJson, TOO_LARGE, tooLarge } from "@/lib/http";

// GET ?bossId= (optional) -> open requests as Seeker[]
export async function GET(req: Request) {
  try {
    return Response.json(await listSeekers(new URL(req.url).searchParams.get("bossId") || undefined));
  } catch (e) {
    console.error("GET /api/party/requests:", e);
    return Response.json({ error: "구직 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

// body: { characterName, bossId, partySize } -> 201. partySize goes through as sent: createRequest takes integers only.
export async function POST(req: Request) {
  try {
    const b = await readSmallJson(req);
    if (b === TOO_LARGE) return tooLarge("요청이 너무 커요.");
    if (!b || typeof b !== "object") throw new PartyError("요청 본문이 JSON 객체가 아니에요.");
    const { characterName, bossId, partySize } = b as Record<string, unknown>;
    await createRequest(String(characterName), String(bossId), partySize);
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof PartyError) return Response.json({ error: e.message }, { status: 400 });
    console.error("POST /api/party/requests:", e);
    return Response.json({ error: "구직을 등록하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

const no = notAllowed("GET, POST");
export { no as PUT, no as PATCH, no as DELETE };

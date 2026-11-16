import { createRequest, listSeekers } from "@/party";

export function GET(req: Request) {
  return Response.json(listSeekers(new URL(req.url).searchParams.get("bossId") ?? undefined));
}

// body: { characterName, bossId, partySize }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    createRequest(String(b.characterName), String(b.bossId), Number(b.partySize));
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

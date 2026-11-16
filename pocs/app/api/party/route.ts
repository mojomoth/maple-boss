import { formParty, listParties } from "@/party";

export function GET() {
  return Response.json(listParties());
}

// body: { bossId, members: string[] }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!Array.isArray(b.members)) throw new Error("members 배열이 필요합니다.");
    return Response.json(formParty(String(b.bossId), b.members.map(String)), { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

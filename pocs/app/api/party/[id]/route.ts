import { deleteParty } from "@/party";
import { notAllowed } from "@/lib/http";

// DELETE /api/party/12 -> 204 | 404. Lets `npm run smoke` remove the party it formed.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!/^[1-9]\d{0,9}$/.test(raw) || id > 2_147_483_647) return Response.json({ error: "없는 파티예요." }, { status: 404 }); // SERIAL range
  try {
    if (await deleteParty(id)) return new Response(null, { status: 204 });
    return Response.json({ error: "없는 파티예요." }, { status: 404 });
  } catch (e) {
    console.error("DELETE /api/party/[id]:", e);
    return Response.json({ error: "파티를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

const no = notAllowed("DELETE");
export { no as GET, no as POST, no as PUT, no as PATCH };

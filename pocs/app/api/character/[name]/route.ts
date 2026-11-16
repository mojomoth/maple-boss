import { deleteCharacter } from "@/character";

export const runtime = "nodejs";

// DELETE /api/character/%EA%B3%A0%EB%94%A9 -> 204 | 404
export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params; // already decoded by Next
    if (await deleteCharacter(name)) return new Response(null, { status: 204 });
    return Response.json({ error: "등록되지 않은 캐릭터예요." }, { status: 404 });
  } catch (e) {
    console.error("DELETE /api/character/[name]:", e);
    return Response.json({ error: "캐릭터를 삭제하지 못했어요." }, { status: 500 });
  }
}

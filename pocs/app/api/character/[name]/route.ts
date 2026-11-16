import { deleteCharacter } from "@/character";

export const runtime = "nodejs";

// DELETE /api/character/%EA%B3%A0%EB%94%A9 -> 204 | 404
export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params; // already decoded by Next
  return deleteCharacter(name) ? new Response(null, { status: 204 }) : Response.json({ error: "등록되지 않은 캐릭터입니다." }, { status: 404 });
}

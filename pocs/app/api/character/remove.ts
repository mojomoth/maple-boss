import { deleteCharacter } from "@/character";

// DELETE /api/character/<name> -> 204 | 404. A static sibling of [name] (import/, rates/) wins the URL, so each of
// them answers DELETE with this for its own name too. Without that, a character named 'import' or 'rates' could be
// imported but never deleted (FN-3). A new sibling route needs the same one-line DELETE.
export async function removeCharacter(name: string) {
  try {
    if (await deleteCharacter(name)) return new Response(null, { status: 204 });
    return Response.json({ error: "등록되지 않은 캐릭터예요." }, { status: 404 });
  } catch (e) {
    console.error("DELETE /api/character/[name]:", e);
    return Response.json({ error: "캐릭터를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

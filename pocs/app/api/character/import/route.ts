import { upsertCharacter } from "@/character";
import { ParseError, parseCharacter } from "@/character/parse";
import { notAllowed, readText, tooLarge } from "@/lib/http";
import { removeCharacter } from "../remove";

const MAX_BYTES = 1_000_000; // a whole maplescouter character-store is ~250 KB, the bookmarklet's payload ~11 KB

// POST body: the maplescouter 'character-store' value (whole, `state`, `searchResult`) or the bookmarklet's
// trimmed payload. -> 201 Character | 400 | 413
export async function POST(req: Request) {
  try {
    const text = await readText(req, MAX_BYTES);
    if (text === null)
      return tooLarge("데이터가 너무 커요(최대 1MB). maplescouter 캐릭터 데이터만 보내 주세요.");
    if (!text.trim()) return Response.json({ error: "가져올 데이터가 없어요." }, { status: 400 });
    const { character, payload } = parseCharacter(text);
    await upsertCharacter(character, payload);
    return Response.json(character, { status: 201 });
  } catch (e) {
    if (e instanceof ParseError) return Response.json({ error: e.message }, { status: 400 });
    console.error("POST /api/character/import:", e);
    return Response.json({ error: "캐릭터를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

const no = notAllowed("POST, DELETE");
export { no as GET, no as PUT, no as PATCH };

// DELETE /api/character/import is the character named 'import' (see ../remove.ts).
export const DELETE = () => removeCharacter("import");

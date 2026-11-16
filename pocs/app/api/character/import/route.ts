import { upsertCharacter } from "@/character";
import { ParseError, parseCharacter } from "@/character/parse";

export const runtime = "nodejs";

const MAX_BYTES = 1_000_000; // a whole maplescouter character-store is ~250 KB, the bookmarklet's payload ~11 KB

// The body as text, or null once it passes max bytes. Reads the stream itself, so a body without (or with a
// false) content-length is cut off at the limit instead of being buffered whole.
async function readText(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get("content-length")) > max) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// POST body: the maplescouter 'character-store' value (whole, `state`, `searchResult`) or the bookmarklet's
// trimmed payload. -> 201 Character | 400 | 413
export async function POST(req: Request) {
  try {
    const text = await readText(req, MAX_BYTES);
    if (text === null)
      // The rest of the body is never read, so the connection cannot carry another request: say so (RFC 9110 15.5.14).
      return Response.json({ error: "데이터가 너무 커요(최대 1MB). maplescouter 캐릭터 데이터만 보내 주세요." }, { status: 413, headers: { connection: "close" } });
    if (!text.trim()) return Response.json({ error: "가져올 데이터가 비어 있어요." }, { status: 400 });
    const { character, payload } = parseCharacter(text);
    await upsertCharacter(character, payload);
    return Response.json(character, { status: 201 });
  } catch (e) {
    if (e instanceof ParseError) return Response.json({ error: e.message }, { status: 400 });
    console.error("POST /api/character/import:", e);
    return Response.json({ error: "캐릭터를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

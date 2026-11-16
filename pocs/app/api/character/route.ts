import { getCharacter, listCharacters, upsertCharacter } from "@/character";
import { CrawlError, crawlCharacter } from "@/character/crawl";

export const runtime = "nodejs";

const FRESH_MS = 60 * 60 * 1000;

export function GET() {
  return Response.json(listCharacters());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 20) return Response.json({ error: "캐릭터 이름을 입력해주세요" }, { status: 400 });

  const cached = getCharacter(name);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) return Response.json(cached);

  try {
    const { character, raw } = await crawlCharacter(name);
    upsertCharacter(character, raw);
    return Response.json(character);
  } catch (e) {
    const status = e instanceof CrawlError ? e.status : 500;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}

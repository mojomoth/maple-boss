import { getCharacter, listCharacters, upsertCharacter } from "@/character";
import { CrawlError, crawlCharacter, crawlerAvailable } from "@/character/crawl";
import { scouterUrl } from "@/app/import/bookmarklet";
import { storable } from "@/character/parse";
import { notAllowed } from "@/lib/http";

const FRESH_MS = 60 * 60 * 1000;

export async function GET() {
  try {
    return Response.json(await listCharacters());
  } catch (e) {
    console.error("GET /api/character:", e);
    return Response.json({ error: "캐릭터 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

// Local only: runs the crawler. Without it (e.g. on Vercel) this is 501 and points at the maplescouter page to
// import from (bookmarklet or paste, POST /api/character/import).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  // Checked before the crawler: a name it cannot store (NUL, lone surrogate) is the caller's mistake, not a 500.
  if (!name || name.length > 20 || !storable(name)) return Response.json({ error: "캐릭터 닉네임을 1~20자로 입력해 주세요." }, { status: 400 });
  if (!crawlerAvailable())
    return Response.json(
      {
        error: "이 서버는 닉네임으로 바로 불러오지 못해요. maplescouter 결과 페이지에서 가져와 주세요.",
        importUrl: scouterUrl(name),
      },
      { status: 501 },
    );

  try {
    const cached = await getCharacter(name);
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) return Response.json(cached);

    const { character, payload } = await crawlCharacter(name);
    await upsertCharacter(character, payload);
    return Response.json(character);
  } catch (e) {
    const status = e instanceof CrawlError ? e.status : 500;
    if (status === 500) console.error("POST /api/character:", e);
    return Response.json({ error: status === 500 ? "캐릭터를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." : (e as Error).message }, { status });
  }
}

const no = notAllowed("GET, POST");
export { no as PUT, no as PATCH, no as DELETE };

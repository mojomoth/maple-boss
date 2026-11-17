import { getCharacter, getClearRates } from "@/character";
import { getBoss } from "@/boss";
import { bossLabel } from "@/boss/search";
import { notAllowed } from "@/lib/http";
import { removeCharacter } from "../remove";

// GET ?name=<character> -> its clear rates, hardest boss first, each with a display label. 400 | 404
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.trim() ?? "";
  if (!name) return Response.json({ error: "name 파라미터에 캐릭터 닉네임을 넣어 주세요." }, { status: 400 });
  try {
    if (!(await getCharacter(name))) return Response.json({ error: "등록되지 않은 캐릭터예요." }, { status: 404 });
    return Response.json(
      (await getClearRates(name)).map((r) => {
        const b = getBoss(r.bossId);
        return { ...r, label: b ? bossLabel(b) : r.bossId };
      }),
    );
  } catch (e) {
    console.error("GET /api/character/rates:", e);
    return Response.json({ error: "배율을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}

const no = notAllowed("GET, DELETE");
export { no as POST, no as PUT, no as PATCH };

// DELETE /api/character/rates is the character named 'rates' (see ../remove.ts).
export const DELETE = () => removeCharacter("rates");

import { getClearRates } from "@/character";
import { getBoss } from "@/boss";
import { bossLabel } from "@/boss/search";

export const runtime = "nodejs";

// GET ?name=<character> -> its clear rates, hardest boss first, each with a display label.
export function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "";
  return Response.json(
    getClearRates(name).map((r) => {
      const b = getBoss(r.bossId);
      return { ...r, label: b ? bossLabel(b) : r.bossId };
    }),
  );
}

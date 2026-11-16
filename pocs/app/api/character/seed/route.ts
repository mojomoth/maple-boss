import { listCharacters, seedFixtures } from "@/character";

export const runtime = "nodejs";

export function POST() {
  return Response.json({ inserted: seedFixtures(), total: listCharacters().length });
}

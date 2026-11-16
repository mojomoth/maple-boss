import { readdirSync } from "node:fs";
import path from "node:path";
import { upsertCharacter } from "@/character";
import { parseSample } from "@/character/crawl";

export const runtime = "nodejs";

const SAMPLES = path.join(process.cwd(), "..", "docs", "research", "samples");

// Loads every crawled payload in docs/research/samples through the same upsert as a live crawl.
export async function POST() {
  try {
    const imported: string[] = [];
    for (const f of readdirSync(SAMPLES).filter((f) => f.endsWith(".json"))) {
      const { character, raw } = await parseSample(path.join(SAMPLES, f));
      upsertCharacter(character, raw);
      imported.push(character.name);
    }
    return Response.json({ imported });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

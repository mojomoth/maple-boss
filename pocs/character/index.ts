// Public interface of the character PoC. Party PoC imports listCharacters/getCharacter/listClearRates.
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { query, tx, type Query, type Row } from "@/lib/db";
import { resolveScouterBoss } from "@/boss";
import type { Character, ClearRate } from "@/lib/types";
import { parseCharacter, type Payload } from "./parse";

const COLS = ["name", "world", "job", "level", "image_url", "combat_power", "boss300_stat", "boss380_stat", "source", "fetched_at"];
const SELECT = `SELECT ${COLS.join(", ")} FROM characters`;

const toCharacter = (r: Row): Character => ({
  name: String(r.name),
  world: String(r.world),
  job: String(r.job),
  level: Number(r.level),
  imageUrl: String(r.image_url),
  combatPower: Number(r.combat_power), // BIGINT: pg returns a string
  boss300Stat: Number(r.boss300_stat),
  boss380Stat: Number(r.boss380_stat),
  source: r.source as Character["source"],
  fetchedAt: new Date(r.fetched_at as string | Date).toISOString(),
});

// Loads seed/*.json into a new database. The 'seeded' flag is claimed first, so seeds never come back after
// a user deletes everyone, and a concurrent cold start waits on the claim and then skips. Exported for tests.
export async function seed() {
  const dir = path.join(process.cwd(), "seed");
  await tx(async (q) => {
    const claimed = await q("INSERT INTO meta (key, value) VALUES ('seeded', now()::text) ON CONFLICT (key) DO NOTHING RETURNING key");
    if (!claimed.length || (await q("SELECT 1 FROM characters LIMIT 1")).length) return;
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      const { character, payload } = parseCharacter(readFileSync(path.join(dir, f), "utf8"));
      await save(q, character, payload);
    }
  });
}

let seeding: Promise<void> | undefined;
const ready = () =>
  (seeding ??= seed().catch((e) => {
    seeding = undefined;
    throw e;
  }));

export async function listCharacters(): Promise<Character[]> {
  await ready();
  return (await query(`${SELECT} ORDER BY boss300_stat DESC`)).map(toCharacter);
}

export async function getCharacter(name: string): Promise<Character | null> {
  await ready();
  const [r] = await query(`${SELECT} WHERE name = $1`, [name]);
  return r ? toCharacter(r) : null;
}

// Replaces the character and its clear_rates (from payload.calc.bossCuts).
async function save(q: Query, c: Character, p: Payload) {
  await q(
    `INSERT INTO characters (${COLS.join(", ")}, payload) VALUES (${COLS.map((_, i) => `$${i + 1}`).join(", ")}, $${COLS.length + 1})
     ON CONFLICT (name) DO UPDATE SET ${[...COLS.slice(1), "payload"].map((k) => `${k} = EXCLUDED.${k}`).join(", ")}`,
    [c.name, c.world, c.job, c.level, c.imageUrl, c.combatPower, c.boss300Stat, c.boss380Stat, c.source, c.fetchedAt, JSON.stringify(p)],
  );
  await q("DELETE FROM clear_rates WHERE character_name = $1", [c.name]);
  const rates = new Map<string, Payload["calc"]["bossCuts"][number]>(); // last one wins, like INSERT OR REPLACE did
  for (const b of p.calc.bossCuts) {
    const bossId = resolveScouterBoss(b.boss, b.difficulty);
    if (bossId) rates.set(bossId, b);
    else console.warn(`clear_rates: unresolved boss ${b.difficulty} ${b.boss} (${c.name})`);
  }
  const rs = [...rates];
  await q(
    `INSERT INTO clear_rates (character_name, boss_id, clear_rate, analytics, boss_stat)
     SELECT $1, * FROM unnest($2::text[], $3::float8[], $4::text[], $5::int[])`,
    [c.name, rs.map(([id]) => id), rs.map(([, b]) => b.clearRate), rs.map(([, b]) => b.analytics), rs.map(([, b]) => Math.trunc(b.bossStat))],
  );
}

export async function upsertCharacter(c: Character, payload: Payload) {
  await ready();
  await tx((q) => save(q, c, payload));
}

const toClearRate = (r: Row): ClearRate => ({
  characterName: String(r.character_name),
  bossId: String(r.boss_id),
  clearRate: Number(r.clear_rate),
  analytics: String(r.analytics),
  bossStat: Number(r.boss_stat),
});

// Hardest first (lowest clearRate).
export async function getClearRates(name: string): Promise<ClearRate[]> {
  await ready();
  return (await query("SELECT * FROM clear_rates WHERE character_name = $1 ORDER BY clear_rate", [name])).map(toClearRate);
}

// All characters' rates for one boss; every boss when bossId is omitted.
export async function listClearRates(bossId?: string): Promise<ClearRate[]> {
  await ready();
  return (await query("SELECT * FROM clear_rates WHERE $1::text IS NULL OR boss_id = $1", [bossId ?? null])).map(toClearRate);
}

// Removes the character, its clear_rates (ON DELETE CASCADE) and its open party requests in one transaction.
// Saved parties (parties/party_members) are snapshots and keep the name. Returns whether the character existed.
export async function deleteCharacter(name: string): Promise<boolean> {
  await ready();
  return tx(async (q) => {
    await q("DELETE FROM party_requests WHERE character_name = $1 AND status = 'open'", [name]);
    return (await q("DELETE FROM characters WHERE name = $1 RETURNING name", [name])).length > 0;
  });
}

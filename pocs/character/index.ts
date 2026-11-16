// Public interface of the character PoC. Party PoC imports listCharacters/getCharacter/listClearRates.
import "server-only";
import { db } from "@/lib/db";
import { resolveScouterBoss } from "@/boss";
import type { Character, ClearRate } from "@/lib/types";

db.exec(`CREATE TABLE IF NOT EXISTS characters (
  name TEXT PRIMARY KEY,
  world TEXT NOT NULL,
  job TEXT NOT NULL,
  level INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  combat_power INTEGER NOT NULL,
  boss300_stat INTEGER NOT NULL,
  boss380_stat INTEGER NOT NULL,
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  raw TEXT
);
CREATE TABLE IF NOT EXISTS clear_rates (
  character_name TEXT NOT NULL,
  boss_id TEXT NOT NULL,
  clear_rate REAL NOT NULL,
  analytics TEXT NOT NULL,
  boss_stat INTEGER NOT NULL,
  PRIMARY KEY (character_name, boss_id)
)`);

type Row = Record<string, string | number | null>;

const toCharacter = (r: Row): Character => ({
  name: String(r.name),
  world: String(r.world),
  job: String(r.job),
  level: Number(r.level),
  imageUrl: String(r.image_url),
  combatPower: Number(r.combat_power),
  boss300Stat: Number(r.boss300_stat),
  boss380Stat: Number(r.boss380_stat),
  source: r.source as Character["source"],
  fetchedAt: String(r.fetched_at),
});

const COLS = "name, world, job, level, image_url, combat_power, boss300_stat, boss380_stat, source, fetched_at";

export function listCharacters(): Character[] {
  return (db.prepare(`SELECT ${COLS} FROM characters ORDER BY boss300_stat DESC`).all() as Row[]).map(toCharacter);
}

export function getCharacter(name: string): Character | null {
  const r = db.prepare(`SELECT ${COLS} FROM characters WHERE name = ?`).get(name) as Row | undefined;
  return r ? toCharacter(r) : null;
}

type BossCut = { boss: string; difficulty: string; clearRate: number; analytics: string; bossStat: number };

// Replaces the character and its clear_rates (from raw.calculatedData.bossCuts) in one transaction.
export function upsertCharacter(c: Character, raw: unknown) {
  const cuts: BossCut[] = (raw as { calculatedData?: { bossCuts?: BossCut[] } })?.calculatedData?.bossCuts ?? [];
  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT OR REPLACE INTO characters (${COLS}, raw) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(c.name, c.world, c.job, c.level, c.imageUrl, c.combatPower, c.boss300Stat, c.boss380Stat, c.source, c.fetchedAt, JSON.stringify(raw));
    db.prepare("DELETE FROM clear_rates WHERE character_name = ?").run(c.name);
    const ins = db.prepare("INSERT OR REPLACE INTO clear_rates VALUES (?, ?, ?, ?, ?)");
    for (const b of cuts) {
      const bossId = resolveScouterBoss(b.boss, b.difficulty);
      if (bossId) ins.run(c.name, bossId, b.clearRate, b.analytics, b.bossStat);
      else console.warn(`clear_rates: unresolved boss ${b.difficulty} ${b.boss} (${c.name})`);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

const toClearRate = (r: Row): ClearRate => ({
  characterName: String(r.character_name),
  bossId: String(r.boss_id),
  clearRate: Number(r.clear_rate),
  analytics: String(r.analytics),
  bossStat: Number(r.boss_stat),
});

// Hardest first (lowest clearRate).
export function getClearRates(name: string): ClearRate[] {
  return (db.prepare("SELECT * FROM clear_rates WHERE character_name = ? ORDER BY clear_rate").all(name) as Row[]).map(toClearRate);
}

// All characters' rates for one boss; every boss when bossId is omitted.
export function listClearRates(bossId?: string): ClearRate[] {
  return (db.prepare("SELECT * FROM clear_rates WHERE ? IS NULL OR boss_id = ?").all(bossId ?? null, bossId ?? null) as Row[]).map(toClearRate);
}

// Removes the character, its clear_rates and its open party requests in one transaction. Saved parties
// (parties/party_members) are snapshots and keep the name. Returns whether the character existed.
export function deleteCharacter(name: string): boolean {
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM clear_rates WHERE character_name = ?").run(name);
    // party_requests belongs to @/party (which imports this module), so it may not exist on a fresh DB.
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'party_requests'").get())
      db.prepare("DELETE FROM party_requests WHERE character_name = ? AND status = 'open'").run(name);
    const { changes } = db.prepare("DELETE FROM characters WHERE name = ?").run(name);
    db.exec("COMMIT");
    return changes > 0;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

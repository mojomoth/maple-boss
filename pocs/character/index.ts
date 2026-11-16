// Public interface of the character PoC. Owner: character agent. Party PoC imports only these.
import "server-only";
import { db } from "@/lib/db";
import type { Character } from "@/lib/types";

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

export function upsertCharacter(c: Character, raw: unknown) {
  db.prepare(
    `INSERT OR REPLACE INTO characters (${COLS}, raw) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(c.name, c.world, c.job, c.level, c.imageUrl, c.combatPower, c.boss300Stat, c.boss380Stat, c.source, c.fetchedAt, JSON.stringify(raw));
}

// Obviously fake sample characters so /character and /party work without a live crawl.
const FIXTURES: [string, string, string, number, number, number, number][] = [
  ["샘플-아델", "스카니아", "아델", 285, 980_000_000, 128_000, 121_500],
  ["샘플-비숍", "루나", "비숍", 270, 420_000_000, 82_000, 77_800],
  ["샘플-나이트로드", "크로아", "나이트로드", 280, 760_000_000, 112_000, 106_300],
  ["샘플-보우마스터", "엘리시움", "보우마스터", 265, 260_000_000, 61_000, 57_900],
  ["샘플-메르세데스", "베라", "메르세데스", 260, 150_000_000, 44_500, 42_200],
  ["샘플-팔라딘", "리부트", "팔라딘", 255, 90_000_000, 31_000, 29_400],
];

export function seedFixtures(): number {
  const insert = db.prepare(`INSERT OR IGNORE INTO characters (${COLS}) VALUES (?, ?, ?, ?, '', ?, ?, ?, 'fixture', ?)`);
  const now = new Date().toISOString();
  return FIXTURES.reduce((n, f) => n + Number(insert.run(...f, now).changes), 0);
}

seedFixtures(); // idempotent: never overwrites an existing row

import "server-only";
import { db } from "@/lib/db";
import { listCharacters, listClearRates } from "@/character";
import { getBoss, listBosses } from "@/boss";
import { CLEAR_THRESHOLD, type Boss, type Character } from "@/lib/types";
import { isClearable, sumRatios } from "./ratio";

db.exec(`
CREATE TABLE IF NOT EXISTS party_requests (
  id INTEGER PRIMARY KEY,
  character_name TEXT NOT NULL,
  boss_id TEXT NOT NULL,
  party_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY,
  boss_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS party_members (
  party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  ratio REAL NOT NULL,
  PRIMARY KEY (party_id, character_name)
);`);

export interface Seeker {
  requestId: number;
  bossId: string;
  partySize: number; // 희망 인원: the largest party this seeker joins
  character: Character;
  clearRate: number | null; // null: no maplescouter rate for this boss -> shown, not selectable
  analytics: string | null; // e.g. "2인 최소컷"
}

export interface FormedParty {
  id: number;
  boss: Boss | null;
  bossId: string;
  createdAt: string;
  members: { name: string; ratio: number }[];
  sum: number;
  clearable: boolean;
}

const fail = (msg: string): never => {
  throw new Error(msg);
};

export function createRequest(characterName: string, bossId: string, partySize: number) {
  if (!listCharacters().some((c) => c.name === characterName)) fail("등록되지 않은 캐릭터입니다.");
  const boss = getBoss(bossId) ?? fail("존재하지 않는 보스입니다.");
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > boss.maxParty)
    fail(`인원은 1~${boss.maxParty}명이어야 합니다.`);
  // One open request per character per boss: re-registering updates the size.
  const upd = db
    .prepare("UPDATE party_requests SET party_size = ? WHERE character_name = ? AND boss_id = ? AND status = 'open'")
    .run(partySize, characterName, bossId);
  if (upd.changes === 0)
    db.prepare("INSERT INTO party_requests (character_name, boss_id, party_size) VALUES (?, ?, ?)").run(characterName, bossId, partySize);
}

export function listSeekers(bossId?: string): Seeker[] {
  const chars = new Map(listCharacters().map((c) => [c.name, c]));
  const bosses = new Map(listBosses().map((b) => [b.id, b]));
  const rates = new Map(listClearRates(bossId).map((r) => [`${r.characterName}\n${r.bossId}`, r]));
  const rows = db
    .prepare("SELECT id, character_name, boss_id, party_size FROM party_requests WHERE status = 'open' AND (? IS NULL OR boss_id = ?) ORDER BY id")
    .all(bossId ?? null, bossId ?? null) as { id: number; character_name: string; boss_id: string; party_size: number }[];
  return rows.flatMap((r) => {
    const character = chars.get(r.character_name);
    if (!character || !bosses.has(r.boss_id)) return []; // character/boss removed since the request was made
    const rate = rates.get(`${r.character_name}\n${r.boss_id}`);
    return [{
      requestId: r.id,
      bossId: r.boss_id,
      partySize: r.party_size,
      character,
      clearRate: rate?.clearRate ?? null,
      analytics: rate?.analytics ?? null,
    }];
  });
}

export function formParty(bossId: string, memberNames: string[]) {
  const boss = getBoss(bossId) ?? fail("존재하지 않는 보스입니다.");
  const names = [...new Set(memberNames)];
  if (names.length < 1 || names.length > boss.maxParty) fail(`파티 인원은 1~${boss.maxParty}명이어야 합니다.`);
  const seekers = new Map(listSeekers(bossId).map((s) => [s.character.name, s]));
  const missing = names.filter((n) => !seekers.has(n));
  if (missing.length) fail(`이 보스에 구직 중이 아닌 캐릭터: ${missing.join(", ")}`);
  const noRate = names.filter((n) => seekers.get(n)!.clearRate === null);
  if (noRate.length) fail(`이 보스의 배율이 없는 캐릭터: ${noRate.join(", ")}`);
  const tooBig = names.filter((n) => seekers.get(n)!.partySize < names.length);
  if (tooBig.length) fail(`희망 인원보다 큰 파티입니다: ${tooBig.join(", ")}`);

  const ratios = names.map((n) => seekers.get(n)!.clearRate!); // snapshot at formation
  db.exec("BEGIN");
  try {
    const partyId = Number(db.prepare("INSERT INTO parties (boss_id) VALUES (?)").run(bossId).lastInsertRowid);
    const addMember = db.prepare("INSERT INTO party_members (party_id, character_name, ratio) VALUES (?, ?, ?)");
    const close = db.prepare("UPDATE party_requests SET status = 'closed' WHERE character_name = ? AND boss_id = ? AND status = 'open'");
    names.forEach((n, i) => {
      addMember.run(partyId, n, ratios[i]);
      close.run(n, bossId);
    });
    db.exec("COMMIT");
    const sum = sumRatios(ratios);
    return { id: partyId, sum, clearable: isClearable(sum, CLEAR_THRESHOLD) };
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function listParties(): FormedParty[] {
  const bosses = new Map(listBosses().map((b) => [b.id, b]));
  const parties = db.prepare("SELECT id, boss_id, created_at FROM parties ORDER BY id DESC").all() as { id: number; boss_id: string; created_at: string }[];
  const members = db.prepare("SELECT party_id, character_name, ratio FROM party_members ORDER BY ratio DESC").all() as { party_id: number; character_name: string; ratio: number }[];
  return parties.map((p) => {
    const ms = members.filter((m) => m.party_id === p.id).map((m) => ({ name: m.character_name, ratio: m.ratio }));
    const sum = sumRatios(ms.map((m) => m.ratio));
    return { id: p.id, bossId: p.boss_id, boss: bosses.get(p.boss_id) ?? null, createdAt: p.created_at, members: ms, sum, clearable: isClearable(sum, CLEAR_THRESHOLD) };
  });
}

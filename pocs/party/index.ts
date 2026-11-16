import "server-only";
import { query, tx } from "@/lib/db";
import { getCharacter, listCharacters, listClearRates } from "@/character";
import { getBoss, listBosses } from "@/boss";
import { CLEAR_THRESHOLD, type Boss, type Character } from "@/lib/types";
import { isClearable, sumRatios } from "./ratio";

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

// Input the user can fix (400); anything else is a server error.
export class PartyError extends Error {}

const fail = (msg: string): never => {
  throw new PartyError(msg);
};

// partySize comes straight from the JSON body: only an integer number passes ("2", true and [2] do not).
export async function createRequest(characterName: string, bossId: string, partySize: unknown) {
  if (!(await getCharacter(characterName))) fail("등록되지 않은 캐릭터예요.");
  const boss = getBoss(bossId) ?? fail("없는 보스예요.");
  if (typeof partySize !== "number" || !Number.isInteger(partySize) || partySize < 1 || partySize > boss.maxParty)
    fail(`희망 인원은 1~${boss.maxParty} 사이의 정수여야 해요.`);
  // One open request per character per boss (unique index): re-registering updates the size.
  await query(
    `INSERT INTO party_requests (character_name, boss_id, party_size) VALUES ($1, $2, $3)
     ON CONFLICT (character_name, boss_id) WHERE status = 'open' DO UPDATE SET party_size = EXCLUDED.party_size`,
    [characterName, bossId, partySize],
  );
}

export async function listSeekers(bossId?: string): Promise<Seeker[]> {
  if (bossId !== undefined && !getBoss(bossId)) return []; // an unknown boss has no seekers (and never reaches SQL)
  const [characters, clearRates, rows] = await Promise.all([
    listCharacters(),
    listClearRates(bossId),
    query<{ id: number; character_name: string; boss_id: string; party_size: number }>(
      "SELECT id, character_name, boss_id, party_size FROM party_requests WHERE status = 'open' AND ($1::text IS NULL OR boss_id = $1) ORDER BY id",
      [bossId ?? null],
    ),
  ]);
  const chars = new Map(characters.map((c) => [c.name, c]));
  const bosses = new Map(listBosses().map((b) => [b.id, b]));
  const rates = new Map(clearRates.map((r) => [`${r.characterName}\n${r.bossId}`, r]));
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

export async function formParty(bossId: string, memberNames: string[]) {
  const boss = getBoss(bossId) ?? fail("없는 보스예요.");
  const names = [...new Set(memberNames)];
  if (names.length < 1 || names.length > boss.maxParty) fail(`파티 인원은 1~${boss.maxParty}명이어야 해요.`);
  const seekers = new Map((await listSeekers(bossId)).map((s) => [s.character.name, s]));
  const missing = names.filter((n) => !seekers.has(n));
  if (missing.length) fail(`${missing.join(", ")} 캐릭터는 이 보스에 구직 중이 아니에요.`);
  const noRate = names.filter((n) => seekers.get(n)!.clearRate === null);
  if (noRate.length) fail(`${noRate.join(", ")} 캐릭터는 이 보스 배율이 없어요.`);
  const tooBig = names.filter((n) => seekers.get(n)!.partySize < names.length);
  if (tooBig.length) fail(`${tooBig.join(", ")} 캐릭터의 희망 인원보다 큰 파티예요.`);

  const ratios = names.map((n) => seekers.get(n)!.clearRate!); // snapshot at formation
  const id = await tx(async (q) => {
    // Close the requests first. If another party took a member since the check above, that request is no longer
    // open (Postgres re-reads the row after the other transaction commits), so this party rolls back.
    const closed = await q<{ character_name: string }>(
      "UPDATE party_requests SET status = 'closed' WHERE boss_id = $1 AND character_name = ANY($2::text[]) AND status = 'open' RETURNING character_name",
      [bossId, names],
    );
    const taken = names.filter((n) => !closed.some((r) => r.character_name === n));
    if (taken.length) fail(`${taken.join(", ")} 캐릭터는 이미 다른 파티에 편성됐어요.`);
    const [{ id }] = await q<{ id: number }>("INSERT INTO parties (boss_id) VALUES ($1) RETURNING id", [bossId]);
    await q("INSERT INTO party_members (party_id, character_name, ratio) SELECT $1, * FROM unnest($2::text[], $3::float8[])", [id, names, ratios]);
    return id;
  });
  const sum = sumRatios(ratios);
  return { id, sum, clearable: isClearable(sum, CLEAR_THRESHOLD) };
}

export async function listParties(): Promise<FormedParty[]> {
  const bosses = new Map(listBosses().map((b) => [b.id, b]));
  const [parties, members] = await Promise.all([
    query<{ id: number; boss_id: string; created_at: Date | string }>("SELECT id, boss_id, created_at FROM parties ORDER BY id DESC"),
    query<{ party_id: number; character_name: string; ratio: number }>("SELECT party_id, character_name, ratio FROM party_members ORDER BY ratio DESC"),
  ]);
  return parties.map((p) => {
    const ms = members.filter((m) => m.party_id === p.id).map((m) => ({ name: m.character_name, ratio: m.ratio }));
    const sum = sumRatios(ms.map((m) => m.ratio));
    return { id: p.id, bossId: p.boss_id, boss: bosses.get(p.boss_id) ?? null, createdAt: new Date(p.created_at).toISOString(), members: ms, sum, clearable: isClearable(sum, CLEAR_THRESHOLD) };
  });
}

// Removes a saved party and its members (ON DELETE CASCADE). Returns whether it existed.
export async function deleteParty(id: number): Promise<boolean> {
  return (await query("DELETE FROM parties WHERE id = $1 RETURNING id", [id])).length > 0;
}

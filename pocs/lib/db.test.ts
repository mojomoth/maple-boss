// Data layer on an in-memory PGlite. TEST_DATABASE_URL=<an empty throwaway Postgres> runs the same tests
// through `pg`, the Neon code path. DATABASE_URL itself is ignored so tests never touch a real database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pgUrl = process.env.TEST_DATABASE_URL;
process.env.MAPLE_DB = "memory";
if (pgUrl) process.env.DATABASE_URL = pgUrl;
else delete process.env.DATABASE_URL;
delete process.env.VERCEL;

const { dbInfo, query } = await import("@/lib/db");
// These tests delete every character: refuse a database that has been used (seeded) before.
assert.equal((await query("SELECT key FROM meta")).length, 0, "the test database must be empty");
const ch = await import("@/character");
const party = await import("@/party");
type Payload = import("@/character/parse").Payload;
const { parseCharacter } = await import("@/character/parse");

const seedPayload: Payload = JSON.parse(readFileSync(new URL("../seed/강은호.json", import.meta.url), "utf8"));
const names = async () => (await ch.listCharacters()).map((c) => c.name).sort();

// A character with the given rates (bossCuts keyed by maplescouter boss name + difficulty).
function make(name: string, cuts: [boss: string, difficulty: string, clearRate: number][], level = 280) {
  const p = structuredClone(seedPayload);
  p.info.character_name = name;
  p.info.character_level = level;
  p.calc.bossCuts = cuts.map(([boss, difficulty, clearRate]) => ({ boss, difficulty, clearRate, analytics: "test", bossStat: 100_000 }));
  return parseCharacter(p);
}

test("driver", () => {
  assert.deepEqual(dbInfo, pgUrl ? { kind: "postgres", persistent: true } : { kind: "pglite", persistent: false });
});

test("seeds load once into an empty database", async () => {
  assert.deepEqual(await names(), ["강은호", "고딩", "아델"]);
  const kang = await ch.getCharacter("강은호");
  assert.equal(kang?.combatPower, 2364320307); // BIGINT round trip
  assert.equal(kang?.level, 299);
  assert.equal((await ch.getClearRates("강은호")).length, 60);
  assert.equal((await ch.listClearRates()).length, 180);
  const [meta] = await query<{ n: number }>("SELECT count(*)::int AS n FROM meta WHERE key = 'seeded'");
  assert.equal(meta.n, 1);
  const [{ payload }] = await query<{ payload: Payload }>("SELECT payload FROM characters WHERE name = '강은호'");
  assert.deepEqual(payload, seedPayload); // only the trimmed payload is stored
});

test("upsert replaces the character and all its rates", async () => {
  const a = make("테스트A", [["카링", "Extreme", 0.7], ["스우", "Normal", 3]]);
  await ch.upsertCharacter(a.character, a.payload);
  assert.deepEqual((await ch.getClearRates("테스트A")).map((r) => [r.bossId, r.clearRate]), [["extreme-kaling", 0.7], ["normal-lotus", 3]]);

  const a2 = make("테스트A", [["카링", "Extreme", 0.65], ["없는보스", "Normal", 1]], 281);
  await ch.upsertCharacter(a2.character, a2.payload);
  assert.equal((await ch.getCharacter("테스트A"))?.level, 281);
  const rates = await ch.getClearRates("테스트A");
  assert.deepEqual(rates.map((r) => [r.bossId, r.clearRate]), [["extreme-kaling", 0.65]]); // old normal-lotus gone, unknown boss skipped
  assert.equal(typeof rates[0].clearRate, "number");
});

test("party requests: one open request per character and boss", async () => {
  await party.createRequest("테스트A", "extreme-kaling", 2);
  await party.createRequest("테스트A", "extreme-kaling", 3); // re-register = new size
  const seekers = await party.listSeekers("extreme-kaling");
  assert.deepEqual(seekers.map((s) => [s.character.name, s.partySize, s.clearRate]), [["테스트A", 3, 0.65]]);

  await assert.rejects(party.createRequest("없는캐릭", "extreme-kaling", 1), /등록되지 않은 캐릭터예요/);
  await assert.rejects(party.createRequest("없는\u0000캐릭", "extreme-kaling", 1), /등록되지 않은 캐릭터예요/); // not a 500
  await assert.rejects(party.createRequest("테스트A", "nope", 1), /없는 보스예요/);
  await assert.rejects(party.createRequest("테스트A", "extreme-kaling", 7), /희망 인원은 1~6 사이의 정수여야 해요/);
  // partySize is the JSON value as sent: integers only, nothing that merely converts to one.
  for (const size of [0, -1, 1.5, NaN, Infinity, "2", true, [2], null, undefined, {}])
    await assert.rejects(party.createRequest("테스트A", "extreme-kaling", size), party.PartyError, String(size));
  assert.deepEqual((await party.listSeekers("extreme-kaling")).map((s) => s.partySize), [3]); // none of those changed it
  assert.deepEqual(await party.listSeekers("nope"), []);
  assert.deepEqual(await party.listSeekers("no\u0000pe"), []); // never reaches SQL
});

test("formParty sums the rates, saves the party and closes the requests", async () => {
  const b = make("테스트B", [["카링", "Extreme", 0.45]]);
  await ch.upsertCharacter(b.character, b.payload);
  await party.createRequest("테스트B", "extreme-kaling", 2);
  await assert.rejects(party.formParty("extreme-kaling", ["테스트A", "테스트B", "강은호"]), { message: "강은호 캐릭터는 이 보스에 구직 중이 아니에요." });

  const formed = await party.formParty("extreme-kaling", ["테스트A", "테스트B", "테스트A"]); // duplicates ignored
  assert.ok(Math.abs(formed.sum - 1.1) < 1e-9);
  assert.equal(formed.clearable, true); // 0.65 + 0.45 = 110%
  assert.deepEqual(await party.listSeekers("extreme-kaling"), []);

  const [saved] = await party.listParties();
  assert.equal(saved.id, formed.id);
  assert.equal(saved.boss?.id, "extreme-kaling");
  assert.deepEqual(saved.members, [{ name: "테스트A", ratio: 0.65 }, { name: "테스트B", ratio: 0.45 }]);
  assert.equal(saved.clearable, true);
  assert.match(saved.createdAt, /^\d{4}-\d\d-\d\dT.*Z$/);

  await party.createRequest("테스트B", "extreme-kaling", 1);
  const solo = await party.formParty("extreme-kaling", ["테스트B"]);
  assert.deepEqual([solo.sum, solo.clearable], [0.45, false]);
  await assert.rejects(party.formParty("extreme-kaling", ["테스트B"]), /구직 중이 아니에요/); // its request is closed
});

test("formParty rejects double booking inside the transaction", async () => {
  const c = make("테스트C", [["카링", "Extreme", 0.6]]);
  await ch.upsertCharacter(c.character, c.payload);
  for (const n of ["테스트A", "테스트B", "테스트C"]) await party.createRequest(n, "extreme-kaling", 2);
  const before = (await party.listParties()).length;

  // Both pass the seeker check before either transaction runs; whichever commits second must find 테스트A taken.
  // PGlite runs them in call order, but through `pg` (a pool of connections) either one may win, so the test
  // checks the outcome, not the order.
  const teams = [["테스트A", "테스트B"], ["테스트A", "테스트C"]];
  const results = await Promise.allSettled(teams.map((t) => party.formParty("extreme-kaling", t)));
  assert.deepEqual(results.map((r) => r.status).sort(), ["fulfilled", "rejected"]);
  const lost = results.findIndex((r) => r.status === "rejected");
  const reason = (results[lost] as PromiseRejectedResult).reason;
  assert.ok(reason instanceof party.PartyError);
  assert.equal(reason.message, "테스트A 캐릭터는 이미 다른 파티에 편성됐어요.");

  const after = await party.listParties();
  assert.equal(after.length, before + 1); // the loser rolled back: no party row, no members
  assert.deepEqual(after[0].members.map((m) => m.name).sort(), teams[1 - lost]);
  const loserMate = teams[lost][1];
  assert.deepEqual((await party.listSeekers("extreme-kaling")).map((s) => s.character.name), [loserMate]); // stays open
});

test("delete removes the character, its rates and open requests; parties keep the name", async () => {
  assert.equal(await ch.deleteCharacter("테스트C"), true);
  assert.equal(await ch.deleteCharacter("테스트C"), false);
  assert.equal(await ch.deleteCharacter("테스트\u0000C"), false); // a name that cannot be stored: 404, not a 500
  assert.deepEqual(await ch.getClearRates("\ud800"), []);
  assert.equal(await ch.getCharacter("테스트C"), null);
  assert.deepEqual(await ch.getClearRates("테스트C"), []);
  const [open] = await query<{ n: number }>("SELECT count(*)::int AS n FROM party_requests WHERE character_name = '테스트C' AND status = 'open'");
  assert.equal(open.n, 0);

  assert.equal(await ch.deleteCharacter("테스트A"), true);
  assert.ok((await party.listParties()).some((p) => p.members.some((m) => m.name === "테스트A")));
});

test("seeds do not come back after everyone is deleted", async () => {
  for (const n of await names()) assert.equal(await ch.deleteCharacter(n), true);
  assert.deepEqual(await names(), []);
  await ch.seed(); // what a cold start runs
  assert.deepEqual(await names(), []);
});

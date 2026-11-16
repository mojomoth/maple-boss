import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ParseError, parseCharacter, type Payload } from "./parse.ts";

const raw = readFileSync(new URL("../../docs/research/samples/강은호.json", import.meta.url), "utf8");
const sr = JSON.parse(raw); // state.searchResult
const now = new Date("2026-11-17T00:00:00Z");
const seed: Payload = JSON.parse(readFileSync(new URL("../seed/강은호.json", import.meta.url), "utf8"));
const clone = <T>(x: T): T => structuredClone(x);
const rejects = (input: unknown, msg: RegExp) =>
  assert.throws(() => parseCharacter(input, now), (e: unknown) => e instanceof ParseError && msg.test(e.message));

test("every accepted shape maps to the same character and trimmed payload", () => {
  const store = { state: { searchResult: sr, other: 1 }, version: 0 };
  const shapes = [JSON.stringify(store), JSON.stringify(JSON.stringify(store)), store, store.state, sr, seed, JSON.stringify(seed)];
  const want = parseCharacter(sr, now);
  for (const s of shapes) assert.deepEqual(parseCharacter(s, now), want);

  assert.deepEqual(want.character, {
    name: "강은호",
    world: "스카니아",
    job: "칼리",
    level: 299,
    imageUrl: sr.userApiData.info.character_image,
    combatPower: 2364320307, // > INT32: stored as BIGINT
    boss300Stat: 152715,
    boss380Stat: 153521,
    source: "maplescouter",
    fetchedAt: "2026-11-17T00:00:00.000Z",
  });
  assert.deepEqual(want.payload, seed); // the committed seed is exactly this mapping
  assert.equal(want.payload.calc.bossCuts.length, 60);
  assert.deepEqual(Object.keys(want.payload.calc.bossCuts[0]), ["boss", "difficulty", "clearRate", "analytics", "bossStat"]);
  assert.ok(JSON.stringify(want.payload).length < 20_000, "payload is trimmed, not the ~250 KB raw");
});

test("relative character_image gets the maplescouter origin", () => {
  const p = clone(seed);
  p.info.character_image = "/images/default.png";
  assert.equal(parseCharacter(p, now).character.imageUrl, "https://maplescouter.com/images/default.png");
  p.info.character_image = "";
  assert.equal(parseCharacter(p, now).character.imageUrl, "");
  p.info.character_image = "javascript:alert(1)";
  rejects(p, /character_image/);
});

test("rejects the maplescouter placeholder with a clear message", () => {
  const p = clone(seed);
  p.info.character_name = "으낭다";
  p.calc.bossCuts = [];
  rejects(p, /기본 캐릭터\(으낭다\)/);
  rejects({ state: { searchResult: { userApiData: { info: { character_name: "으낭다" } }, calculatedData: {} } } }, /으낭다/);
});

test("rejects malformed input", () => {
  rejects("{not json", /JSON 형식/);
  rejects(null, /캐릭터 데이터가 아니에요/);
  rejects([], /캐릭터 데이터가 아니에요/);
  rejects({ state: { searchResult: null } }, /캐릭터 데이터가 아니에요/);
  rejects({ v: 1, info: seed.info }, /캐릭터 데이터가 아니에요/);

  const bad: [string, (p: Payload) => void, RegExp][] = [
    ["empty name", (p) => (p.info.character_name = "  "), /character_name/],
    ["name > 20", (p) => (p.info.character_name = "가".repeat(21)), /character_name/],
    ["level as string", (p) => ((p.info as Record<string, unknown>).character_level = "299"), /character_level/],
    ["level 0", (p) => (p.info.character_level = 0), /character_level/],
    ["infinite power", (p) => (p.calc.combatPower = Infinity), /combatPower/],
    ["NaN stat", (p) => (p.calc.boss300_stat = NaN), /boss300_stat/],
    ["negative stat", (p) => (p.calc.boss380_stat = -1), /boss380_stat/],
    ["negative clearRate", (p) => (p.calc.bossCuts[3].clearRate = -0.1), /bossCuts\[3\]\.clearRate/],
    ["clearRate as string", (p) => ((p.calc.bossCuts[0] as unknown as Record<string, unknown>).clearRate = "1.2"), /clearRate/],
    ["cut not an object", (p) => ((p.calc.bossCuts as unknown[])[1] = 5), /bossCuts\[1\]/],
    ["bossCuts not an array", (p) => ((p.calc as Record<string, unknown>).bossCuts = {}), /bossCuts/],
    ["too many cuts", (p) => (p.calc.bossCuts = Array(101).fill(p.calc.bossCuts[0])), /최대 100개/],
    // A finite but absurd rate made a party's sum Infinity (sent as `sum: null`).
    ["clearRate 1e308", (p) => (p.calc.bossCuts[2].clearRate = 1e308), /bossCuts\[2\]\.clearRate/],
    ["clearRate over 1e6", (p) => (p.calc.bossCuts[2].clearRate = 1_000_000.1), /bossCuts\[2\]\.clearRate/],
    // URL paths resolve '.' and '..' away, so such a character could be imported but never deleted.
    ["name '..'", (p) => (p.info.character_name = ".."), /‘\.\.’은 캐릭터 이름으로 쓸 수 없어요/],
    ["name ' . '", (p) => (p.info.character_name = " . "), /‘\.’은 캐릭터 이름으로 쓸 수 없어요/],
    // Postgres cannot store NUL; a lone surrogate is not UTF-8. Both were a 500 at insert time.
    ["NUL in name", (p) => (p.info.character_name = "a\u0000b"), /character_name 값에 쓸 수 없는 문자/],
    ["lone surrogate in name", (p) => (p.info.character_name = "a\ud800"), /character_name 값에 쓸 수 없는 문자/],
    ["NUL in world", (p) => (p.info.world_name = "스카\u0000니아"), /world_name 값에 쓸 수 없는 문자/],
    ["lone low surrogate in job", (p) => (p.info.character_class = "\udc00아델"), /character_class 값에 쓸 수 없는 문자/],
    ["NUL in analytics", (p) => (p.calc.bossCuts[4].analytics = "x\u0000"), /bossCuts\[4\]\.analytics 값에 쓸 수 없는 문자/],
    ["NUL in image", (p) => (p.info.character_image = "https://x/\u0000.png"), /character_image/],
  ];
  for (const [what, mutate, msg] of bad) {
    const p = clone(seed);
    mutate(p);
    assert.throws(() => parseCharacter(p, now), (e: unknown) => e instanceof ParseError && msg.test(e.message), what);
  }
  rejects(JSON.stringify(seed).replace('"combatPower":2364320307', '"combatPower":1e999'), /combatPower/); // JSON Infinity
});

test("accepts the edges", () => {
  const p = clone(seed);
  p.info.character_name = "가".repeat(20);
  p.calc.bossCuts = Array(100).fill({ ...p.calc.bossCuts[0], clearRate: 0 });
  const { character, payload } = parseCharacter(p, now);
  assert.equal(character.name.length, 20);
  assert.equal(payload.calc.bossCuts.length, 100);

  const q = clone(seed);
  q.calc.bossCuts[0].clearRate = 17832.1883792285; // 노말 스우, a real rate
  q.calc.bossCuts[1].clearRate = 1_000_000; // the cap itself
  q.info.character_name = "a.b🐉"; // dots inside a name and a surrogate pair are fine
  const r = parseCharacter(q, now);
  assert.equal(r.payload.calc.bossCuts[0].clearRate, 17832.1883792285);
  assert.equal(r.payload.calc.bossCuts[1].clearRate, 1_000_000);
  assert.equal(r.character.name, "a.b🐉");
});

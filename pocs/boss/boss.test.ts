import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BOSSES } from "./data.ts";
import { getBoss, resolveScouterBoss } from "./index.ts";
import { searchBosses, formatKorean } from "./search.ts";
const bosses = BOSSES;
const ids = (q: string) => searchBosses(bosses, q).map((b) => b.id);

const sample = JSON.parse(readFileSync(new URL("../../docs/research/samples/강은호.json", import.meta.url), "utf8"));
const cuts: { boss: string; difficulty: string; isPartyLimit: number }[] = sample.calculatedData.bossCuts;

test("maplescouter bossCuts resolve 1:1", () => {
  assert.equal(cuts.length, 60);
  assert.equal(bosses.length, 60);
  const resolved = cuts.map((c) => resolveScouterBoss(c.boss, c.difficulty));
  assert.equal(new Set(resolved).size, 60, "60 distinct ids");
  cuts.forEach((c, i) => {
    assert.ok(resolved[i], `${c.difficulty} ${c.boss}`);
    assert.equal(getBoss(resolved[i]!)!.maxParty, c.isPartyLimit, `${c.difficulty} ${c.boss} maxParty`);
  });
  assert.equal(resolveScouterBoss("카링", "EXTREME"), "extreme-kaling");
  assert.equal(resolveScouterBoss("림보", "Destiny"), "destiny-limbo");
  for (const [n, d] of [["없는보스", "Normal"], ["카링", "Chaos"], ["가디언 엔젤 슬라임", "Normal"], ["카링", ""]])
    assert.equal(resolveScouterBoss(n, d), null, `${d} ${n}`);
});

test("seed integrity", () => {
  assert.equal(new Set(bosses.map((b) => b.id)).size, bosses.length, "unique ids");
  for (const b of bosses) {
    assert.ok(Number.isInteger(b.hp) && b.hp > 0, b.id);
    assert.equal(b.statBasis, b.defenseRate >= 380 ? "380" : "300", b.id);
    assert.ok(b.maxParty >= 1 && b.maxParty <= 6, b.id);
  }
  // HP grows with difficulty within each boss's party modes (listed easiest first).
  // Destiny/Champion reuse a lower mode's HP (e.g. Destiny Limbo = Hard), so they are skipped.
  const party = bosses.filter((b) => b.difficulty !== "destiny" && b.difficulty !== "champion");
  for (let i = 1; i < party.length; i++) {
    const [a, b] = [party[i - 1], party[i]];
    if (a.name === b.name) assert.ok(b.hp > a.hp, `${a.id} < ${b.id}`);
  }
});

test("search", () => {
  assert.deepEqual(ids("카링"), ["easy-kaling", "normal-kaling", "hard-kaling", "extreme-kaling", "destiny-kaling"]);
  assert.deepEqual(ids("카링 노말"), ["normal-kaling"]);
  assert.deepEqual(ids("익스트림 검은마법사"), ["extreme-black-mage"]);
  assert.deepEqual(ids("세렌"), ["normal-seren", "hard-seren", "extreme-seren", "destiny-seren", "champion-seren"]);
  assert.deepEqual(ids("가엔슬"), ["normal-guardian-angel-slime", "chaos-guardian-angel-slime"]);
  assert.deepEqual(ids("챔피언 스우"), ["champion-lotus"]);
  for (const q of ["대적자", "흉성", "칼로스", "유피테르", "벨로나"]) assert.ok(ids(q).length > 0, q);
  assert.equal(ids("").length, bosses.length);
  assert.deepEqual(ids("없는보스"), []);
});

test("formatKorean", () => {
  assert.equal(formatKorean(1_073_700_000_000), "1조 737억");
  assert.equal(formatKorean(822_000_000_000), "8220억");
  assert.equal(formatKorean(45_400_000_000_000_000), "4경 5400조");
  assert.equal(formatKorean(17_800_000_000_000), "17조 8000억");
});

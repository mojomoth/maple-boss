import { test } from "node:test";
import assert from "node:assert/strict";
import { BOSSES, CUTS } from "./data.ts";
import { searchBosses, formatHp } from "./search.ts";
const bosses = BOSSES;
const ids = (q: string) => searchBosses(bosses, q).map((b) => b.id);

test("seed integrity", () => {
  assert.equal(new Set(bosses.map((b) => b.id)).size, bosses.length, "unique ids");
  assert.deepEqual(Object.keys(CUTS).sort(), bosses.map((b) => b.id).sort(), "one cut per boss");
  for (const b of bosses) {
    assert.ok(Number.isInteger(b.hp) && b.hp > 0, b.id);
    assert.equal(b.statBasis, b.defenseRate >= 380 ? "380" : "300", b.id);
    assert.ok(b.maxParty >= 1 && b.maxParty <= 6, b.id);
  }
  // cut and HP grow with difficulty within each boss (data is listed easiest first)
  for (let i = 1; i < bosses.length; i++) {
    const [a, b] = [bosses[i - 1], bosses[i]];
    if (a.name === b.name) assert.ok(b.cut > a.cut && b.hp > a.hp, `${a.id} < ${b.id}`);
  }
});

test("search", () => {
  assert.deepEqual(ids("카링"), ["easy-kaling", "normal-kaling", "hard-kaling", "extreme-kaling"]);
  assert.deepEqual(ids("카링 노말"), ["normal-kaling"]);
  assert.deepEqual(ids("익스트림 검은마법사"), ["extreme-black-mage"]);
  assert.deepEqual(ids("세렌"), ["normal-seren", "hard-seren", "extreme-seren"]);
  assert.equal(ids("").length, bosses.length);
  assert.deepEqual(ids("없는보스"), []);
});

test("formatHp", () => {
  assert.equal(formatHp(1_073_700_000_000), "1조 737억");
  assert.equal(formatHp(822_000_000_000), "8220억");
  assert.equal(formatHp(45_400_000_000_000_000), "4경 5400조");
  assert.equal(formatHp(17_800_000_000_000), "17조 8000억");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { ratioOf, sumRatios, isClearable, suggestParty } from "./ratio.ts";

const T = 1.1; // CLEAR_THRESHOLD
const stats = { boss300Stat: 50_000, boss380Stat: 40_000 };

test("ratioOf picks the stat matching the boss basis", () => {
  assert.equal(ratioOf(stats, { statBasis: "300", cut: 100_000 }), 0.5);
  assert.equal(ratioOf(stats, { statBasis: "380", cut: 100_000 }), 0.4);
});

test("ratioOf guards cut <= 0 / NaN", () => {
  assert.equal(ratioOf(stats, { statBasis: "300", cut: 0 }), 0);
  assert.equal(ratioOf(stats, { statBasis: "300", cut: -5 }), 0);
  assert.equal(ratioOf(stats, { statBasis: "300", cut: NaN }), 0);
});

test("threshold: exactly 110% clears, even with float error", () => {
  assert.equal(isClearable(sumRatios([0.7, 0.4]), T), true); // 1.0999999999999999
  assert.equal(isClearable(1.1, T), true);
  assert.equal(isClearable(1.099, T), false);
  assert.equal(isClearable(sumRatios([]), T), false); // empty party
});

const seekers = [
  { name: "a", ratio: 0.3 },
  { name: "b", ratio: 0.8 },
  { name: "c", ratio: 0.5 },
  { name: "d", ratio: 0.2 },
];
const names = (xs: { name: string }[]) => xs.map((x) => x.name);

test("suggestParty returns the smallest clearable set, strongest first", () => {
  assert.deepEqual(names(suggestParty(seekers, 4, T)), ["b", "c"]); // 1.3
  assert.deepEqual(names(suggestParty([{ name: "solo", ratio: 1.2 }, ...seekers], 4, T)), ["solo"]);
});

test("suggestParty respects the size limit and falls back to the best party", () => {
  assert.deepEqual(names(suggestParty(seekers, 1, T)), ["b"]); // 0.8, not clearable but best single
  assert.deepEqual(names(suggestParty([{ name: "x", ratio: 0.1 }, { name: "y", ratio: 0.2 }], 6, T)), ["y", "x"]);
  assert.deepEqual(suggestParty(seekers, 0, T), []);
  assert.deepEqual(suggestParty([], 4, T), []);
});

test("suggestParty does not mutate input", () => {
  const copy = [...seekers];
  suggestParty(seekers, 4, T);
  assert.deepEqual(seekers, copy);
});

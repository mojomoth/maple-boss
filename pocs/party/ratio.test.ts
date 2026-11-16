import { test } from "node:test";
import assert from "node:assert/strict";
import { sumRatios, isClearable, shownSum, suggestParty, rankParties } from "./ratio.ts";
import { pct } from "../character/format.ts";

const T = 1.1; // CLEAR_THRESHOLD

test("threshold: exactly 110% clears, even with float error", () => {
  assert.equal(isClearable(sumRatios([0.7, 0.4]), T), true); // 1.0999999999999999
  assert.equal(isClearable(1.1, T), true);
  assert.equal(isClearable(1.099, T), false);
  assert.equal(isClearable(sumRatios([]), T), false); // empty party
  assert.equal(isClearable(sumRatios([0.9352402891241739]), T), false); // 익스트림 카링 solo
  assert.equal(isClearable(sumRatios([17832.1883792285]), T), true); // 노말 스우: huge rates are fine
});

test("shownSum never displays an unclearable sum as 110.0%", () => {
  const near = sumRatios([0.9352402891241739, 0.1643]); // 1.0995..., pct() alone rounds it to 110.0%
  assert.equal(pct(shownSum(near, T)), "109.9%");
  assert.equal(pct(T - shownSum(near, T)), "0.1%"); // deficit
  assert.equal(pct(shownSum(sumRatios([0.7, 0.4]), T)), "110.0%"); // clearable, shown as-is
  assert.equal(pct(T - shownSum(1, T)), "10.0%");
});

const seekers = [
  { name: "a", clearRate: 0.3 },
  { name: "b", clearRate: 0.8 },
  { name: "c", clearRate: 0.5 },
  { name: "d", clearRate: 0.2 },
];
const names = (xs: { name: string }[]) => xs.map((x) => x.name);

test("suggestParty returns the smallest clearable set, strongest first", () => {
  assert.deepEqual(names(suggestParty(seekers, 4, T)), ["b", "c"]); // 1.3
  assert.deepEqual(names(suggestParty([{ name: "solo", clearRate: 1.2 }, ...seekers], 4, T)), ["solo"]);
});

test("suggestParty respects the size limit and falls back to the best party", () => {
  assert.deepEqual(names(suggestParty(seekers, 1, T)), ["b"]); // 0.8, not clearable but best single
  assert.deepEqual(names(suggestParty([{ name: "x", clearRate: 0.1 }, { name: "y", clearRate: 0.2 }], 6, T)), ["y", "x"]);
  assert.deepEqual(suggestParty(seekers, 0, T), []);
  assert.deepEqual(suggestParty([], 4, T), []);
});

test("suggestParty does not mutate input", () => {
  const copy = [...seekers];
  suggestParty(seekers, 4, T);
  assert.deepEqual(seekers, copy);
});

// 익스트림 카링, real maplescouter rates
const kaling = [
  { name: "고딩", clearRate: 0.7929642844259994 },
  { name: "강은호", clearRate: 0.9352402891241739 },
  { name: "아델", clearRate: 0.8323749667523922 },
];
const parties = (ps: { members: { name: string }[] }[]) => ps.map((p) => names(p.members).join("+"));

test("rankParties: 익스트림 카링 gives the three 2-member parties, highest sum first", () => {
  const ranked = rankParties(kaling, 6, T);
  assert.deepEqual(parties(ranked), ["강은호+아델", "강은호+고딩", "아델+고딩"]);
  assert.equal(ranked[0].sum, 0.9352402891241739 + 0.8323749667523922);
  assert.deepEqual(parties(rankParties(kaling, 6, T, 10)), ["강은호+아델", "강은호+고딩", "아델+고딩", "강은호+아델+고딩"]);
});

test("rankParties: a solo-clearable member ranks first", () => {
  assert.deepEqual(parties(rankParties([...kaling, { name: "solo", clearRate: 1.2 }], 6, T)), ["solo", "solo+강은호", "solo+아델"]);
});

test("rankParties: size limit, result limit, empty pool", () => {
  assert.deepEqual(rankParties(kaling, 1, T), []); // nobody clears solo
  assert.equal(rankParties(kaling, 6, T, 1).length, 1);
  assert.deepEqual(parties(rankParties(kaling, 6, T, 2)), ["강은호+아델", "강은호+고딩"]);
  assert.deepEqual(rankParties([], 6, T), []);
});

test("rankParties does not mutate input", () => {
  const copy = structuredClone(kaling);
  rankParties(kaling, 6, T);
  assert.deepEqual(kaling, copy);
});

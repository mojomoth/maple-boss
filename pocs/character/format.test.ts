import { test } from "node:test";
import assert from "node:assert/strict";
import { formatKorean } from "./format.ts";

test("formatKorean", () => {
  assert.equal(formatKorean(856463177), "8억 5646만");
  assert.equal(formatKorean(800000000), "8억");
  assert.equal(formatKorean(56460000), "5646만");
  assert.equal(formatKorean(9999), "9,999");
});

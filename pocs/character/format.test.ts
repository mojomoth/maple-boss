import { test } from "node:test";
import assert from "node:assert/strict";
import { pct } from "./format.ts";

test("pct", () => {
  assert.equal(pct(1.3613019990856534), "136.1%");
  assert.equal(pct(17832.1883792285), "1,783,218.8%"); // 노말 스우
  assert.equal(pct(1), "100.0%");
});

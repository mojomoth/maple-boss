// npm run flow:sync on temp copies of docs/dev-v1 (DOCS_DIR): only the marker blocks change, a second run changes
// nothing, a bad flow.json exits 1 and leaves both files alone, and /flow's stamp check agrees with the script.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { flowHash, parseFlow, readStamp } from "../app/flow/flow.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "flow-sync.mjs");
const docs = path.resolve(here, "../../docs/dev-v1");

function copy() {
  const dir = mkdtempSync(path.join(tmpdir(), "flow-sync-"));
  for (const f of ["flow.json", "STATUS.md", "PLAN.md"]) cpSync(path.join(docs, f), path.join(dir, f));
  return dir;
}
const sync = (dir: string, env: Record<string, string> = {}) =>
  spawnSync(process.execPath, [script], { env: { ...process.env, DOCS_DIR: dir, ...env }, encoding: "utf8" });
const read = (dir: string, f: string) => readFileSync(path.join(dir, f), "utf8");
const outside = (md: string, name: string) => md.replace(new RegExp(`<!-- ${name}:start -->[\\s\\S]*<!-- ${name}:end -->`), "");
const editFlow = (dir: string, edit: (f: ReturnType<typeof parseFlow>) => void) => {
  const flow = JSON.parse(read(dir, "flow.json"));
  edit(flow);
  writeFileSync(path.join(dir, "flow.json"), JSON.stringify(flow, null, 2));
};

test("rewrites only the marker blocks, and a second run changes nothing", () => {
  const dir = copy();
  const [status0, plan0] = [read(dir, "STATUS.md"), read(dir, "PLAN.md")];
  assert.equal(sync(dir).status, 0);
  const [status1, plan1] = [read(dir, "STATUS.md"), read(dir, "PLAN.md")];
  assert.equal(outside(status1, "flow"), outside(status0, "flow"));
  assert.equal(outside(plan1, "todo"), outside(plan0, "todo"));
  assert.match(status1, /^\| G1 PoC \| 통과 \| 구현 → 검증 실패 → 수정 → 재검증 → 판정 · 수정 루프 1회 \|/m);
  assert.match(status1, /\[`evidence\/G1\/fix-round-1\.txt`\]\(evidence\/G1\/fix-round-1\.txt\)/);

  const second = sync(dir);
  assert.equal(second.status, 0);
  assert.equal(read(dir, "STATUS.md"), status1);
  assert.equal(read(dir, "PLAN.md"), plan1);
  assert.match(second.stdout, /변경 없음.*STATUS\.md[\s\S]*변경 없음.*PLAN\.md/);
});

test("checks a gate in PLAN.md once it passes and keeps its description", () => {
  const dir = copy();
  editFlow(dir, (f) => {
    f.gates[2].status = "pass";
  });
  assert.equal(sync(dir).status, 0);
  const todo = read(dir, "PLAN.md").split("<!-- todo:start -->")[1].split("<!-- todo:end -->")[0];
  assert.deepEqual(
    todo.trim().split("\n").map((l) => l.slice(0, 9)),
    ["- [x] G0 ", "- [x] G1 ", "- [x] G2 ", "- [ ] G3 "],
  );
  assert.match(todo, /^- \[x\] G2 `\/flow` 시각화, 문서 동기화, 화면 이동, Critic$/m);
});

test("the stamp matches the hash /flow computes, and goes stale when flow.json changes", () => {
  const dir = copy();
  assert.equal(sync(dir).status, 0);
  const hash = () => flowHash(parseFlow(read(dir, "flow.json")));
  assert.equal(readStamp(read(dir, "STATUS.md"))?.hash, hash());

  editFlow(dir, (f) => {
    f.updatedAt = "2026-11-18T09:00:00+09:00";
  });
  assert.notEqual(readStamp(read(dir, "STATUS.md"))?.hash, hash());
  assert.equal(sync(dir).status, 0);
  assert.deepEqual(readStamp(read(dir, "STATUS.md")), { updatedAt: "2026-11-18T09:00:00+09:00", hash: hash() });
});

test("an invalid flow.json exits 1 with the problem's path and leaves both files alone", () => {
  const dir = copy();
  const before = [read(dir, "STATUS.md"), read(dir, "PLAN.md")];
  editFlow(dir, (f) => {
    (f.gates[1].steps[1] as { status: string }).status = "done";
    f.gates[0].steps[0].evidence = ["../secret.txt"];
  });
  const r = sync(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /gates\[1\]\.steps\[1\]\.status: todo \| running \| pass \| fail \| blocked 중 하나여야 해요 \(지금 "done"\)/);
  assert.match(r.stderr, /gates\[0\]\.steps\[0\]\.evidence\[0\]: 저장소 안의 상대 경로여야 해요/);
  assert.deepEqual([read(dir, "STATUS.md"), read(dir, "PLAN.md")], before);

  writeFileSync(path.join(dir, "flow.json"), "{ not json");
  assert.match(sync(dir).stderr, /JSON이 아니에요/);
  assert.equal(sync(dir, { FLOW_FILE: path.join(dir, "missing.json") }).status, 1);
});

test("a missing marker exits 1 without writing", () => {
  const dir = copy();
  const plan = read(dir, "PLAN.md").replace("<!-- todo:end -->", "");
  writeFileSync(path.join(dir, "PLAN.md"), plan);
  const status = read(dir, "STATUS.md");
  const r = sync(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /<!-- todo:start --> 와 <!-- todo:end --> 가 순서대로 한 번씩 있어야 해요/);
  assert.equal(read(dir, "STATUS.md"), status);
});

test("parseFlow rejects unsafe evidence paths and duplicate ids", () => {
  const base = parseFlow(readFileSync(path.join(docs, "flow.json"), "utf8"));
  for (const bad of ["/etc/passwd", "https://example.com/x", "a/../../b", "javascript:alert(1)", " docs/x"]) {
    const f = structuredClone(base);
    f.gates[0].steps[0].evidence = [bad];
    assert.throws(() => parseFlow(JSON.stringify(f)), /evidence\[0\]: 저장소 안의 상대 경로/, bad);
  }
  const f = structuredClone(base);
  f.gates[1].steps[0].id = f.gates[0].steps[0].id;
  assert.throws(() => parseFlow(JSON.stringify(f)), /id "G0-plan"가 겹쳐요/);
});

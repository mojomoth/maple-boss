// npm run flow:sync: checks docs/dev-v1/flow.json, then rewrites the gate table between <!-- flow:start --> and
// <!-- flow:end --> in STATUS.md and the gate checklist between <!-- todo:start --> and <!-- todo:end --> in PLAN.md.
// Nothing outside the markers changes, and a second run changes nothing. The STATUS block carries a stamp
// (updatedAt + content hash) that /flow compares to show whether the docs are in sync.
// DOCS_DIR (folder with STATUS.md and PLAN.md) and FLOW_FILE (default DOCS_DIR/flow.json) point it at copies.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BLOCKER_LABEL, KIND_LABEL, STATUS_LABEL, parseFlow, stampLine } from "../app/flow/flow.mjs";

const docs = path.resolve(process.env.DOCS_DIR || fileURLToPath(new URL("../../docs/dev-v1/", import.meta.url)));
const flowFile = path.resolve(process.env.FLOW_FILE || path.join(docs, "flow.json"));
const DOCS_IN_REPO = "docs/dev-v1"; // where STATUS.md lives, for relative evidence links

function fail(message) {
  console.error(`flow:sync 실패: ${message}`);
  process.exit(1);
}

function read(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (e) {
    fail(`${file}을 읽지 못했어요 (${e.code ?? e.message})`);
  }
}

// Replaces what sits between the two markers; the markers and everything around them stay as they are.
function replaceBlock(text, name, body, file) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i < 0 || j < i || text.indexOf(start, i + 1) >= 0 || text.indexOf(end, j + 1) >= 0)
    fail(`${file}에 ${start} 와 ${end} 가 순서대로 한 번씩 있어야 해요`);
  return `${text.slice(0, i + start.length)}\n${body}\n${text.slice(j)}`;
}

const cell = (s) => s.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();

// Repo-relative evidence path -> link relative to STATUS.md, so it opens on GitHub and in an editor.
function evidenceLink(p) {
  const rel = path.posix.relative(DOCS_IN_REPO, p) + (p.endsWith("/") ? "/" : "");
  return `[\`${rel}\`](${encodeURI(rel)})`;
}

// "구현 → 검증 실패 → 수정 → 재검증 → 판정 · 수정 루프 1회": a step shows its status unless it passed.
function stepsSummary(gate) {
  const steps = gate.steps.map((s) => (s.status === "pass" ? KIND_LABEL[s.kind] : `${KIND_LABEL[s.kind]} ${STATUS_LABEL[s.status]}`));
  const fixes = gate.steps.filter((s) => s.kind === "fix").length;
  return steps.join(" → ") + (fixes ? ` · 수정 루프 ${fixes}회` : "");
}

function statusBlock(flow) {
  const rows = flow.gates.map((g) => {
    const evidence = [...new Set(g.steps.flatMap((s) => s.evidence))].map(evidenceLink).join(", ");
    return `| ${cell(`${g.id} ${g.title}`)} | ${STATUS_LABEL[g.status]} | ${cell(stepsSummary(g))} | ${evidence} |`;
  });
  const blockers = flow.blockers.map((b) => `- ${cell(`${b.id} ${b.title}`)} · ${BLOCKER_LABEL[b.status]}`);
  return [
    stampLine(flow),
    `\`flow.json\` ${flow.updatedAt} 기준. 이 블록은 \`npm run flow:sync\`가 다시 쓰므로 \`flow.json\`을 고친 뒤 실행한다.`,
    "",
    "| 게이트 | 상태 | 단계 | 근거 |",
    "|---|---|---|---|",
    ...rows,
    ...(blockers.length ? ["", "차단", "", ...blockers] : []),
  ].join("\n");
}

// One checkbox per gate, checked when it passed. Each gate keeps the description already written after its id.
function todoBlock(flow, current) {
  const described = new Map();
  for (const m of current.matchAll(/^- \[[ xX]\] (\S+) (.+)$/gm)) described.set(m[1], m[2].trim());
  return flow.gates.map((g) => `- [${g.status === "pass" ? "x" : " "}] ${g.id} ${described.get(g.id) ?? g.title}`).join("\n");
}

let flow;
try {
  flow = parseFlow(read(flowFile));
} catch (e) {
  fail(`${flowFile}\n${e.message}`);
}

const statusFile = path.join(docs, "STATUS.md");
const planFile = path.join(docs, "PLAN.md");
const status = read(statusFile);
const plan = read(planFile);
const planTodo = plan.slice(plan.indexOf("<!-- todo:start -->"), plan.indexOf("<!-- todo:end -->"));
// Both files are worked out before either is written, so a bad marker leaves both untouched.
const next = [
  [statusFile, status, replaceBlock(status, "flow", statusBlock(flow), statusFile)],
  [planFile, plan, replaceBlock(plan, "todo", todoBlock(flow, planTodo), planFile)],
];
for (const [file, before, after] of next) {
  if (after !== before) writeFileSync(file, after);
  console.log(`${after === before ? "변경 없음" : "갱신"}  ${path.relative(process.cwd(), file)}`);
}

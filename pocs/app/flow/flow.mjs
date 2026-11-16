// docs/dev-v1/flow.json: its shape check, Korean labels, and the hash `npm run flow:sync` stamps into STATUS.md.
// Shared by the /flow page (at build time) and scripts/flow-sync.mjs, so it is plain JS that Node runs as is.
// Server and script only: it imports node:crypto.
import { createHash } from "node:crypto";

/** @typedef {"plan" | "build" | "critic" | "fix" | "recheck" | "pass"} Kind */
/** @typedef {"todo" | "running" | "pass" | "fail" | "blocked"} Status */
/** @typedef {{ id: string, kind: Kind, title: string, status: Status, agent: string, note: string, evidence: string[] }} Step */
/** @typedef {{ id: string, title: string, status: Status, steps: Step[] }} Gate */
/** @typedef {{ id: string, title: string, status: "open" | "closed" }} Blocker */
/** @typedef {{ updatedAt: string, gates: Gate[], blockers: Blocker[] }} Flow */

/** @type {Record<Kind, string>} */
export const KIND_LABEL = { plan: "계획", build: "구현", critic: "검증", fix: "수정", recheck: "재검증", pass: "판정" };
/** @type {Record<Status, string>} */
export const STATUS_LABEL = { todo: "대기", running: "진행 중", pass: "통과", fail: "실패", blocked: "막힘" };
export const BLOCKER_LABEL = { open: "열림", closed: "해결" };

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
// Evidence is a repo-relative path (a trailing "/" marks a folder). It becomes a GitHub link, so no scheme, no
// absolute path and no way out of the repo.
const isRepoPath = (p) =>
  typeof p === "string" && p.trim() === p && p !== "" && !p.startsWith("/") && !/[\\:\0-\x1f]/.test(p) && !p.split("/").some((s) => s === ".." || s === ".");

/**
 * Parses and checks flow.json. Throws one Error listing every problem with its JSON path.
 * @param {string} raw
 * @returns {Flow}
 */
export function parseFlow(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`flow.json이 JSON이 아니에요: ${e instanceof Error ? e.message : e}`);
  }
  const errors = [];
  const text = (v, at, allowEmpty = false) => {
    if (typeof v !== "string" || (!allowEmpty && !v.trim())) errors.push(`${at}: ${allowEmpty ? "문자열" : "비어 있지 않은 문자열"}이어야 해요`);
  };
  const oneOf = (v, list, at) => {
    if (!list.includes(v)) errors.push(`${at}: ${list.join(" | ")} 중 하나여야 해요 (지금 ${JSON.stringify(v)})`);
  };
  const list = (v, at, nonEmpty = false) => {
    if (!Array.isArray(v)) return errors.push(`${at}: 배열이어야 해요`), [];
    if (nonEmpty && !v.length) errors.push(`${at}: 하나 이상 있어야 해요`);
    return v;
  };
  const ids = new Set();
  const id = (v, at) => {
    text(v, at);
    if (typeof v === "string" && ids.has(v)) errors.push(`${at}: id "${v}"가 겹쳐요`);
    ids.add(v);
  };

  if (!isObject(data)) throw new Error("flow.json 최상위는 객체여야 해요");
  text(data.updatedAt, "updatedAt");
  if (typeof data.updatedAt === "string" && Number.isNaN(Date.parse(data.updatedAt))) errors.push("updatedAt: ISO 8601 날짜여야 해요");
  list(data.gates, "gates", true).forEach((g, i) => {
    const at = `gates[${i}]`;
    if (!isObject(g)) return errors.push(`${at}: 객체여야 해요`);
    id(g.id, `${at}.id`);
    text(g.title, `${at}.title`);
    oneOf(g.status, Object.keys(STATUS_LABEL), `${at}.status`);
    list(g.steps, `${at}.steps`, true).forEach((s, j) => {
      const sat = `${at}.steps[${j}]`;
      if (!isObject(s)) return errors.push(`${sat}: 객체여야 해요`);
      id(s.id, `${sat}.id`);
      oneOf(s.kind, Object.keys(KIND_LABEL), `${sat}.kind`);
      text(s.title, `${sat}.title`);
      oneOf(s.status, Object.keys(STATUS_LABEL), `${sat}.status`);
      text(s.agent, `${sat}.agent`, true);
      text(s.note, `${sat}.note`, true);
      list(s.evidence, `${sat}.evidence`).forEach((p, k) => {
        if (!isRepoPath(p)) errors.push(`${sat}.evidence[${k}]: 저장소 안의 상대 경로여야 해요 (지금 ${JSON.stringify(p)})`);
      });
    });
  });
  list(data.blockers, "blockers").forEach((b, i) => {
    const at = `blockers[${i}]`;
    if (!isObject(b)) return errors.push(`${at}: 객체여야 해요`);
    id(b.id, `${at}.id`);
    text(b.title, `${at}.title`);
    oneOf(b.status, Object.keys(BLOCKER_LABEL), `${at}.status`);
  });
  if (errors.length) throw new Error(`flow.json이 올바르지 않아요\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  return data;
}

/** Whitespace-insensitive content hash of a parsed flow.json. @param {Flow} flow */
export const flowHash = (flow) => createHash("sha256").update(JSON.stringify(flow)).digest("hex").slice(0, 12);

/** @param {Flow} flow */
export const stampLine = (flow) => `<!-- flow:sync updatedAt=${flow.updatedAt} hash=${flowHash(flow)} -->`;

/**
 * The stamp the last `npm run flow:sync` left in STATUS.md, or null.
 * @param {string} statusMd
 * @returns {{ updatedAt: string, hash: string } | null}
 */
export function readStamp(statusMd) {
  const m = /<!-- flow:sync updatedAt=(\S+) hash=([0-9a-f]{12}) -->/.exec(statusMd);
  return m ? { updatedAt: m[1], hash: m[2] } : null;
}

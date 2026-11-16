// G3 key-exposure scan. Never prints a secret: every hit is shown redacted (first 4 characters, then its length).
//   node secrets-scan.mjs history            -> git log -p --all of the repo, added and removed lines
//   node secrets-scan.mjs tree               -> tracked + untracked (not ignored) files in the working tree
//   node secrets-scan.mjs dir <path>...      -> every file under the given folders (e.g. pocs/.next/static)
//   node secrets-scan.mjs envvalues <path>.. -> counts how often each value in the repo's .env appears in git
//                                               history and in the given folders (values stay in memory)
import { execSync, spawn } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../../..");
const PATTERNS = [
  ["openai/anthropic sk-", /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g],
  ["aws AKIA", /\bAKIA[0-9A-Z]{16}\b/g],
  ["github token gh?_", /\bgh[opusr]_[A-Za-z0-9]{30,}/g],
  ["github_pat_", /\bgithub_pat_[A-Za-z0-9_]{20,}/g],
  ["slack xox", /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["postgres url with password", /\bpostgres(?:ql)?:\/\/[^:\/\s@'"]+:[^@\s'"]+@[^\s'"]+/g],
  ["google AIza", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["npm token", /\bnpm_[A-Za-z0-9]{36}\b/g],
  // JEV_KEY, OPENAI_API_KEY, CLAUDE_KEY, VERCEL_TOKEN, ... and DATABASE_URL, assigned a literal of 8+ characters
  ["named key with a value", /\b(?:[A-Z][A-Z0-9_]*_(?:API_)?(?:KEY|TOKEN|SECRET)|DATABASE_URL)\s*[=:]\s*["']?[^\s"'$<>{}()`,;]{8,}/g],
];
const redact = (s) => (/^postgres/.test(s) ? s.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@").replace(/@[^/]+/, "@<host>") : `${s.slice(0, 4)}…(${s.length} chars)`);

// Next.js internals in its own bundled code (PAGE_SEGMENT_KEY = "__PAGE__", REQUEST_INSIGHTS_STORE_KEY = Symbol.for(...)): names, not keys.
const NEXT_CONSTANT = /^[A-Z_]+_(?:SEGMENT|REQUEST|STORE|RECORDER)_KEY\b/;
const hits = [];
let skipped = 0;
function scanLine(line, where) {
  for (const [name, re] of PATTERNS)
    for (const m of line.matchAll(re)) {
      if (NEXT_CONSTANT.test(m[0])) skipped++;
      else hits.push(`${name}\t${where}\t${redact(m[0])}`);
    }
}
function report(label) {
  console.log(`# ${label}: ${hits.length} hit(s)${skipped ? `, ${skipped} Next.js internal constant(s) (*_SEGMENT_KEY, *_REQUEST_KEY, *_STORE_KEY, *_RECORDER_KEY) skipped` : ""}`);
  for (const h of hits) console.log(h);
}
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const binary = (buf) => buf.subarray(0, 8000).includes(0);

function envValues() {
  const file = path.join(repo, ".env");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").flatMap((l) => {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l);
    if (!m) return [];
    const v = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    return v.length >= 8 ? [[m[1], v]] : [[m[1], null]];
  });
}

const [mode, ...args] = process.argv.slice(2);
if (mode === "history") {
  const git = spawn("git", ["log", "-p", "--all", "--no-color", "--format=commit %h"], { cwd: repo });
  let commit = "", file = "";
  for await (const line of createInterface({ input: git.stdout, crlfDelay: Infinity })) {
    if (line.startsWith("commit ")) commit = line.slice(7);
    else if (line.startsWith("+++ b/")) file = line.slice(6);
    else if ((line[0] === "+" || line[0] === "-") && !line.startsWith("+++") && !line.startsWith("---")) scanLine(line, `${commit}:${file}`);
  }
  report("git log -p --all");
} else if (mode === "tree") {
  const files = execSync("git ls-files -co --exclude-standard -z", { cwd: repo }).toString().split("\0").filter(Boolean);
  for (const f of files) {
    const p = path.join(repo, f);
    if (!existsSync(p) || statSync(p).isDirectory()) continue;
    const buf = readFileSync(p);
    if (binary(buf)) continue;
    buf.toString("utf8").split("\n").forEach((l, i) => scanLine(l, `${f}:${i + 1}`));
  }
  report(`working tree, ${files.length} tracked or untracked-unignored files`);
} else if (mode === "dir") {
  for (const d of args) for (const p of walk(path.resolve(d))) {
    const buf = readFileSync(p);
    if (binary(buf)) continue;
    buf.toString("utf8").split("\n").forEach((l, i) => scanLine(l, `${path.relative(repo, p)}:${i + 1}`));
  }
  report(`folders ${args.join(", ")}`);
} else if (mode === "envvalues") {
  const vals = envValues();
  console.log(`# .env at repo root: ${vals.length} variable(s): ${vals.map(([k, v]) => `${k}${v ? "" : " (empty or short)"}`).join(", ") || "none"}`);
  const history = execSync("git log -p --all --no-color", { cwd: repo, maxBuffer: 1 << 30 }).toString();
  const folders = args.flatMap((d) => walk(path.resolve(d)).map((p) => [path.relative(repo, p), readFileSync(p).toString("latin1")]));
  const tracked = execSync("git ls-files -co --exclude-standard -z", { cwd: repo }).toString().split("\0").filter(Boolean)
    .filter((f) => existsSync(path.join(repo, f)) && !statSync(path.join(repo, f)).isDirectory())
    .map((f) => [f, readFileSync(path.join(repo, f)).toString("latin1")]);
  for (const [k, v] of vals) {
    if (!v) continue;
    const latin = Buffer.from(v, "utf8").toString("latin1");
    const inHistory = history.split(v).length - 1;
    const inTree = tracked.filter(([, t]) => t.includes(latin)).map(([f]) => f);
    const inDirs = folders.filter(([, t]) => t.includes(latin)).map(([f]) => f);
    console.log(`${k}: git history ${inHistory}, working tree ${inTree.length}${inTree.length ? ` (${inTree.join(", ")})` : ""}, ${args.join("+") || "folders"} ${inDirs.length}${inDirs.length ? ` (${inDirs.slice(0, 5).join(", ")})` : ""}`);
  }
} else {
  console.error("usage: secrets-scan.mjs history | tree | dir <path>... | envvalues <path>...");
  process.exit(2);
}

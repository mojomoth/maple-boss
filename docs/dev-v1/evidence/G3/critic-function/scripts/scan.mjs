// Critic secret scan. Prints names, paths and counts only; never a value.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
const repo = "/Users/jeongyounglee/work/repo/maple-boss";
const PATTERNS = [
  ["sk- key", /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/],
  ["AKIA", /\bAKIA[0-9A-Z]{16}\b/],
  ["github token", /\bgh[opusr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ["slack", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["postgres url w/ password", /\bpostgres(?:ql)?:\/\/[^:\/\s@'"]+:[^@\s'"]{3,}@/],
  ["neon npg_", /\bnpg_[A-Za-z0-9]{8,}/],
  ["google AIza", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["npm token", /\bnpm_[A-Za-z0-9]{36}\b/],
  ["vercel token assignment", /\bVERCEL_(?:TOKEN|OIDC_TOKEN)\s*[=:]\s*["']?[A-Za-z0-9._-]{16,}/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["named secret assignment", /\b[A-Z][A-Z0-9_]*_(?:API_KEY|KEY|TOKEN|SECRET|PASSWORD)\s*[=:]\s*["']?[A-Za-z0-9_\-./+]{12,}/],
];
const env = existsSync(path.join(repo, ".env"))
  ? readFileSync(path.join(repo, ".env"), "utf8").split("\n").flatMap((l) => {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l);
      if (!m) return [];
      const v = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
      return v.length >= 8 ? [[m[1], v]] : [];
    })
  : [];
console.log(`.env at repo root: ${existsSync(path.join(repo, ".env")) ? "present" : "absent"}; ${env.length} value(s) of 8+ chars: ${env.map(([k]) => k).join(", ")}`);

function scanText(text, where, hits) {
  for (const [name, re] of PATTERNS) {
    const g = new RegExp(re.source, "g");
    let n = 0; for (const _ of text.matchAll(g)) n++;
    if (n) hits.push(`${name} x${n} in ${where}`);
  }
  for (const [k, v] of env) if (text.includes(v)) hits.push(`.env value of ${k} in ${where}`);
}
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); const s = statSync(p); return s.isDirectory() ? walk(p) : s.size < 20e6 ? [p] : []; });

// 1. history
{
  const hits = [];
  const log = execFileSync("git", ["log", "-p", "--all", "--no-color", "--format=@@commit %h"], { cwd: repo, maxBuffer: 2e9 }).toString("utf8");
  const parts = log.split("\n@@commit ");
  for (const p of parts) scanText(p, `commit ${p.slice(0, 7).replace(/^@@commit /, "")}`, hits);
  const commits = execFileSync("git", ["rev-list", "--all", "--count"], { cwd: repo }).toString().trim();
  console.log(`# git history (${commits} commits, ${(log.length / 1e6).toFixed(1)} MB of patches): ${hits.length} hit(s)`);
  for (const h of hits) console.log("  " + h);
}
// 2. working tree: tracked + untracked, not ignored
{
  const hits = [];
  const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: repo, maxBuffer: 1e9 }).toString().split("\0").filter(Boolean);
  let n = 0;
  for (const f of files) {
    const p = path.join(repo, f);
    if (!existsSync(p) || statSync(p).isDirectory() || statSync(p).size > 20e6) continue;
    const buf = readFileSync(p);
    if (buf.subarray(0, 8000).includes(0)) continue;
    n++;
    scanText(buf.toString("utf8"), f, hits);
  }
  console.log(`# working tree (${n} text files, tracked + untracked not ignored): ${hits.length} hit(s)`);
  for (const h of hits) console.log("  " + h);
}
// 3. build output
for (const dir of ["pocs/.next/static", "pocs/.next/server"]) {
  const hits = [];
  const files = walk(path.join(repo, dir));
  for (const p of files) scanText(readFileSync(p).toString("utf8"), path.relative(repo, p), hits);
  console.log(`# ${dir} (${files.length} files): ${hits.length} hit(s)`);
  for (const h of hits.slice(0, 30)) console.log("  " + h);
}
// 4. server-only code in client chunks
{
  const files = walk(path.join(repo, "pocs/.next/static"));
  const needles = ["DATABASE_URL", "pg_advisory_xact_lock", "CREATE TABLE", "crawl.py", "MAPLE_DB", "process.env", "/Users/", "boss300_stat\":", "server-only", "sourceMappingURL"];
  for (const n of needles) {
    const where = files.filter((p) => readFileSync(p).toString("utf8").includes(n)).map((p) => path.relative(repo, p));
    console.log(`client chunks containing ${JSON.stringify(n)}: ${where.length}${where.length ? " -> " + where.slice(0, 4).join(", ") : ""}`);
  }
  console.log(`source maps (.map) in static: ${files.filter((p) => p.endsWith(".map")).length}`);
}

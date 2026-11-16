// For every export in the app's own source files, count the files (other than its own) that mention its name.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const root = process.argv[2];
const files = execSync("git ls-files -co --exclude-standard", { cwd: root, encoding: "utf8" })
  .split("\n").filter((f) => /\.(ts|tsx|mjs)$/.test(f));
const text = Object.fromEntries(files.map((f) => [f, readFileSync(`${root}/${f}`, "utf8")]));
const rows = [];
for (const f of files) {
  for (const m of text[f].matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class|type|interface|let)\s+([A-Za-z_$][\w$]*)/g)) {
    const n = m[1];
    const re = new RegExp(`\\b${n.replace("$", "\\$")}\\b`);
    const users = files.filter((g) => g !== f && re.test(text[g]));
    const inner = (text[f].match(new RegExp(`\\b${n}\\b`, "g")) || []).length;
    rows.push([users.length, inner, f, n, users.join(",")]);
  }
}
rows.sort((a, b) => a[0] - b[0]);
for (const r of rows) console.log(r.join("\t"));

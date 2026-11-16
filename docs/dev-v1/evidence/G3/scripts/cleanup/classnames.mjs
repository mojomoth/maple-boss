// Every class token the TSX files use, minus the ones our CSS defines: what is left would need Tailwind.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
const root = process.argv[2];
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const all = walk(path.join(root, "app"));
const cssText = all.filter((f) => f.endsWith(".css")).map((f) => readFileSync(f, "utf8")).join("\n");
const defined = new Set([...cssText.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
const tokens = new Map();
for (const f of all.filter((f) => f.endsWith(".tsx"))) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/g)) {
    const s = (m[1] ?? m[2] ?? m[3]).replace(/\$\{[^}]*\}/g, " ");
    for (const tok of s.match(/[A-Za-z][\w:/\[\]-]*/g) ?? []) {
      if (!tokens.has(tok)) tokens.set(tok, new Set());
      tokens.get(tok).add(path.relative(root, f));
    }
  }
}
for (const [tok, fs] of tokens) if (!defined.has(tok)) console.log(tok, [...fs].join(","));

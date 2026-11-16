// Class selectors in the app's CSS files that no .tsx/.ts/.mjs file under app/ mentions as a whole word.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
const root = process.argv[2];
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const all = walk(path.join(root, "app"));
const css = all.filter((f) => f.endsWith(".css"));
const src = all.filter((f) => /\.(tsx?|mjs)$/.test(f)).map((f) => readFileSync(f, "utf8")).join("\n");
for (const f of css) {
  const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const classes = new Set([...text.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]).filter((c) => !/^\d/.test(c)));
  for (const c of classes) {
    const re = new RegExp(`(^|[^\\w-])${c}($|[^\\w-])`);
    if (!re.test(src)) console.log(`${path.relative(root, f)}\t.${c}`);
  }
}

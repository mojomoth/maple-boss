// Custom properties declared in app/*.css that no CSS or TSX file reads with var(--name).
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
const root = process.argv[2];
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(path.join(root, "app")).filter((f) => /\.(css|tsx?|mjs)$/.test(f));
const text = files.map((f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")).join("\n");
const declared = new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const used = new Set([...text.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]));
// Canvas.tsx sets geometry vars as object keys ("--pad": ...), read by flow.css; layout.tsx sets --font-noto via next/font.
for (const d of [...declared].sort()) if (!used.has(d)) console.log(d);
console.log("-- read but not declared in app CSS:", [...used].filter((u) => !declared.has(u)).join(" "));

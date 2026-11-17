// Download production HTML + every referenced /_next static asset (recursively through chunks) + headers into a dir.
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = "https://maple-boss-livid.vercel.app";
const dir = process.argv[2];
mkdirSync(dir, { recursive: true });
const pages = ["/", "/flow", "/import", "/pocs/character", "/pocs/boss", "/pocs/party", "/no-such-page", "/?boss=hard-lotus", "/api/health", "/api/character", "/api/boss", "/api/party", "/api/party/requests"];
const seen = new Set(); const queue = [];
let i = 0; let headers = "";
const save = (name, body) => writeFileSync(`${dir}/${String(i++).padStart(3, "0")}_${name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)}`, body);
const refs = (text) => [...text.matchAll(/\/_next\/static\/[A-Za-z0-9_\-./~%]+?\.(?:js|css|woff2|json|txt|map)/g)].map((m) => m[0]);
for (const p of pages) {
  for (const rsc of [false, true]) {
    if (rsc && p.startsWith("/api")) continue;
    const r = await fetch(BASE + p, { headers: rsc ? { rsc: "1" } : {} });
    const t = await r.text();
    headers += `## ${rsc ? "RSC " : ""}${p} ${r.status}\n${[...r.headers].map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n`;
    save(`${rsc ? "rsc" : "page"}${p}`, t);
    for (const u of refs(t)) if (!seen.has(u)) { seen.add(u); queue.push(u); }
  }
}
while (queue.length) {
  const u = queue.shift();
  const r = await fetch(BASE + u);
  const t = await r.text();
  if (u.endsWith(".js") || u.endsWith(".css")) { headers += `## ${u} ${r.status}\n${[...r.headers].map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n`; }
  save(u.split("/").pop(), t);
  for (const v of refs(t)) if (!seen.has(v)) { seen.add(v); queue.push(v); }
}
// source maps?
let maps = 0;
for (const u of [...seen].filter((u) => u.endsWith(".js"))) { const r = await fetch(BASE + u + ".map"); if (r.status === 200) maps++; }
writeFileSync(`${dir}/zz_headers.txt`, headers);
console.log(`saved ${i} files (${seen.size} static assets: ${[...seen].filter((u) => u.endsWith(".js")).length} js, ${[...seen].filter((u) => u.endsWith(".css")).length} css); source maps served: ${maps}`);

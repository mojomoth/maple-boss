// Parallel GET /api/character N times; report which non-seed names appear. Optionally DELETE bursts for given names.
const BASE = "https://maple-boss-livid.vercel.app";
const SEEDS = new Set(["강은호", "아델", "고딩"]);
const [mode, ...names] = process.argv.slice(2);
const N = 30;
if (mode === "scan") {
  const res = await Promise.all(Array.from({ length: N }, async () => {
    const t = Date.now();
    const r = await fetch(BASE + "/api/character", { headers: { "cache-control": "no-cache" } });
    const j = await r.json();
    return { ms: Date.now() - t, extra: j.map((c) => c.name).filter((n) => !SEEDS.has(n)), seeds: j.filter((c) => SEEDS.has(c.name)).length };
  }));
  const extras = {};
  for (const r of res) for (const n of r.extra) extras[n] = (extras[n] ?? 0) + 1;
  console.log(`scan ${N} parallel: seeds-all-present ${res.filter((r) => r.seeds === 3).length}/${N}, non-seed names:`, JSON.stringify(extras), `ms max ${Math.max(...res.map((r) => r.ms))}`);
  const pr = await Promise.all(Array.from({ length: N }, async () => (await (await fetch(BASE + "/api/party")).json()).length));
  const rq = await Promise.all(Array.from({ length: N }, async () => (await (await fetch(BASE + "/api/party/requests")).json()).length));
  console.log(`parties per instance: ${JSON.stringify(pr)}\nrequests per instance: ${JSON.stringify(rq)}`);
} else if (mode === "delete") {
  for (const n of names) {
    const st = await Promise.all(Array.from({ length: 60 }, async () => (await fetch(BASE + "/api/character/" + encodeURIComponent(n), { method: "DELETE" })).status));
    const c = {}; for (const s of st) c[s] = (c[s] ?? 0) + 1;
    console.log(`DELETE burst ${n}:`, JSON.stringify(c));
  }
}

// Close open party requests the D-3 UI run left on API instances (by forming 1-member parties), then delete those parties.
const BASE = "https://maple-boss-livid.vercel.app";
const BOSS = "extreme-kaling";
const names = process.argv.slice(2);
const scan = async () => {
  const r = await Promise.all(Array.from({ length: 30 }, async () => (await (await fetch(BASE + "/api/party/requests")).json()).map((s) => `${s.character.name}@${s.bossId}`)));
  const c = {}; for (const l of r) for (const x of l) c[x] = (c[x] ?? 0) + 1;
  const p = await Promise.all(Array.from({ length: 30 }, async () => (await (await fetch(BASE + "/api/party")).json()).map((x) => x.id)));
  return { requests: c, partiesPerInstance: p.map((x) => x.length).join("") };
};
console.log("before", JSON.stringify(await scan()));
const ids = new Set();
for (let round = 0; round < 3; round++) {
  for (const n of names) {
    const rs = await Promise.all(Array.from({ length: 60 }, async () => {
      const r = await fetch(BASE + "/api/party", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bossId: BOSS, members: [n] }) });
      return { s: r.status, j: await r.json() };
    }));
    for (const r of rs) if (r.s === 201) ids.add(r.j.id);
    console.log(`round ${round} close ${n}: 201 x${rs.filter((r) => r.s === 201).length}, ids ${rs.filter((r) => r.s === 201).map((r) => r.j.id)}`);
  }
}
for (let round = 0; round < 3; round++) for (const id of ids) {
  const st = await Promise.all(Array.from({ length: 60 }, async () => (await fetch(BASE + "/api/party/" + id, { method: "DELETE" })).status));
  console.log(`round ${round} DELETE party ${id}: 204 x${st.filter((s) => s === 204).length}`);
}
console.log("after", JSON.stringify(await scan()));

// Critic hostile API probe. Never sends a POST /api/character that would pass validation (no crawl).
import { readFileSync } from "node:fs";
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const SEED = JSON.parse(readFileSync("/Users/jeongyounglee/work/repo/maple-boss/pocs/seed/아델.json", "utf8"));
const tag = "cr" + Date.now().toString(36).slice(-4);
const created = new Set();
const parties = new Set();
const out = [];
const log = (s) => { out.push(s); console.log(s); };

async function call(method, path, body, headers = {}) {
  const init = { method, headers: { ...headers }, redirect: "manual" };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    init.headers["content-type"] ??= "application/json";
  }
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, json, text, ct: res.headers.get("content-type") ?? "" };
}
const short = (r) => `${r.status} ${r.ct.split(";")[0]} ${r.text.length > 160 ? r.text.slice(0, 160) + "…" : r.text}`;
const isErr = (r) => typeof r.json?.error === "string" && /[가-힣]/.test(r.json.error);
function verdict(label, r, want) {
  const ok = want(r);
  log(`${ok ? "ok  " : "BAD "} ${label} -> ${short(r)}`);
  return r;
}
const named = (name, extra = {}) => ({ ...SEED, info: { ...SEED.info, character_name: name, ...extra } });

async function imp(name, label) {
  const r = await call("POST", "/api/character/import", named(name));
  if (r.status === 201) created.add(r.json.name);
  return verdict(`import ${label ?? JSON.stringify(name)}`, r, (r) => r.status === 201 || (r.status === 400 && isErr(r)));
}

async function main() {
  log(`# hostile ${BASE} tag=${tag}`);
  // --- weird but storable names: can they be imported AND deleted the way the UI deletes (encodeURIComponent)?
  const weird = [`${tag}/x`, `${tag}%x`, `${tag}?x`, `${tag}#x`, `${tag}\nx`, `${tag}\\x`, "import", "rates", `${tag}.`, `...`, `${tag}<b>`, `${tag}%2F`, `${tag} x`, `${tag}​`, `${tag}\t`, `${tag}+x`, `${tag};x`];
  for (const n of weird) {
    const pre = await call("GET", "/api/character");
    const existed = Array.isArray(pre.json) && pre.json.some((c) => c.name === n);
    if (existed) { log(`skip ${JSON.stringify(n)}: already exists`); continue; }
    const r = await imp(n);
    if (r.status !== 201) continue;
    const stored = r.json.name;
    const d = await call("DELETE", `/api/character/${encodeURIComponent(stored)}`);
    const ok = d.status === 204;
    if (ok) created.delete(stored);
    log(`${ok ? "ok  " : "BAD "}   delete ${JSON.stringify(stored)} via encodeURIComponent -> ${short(d)}`);
  }

  // --- POST /api/character validation (all must be 400, never reaching the crawler)
  for (const [label, body] of [
    ["NUL name", { name: "a\u0000b" }],
    ["lone surrogate", { name: "a\ud800" }],
    ["21 chars", { name: "가".repeat(21) }],
    ["number", { name: 12345 }],
    ["array", { name: ["a"] }],
    ["spaces", { name: "   " }],
    ["null body", null],
    ["string body", "\"abc\""],
  ]) verdict(`POST /api/character ${label}`, await call("POST", "/api/character", body), (r) => r.status === 400 && isErr(r));

  // --- import edge cases
  const deep = "[".repeat(200000) + "]".repeat(200000);
  verdict("import deeply nested JSON", await call("POST", "/api/character/import", deep), (r) => r.status === 400 && isErr(r));
  verdict("import triple-encoded", await call("POST", "/api/character/import", JSON.stringify(JSON.stringify(JSON.stringify(named(`${tag}t`))))), (r) => r.status === 400 && isErr(r));
  const dbl = await call("POST", "/api/character/import", JSON.stringify(JSON.stringify(named(`${tag}d`))));
  if (dbl.status === 201) created.add(dbl.json.name);
  verdict("import double-encoded string -> 201", dbl, (r) => r.status === 201);
  verdict("import __proto__ pollution", await call("POST", "/api/character/import", `{"__proto__":{"v":1},"state":{"__proto__":{"x":1}}}`), (r) => r.status === 400 && isErr(r));
  verdict("import javascript: image", await call("POST", "/api/character/import", named(`${tag}j`, { character_image: "javascript:alert(1)" })), (r) => r.status === 400 && isErr(r));
  verdict("import data: image", await call("POST", "/api/character/import", named(`${tag}j`, { character_image: "data:image/png;base64,AAAA" })), (r) => r.status === 400 && isErr(r));
  verdict("import //evil image", await call("POST", "/api/character/import", named(`${tag}j`, { character_image: "//evil.example/x.png" })), (r) => r.status === 400 && isErr(r));
  const big = { ...SEED, calc: { ...SEED.calc, bossCuts: SEED.calc.bossCuts.map((c) => ({ ...c, clearRate: 1e6 })) } };
  big.info = { ...SEED.info, character_name: `${tag}max` };
  const rb = await call("POST", "/api/character/import", big);
  if (rb.status === 201) created.add(rb.json.name);
  verdict("import clearRate at cap 1e6 -> 201", rb, (r) => r.status === 201);
  const over = structuredClone(big); over.info.character_name = `${tag}ov`; over.calc.bossCuts[0].clearRate = 1e6 + 1;
  verdict("import clearRate over cap -> 400", await call("POST", "/api/character/import", over), (r) => r.status === 400 && isErr(r));
  const neg = structuredClone(big); neg.info.character_name = `${tag}ng`; neg.calc.bossCuts[0].clearRate = -1;
  verdict("import negative clearRate -> 400", await call("POST", "/api/character/import", neg), (r) => r.status === 400 && isErr(r));
  const nan = JSON.stringify(named(`${tag}nan`)).replace(/"combatPower":\d+/, '"combatPower":1e400');
  verdict("import combatPower 1e400 (Infinity) -> 400", await call("POST", "/api/character/import", nan), (r) => r.status === 400 && isErr(r));
  const many = structuredClone(big); many.info.character_name = `${tag}mn`; many.calc.bossCuts = Array.from({ length: 101 }, () => SEED.calc.bossCuts[0]);
  verdict("import 101 bossCuts -> 400", await call("POST", "/api/character/import", many), (r) => r.status === 400 && isErr(r));
  verdict("import text/plain content-type, empty", await call("POST", "/api/character/import", "", { "content-type": "text/plain" }), (r) => r.status === 400 && isErr(r));
  verdict("import content-length lie (huge)", await call("POST", "/api/character/import", "{}", { "content-length": "2" }), (r) => r.status === 400 && isErr(r));

  // --- rates / delete / boss
  verdict("rates name=NUL", await call("GET", "/api/character/rates?name=%00"), (r) => r.status === 404 && isErr(r));
  verdict("rates name=lone surrogate %ED%A0%80", await call("GET", "/api/character/rates?name=%ED%A0%80"), (r) => r.status >= 400 && r.status < 500 && isErr(r));
  verdict("rates name repeated", await call("GET", "/api/character/rates?name=a&name=b"), (r) => r.status === 404 && isErr(r));
  verdict("DELETE /api/character/%00", await call("DELETE", "/api/character/%00"), (r) => r.status === 404 && isErr(r));
  verdict("DELETE /api/character/%ED%A0%80 (surrogate bytes)", await call("DELETE", "/api/character/%ED%A0%80"), (r) => r.status >= 400 && r.status < 500 && isErr(r));
  verdict("DELETE /api/character/ (empty)", await call("DELETE", "/api/character/"), (r) => r.status >= 400 && isErr(r));
  verdict("DELETE /api/character/a/b", await call("DELETE", "/api/character/a/b"), (r) => r.status === 404 && isErr(r));
  verdict("GET /api/boss?q=50k chars", await call("GET", "/api/boss?q=" + "카".repeat(50000)), (r) => r.status === 200 || (r.status >= 400 && r.status < 500 && isErr(r)));
  verdict("GET /api/boss?q=a&q=b", await call("GET", "/api/boss?q=%EC%B9%B4&q=b"), (r) => r.status === 200);
  verdict("GET /api/boss/%00", await call("GET", "/api/boss/%00"), (r) => r.status === 404 && isErr(r));
  verdict("GET /api/boss/__proto__", await call("GET", "/api/boss/__proto__"), (r) => r.status === 404 && isErr(r));
  verdict("GET /api/boss/constructor", await call("GET", "/api/boss/constructor"), (r) => r.status === 404 && isErr(r));
  verdict("GET /api/boss/%E0%A4%A bad enc", await call("GET", "/api/boss/%E0%A4%A"), (r) => r.status === 400 && isErr(r));
  verdict("GET /api/character?x=%E0%A4%A bad enc in query", await call("GET", "/api/character?x=%E0%A4%A"), (r) => r.status === 200);
  verdict("GET /api", await call("GET", "/api"), (r) => r.status === 404 && isErr(r));
  verdict("OPTIONS /api/party", await call("OPTIONS", "/api/party"), (r) => r.status < 500);
  verdict("HEAD /api/character/import", await call("HEAD", "/api/character/import"), (r) => r.status === 405);
  verdict("PATCH /api/health", await call("PATCH", "/api/health"), (r) => r.status === 405 && isErr(r));

  // --- party requests
  verdict("requests body []", await call("POST", "/api/party/requests", []), (r) => r.status === 400 && isErr(r));
  verdict("requests body \"x\"", await call("POST", "/api/party/requests", "\"x\""), (r) => r.status === 400 && isErr(r));
  verdict("requests body null", await call("POST", "/api/party/requests", "null"), (r) => r.status === 400 && isErr(r));
  verdict("requests characterName NUL", await call("POST", "/api/party/requests", { characterName: "\u0000", bossId: "extreme-kaling", partySize: 2 }), (r) => r.status === 400 && isErr(r));
  verdict("requests characterName lone surrogate", await call("POST", "/api/party/requests", '{"characterName":"\\ud800","bossId":"extreme-kaling","partySize":2}'), (r) => r.status === 400 && isErr(r));
  verdict("requests bossId NUL", await call("POST", "/api/party/requests", { characterName: "아델", bossId: "\u0000", partySize: 2 }), (r) => r.status === 400 && isErr(r));
  for (const ps of [0, -1, 1.5, 7, 1e308, null, true, "2", [2], { a: 1 }]) {
    verdict(`requests partySize ${JSON.stringify(ps)}`, await call("POST", "/api/party/requests", { characterName: `${tag}max`, bossId: "extreme-kaling", partySize: ps }), (r) => r.status === 400 && isErr(r));
  }
  verdict("requests GET bossId=%00", await call("GET", "/api/party/requests?bossId=%00"), (r) => r.status === 200 && Array.isArray(r.json) && r.json.length === 0);
  verdict("requests GET bossId=x' OR 1=1--", await call("GET", "/api/party/requests?bossId=" + encodeURIComponent("x' OR 1=1--")), (r) => r.status === 200 && Array.isArray(r.json) && r.json.length === 0);

  // --- party formation
  verdict("party members 10000 names", await call("POST", "/api/party", { bossId: "extreme-kaling", members: Array.from({ length: 10000 }, (_, i) => "n" + i) }), (r) => r.status === 400 && isErr(r));
  verdict("party members [NUL]", await call("POST", "/api/party", { bossId: "extreme-kaling", members: ["\u0000"] }), (r) => r.status === 400 && isErr(r));
  verdict("party members [lone surrogate]", await call("POST", "/api/party", '{"bossId":"extreme-kaling","members":["\\ud800"]}'), (r) => r.status === 400 && isErr(r));
  verdict("party members [1,2]", await call("POST", "/api/party", { bossId: "extreme-kaling", members: [1, 2] }), (r) => r.status === 400 && isErr(r));
  verdict("party bossId object", await call("POST", "/api/party", { bossId: { a: 1 }, members: ["a"] }), (r) => r.status === 400 && isErr(r));
  verdict("party members SQL-ish", await call("POST", "/api/party", { bossId: "extreme-kaling", members: ["'); DROP TABLE parties;--"] }), (r) => r.status === 400 && isErr(r));
  const longName = "가".repeat(200000);
  const rl = await call("POST", "/api/party", { bossId: "extreme-kaling", members: [longName] });
  verdict("party member 200k-char name (echo size)", rl, (r) => r.status === 400 && isErr(r));
  log(`     echoed error length: ${rl.text.length}`);
  for (const id of ["0", "-1", "1e3", "2147483648", "00001", "1.0", "%20", "abc", "99999999999"]) {
    verdict(`DELETE /api/party/${id}`, await call("DELETE", `/api/party/${id}`), (r) => r.status === 404 && isErr(r));
  }

  // --- concurrency: same two members, 6 concurrent formations -> exactly one 201
  const a = `${tag}max`; // has clearRate 1e6 on every boss
  const imp2 = await call("POST", "/api/character/import", (() => { const p = structuredClone(big); p.info.character_name = `${tag}max2`; return p; })());
  if (imp2.status === 201) created.add(imp2.json.name);
  const b = `${tag}max2`;
  for (const n of [a, b]) verdict(`request ${n}`, await call("POST", "/api/party/requests", { characterName: n, bossId: "extreme-kaling", partySize: 2 }), (r) => r.status === 201);
  const before = (await call("GET", "/api/party")).json.length;
  const rs = await Promise.all(Array.from({ length: 6 }, () => call("POST", "/api/party", { bossId: "extreme-kaling", members: [a, b] })));
  for (const r of rs) if (r.status === 201) parties.add(r.json.id);
  const wins = rs.filter((r) => r.status === 201).length;
  log(`${wins === 1 ? "ok  " : "BAD "} concurrent formation: ${rs.map((r) => r.status).join(",")} -> ${wins} party`);
  log(`     losers: ${[...new Set(rs.filter((r) => r.status !== 201).map((r) => r.json?.error))].join(" | ")}`);
  const after = (await call("GET", "/api/party")).json;
  log(`${after.length - before === wins ? "ok  " : "BAD "} parties grew by ${after.length - before} (no orphan rows)`);
  const mine = after.filter((p) => parties.has(p.id));
  log(`     party members: ${JSON.stringify(mine.map((p) => ({ id: p.id, n: p.members.length, sum: p.sum, clearable: p.clearable })))}`);
  // the party keeps names after the character is deleted (snapshot)

  // --- cleanup
  for (const id of parties) log(`cleanup DELETE /api/party/${id} -> ${(await call("DELETE", `/api/party/${id}`)).status}`);
  for (const n of created) log(`cleanup DELETE character ${JSON.stringify(n)} -> ${(await call("DELETE", `/api/character/${encodeURIComponent(n)}`)).status}`);
}
main().catch((e) => { console.error("probe crashed:", e); process.exitCode = 2; });

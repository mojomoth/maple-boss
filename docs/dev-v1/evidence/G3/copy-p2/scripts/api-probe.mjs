// G3 P2 API probes (API-1, -2, -3, -7, -9) against BASE_URL. Never makes the server crawl: POST /api/character
// only gets names that must be refused before the crawler. Temp characters are deleted at the end.
import { readFileSync } from "node:fs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const seed = JSON.parse(readFileSync(new URL("../../../../../../pocs/seed/아델.json", import.meta.url), "utf8"));
const tag = Date.now().toString(36).slice(-4);
const made = new Set();
let fails = 0;

async function call(method, path, body, raw = false) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.body = raw ? body : JSON.stringify(body);
    init.headers["content-type"] = "application/json";
  }
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, type: res.headers.get("content-type") ?? "" };
}
const show = (r) => `${r.status} ${r.json ? JSON.stringify(r.json).slice(0, 110) : `${r.type} ${JSON.stringify(r.text.slice(0, 60))}`}`;
function check(label, r, status, test = (j) => typeof j?.error === "string" && /[가-힣]/.test(j.error)) {
  const ok = r.status === status && test(r.json);
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label} -> ${show(r)}`);
  return ok;
}
const payload = (name, edit = () => {}) => {
  const p = structuredClone(seed);
  p.info.character_name = name;
  edit(p);
  return p;
};
async function importAs(label, p, status, test) {
  const r = await call("POST", "/api/character/import", p);
  if (r.status === 201) made.add(r.json.name);
  return check(label, r, status, test);
}

console.log(`# api-probe ${BASE} tag=${tag}`);
// API-1: '.' and '..' are refused at parse time (they could be imported but never deleted)
await importAs("import name '..'", payload(".."), 400);
await importAs("import name '.'", payload(" . "), 400);
await importAs("import name 'a.b' still fine", payload(`a.b${tag}`), 201, (j) => j.name === `a.b${tag}`);
// API-2: clearRate upper bound; real big rates stay
await importAs("import clearRate 1e308", payload(`big${tag}`, (p) => (p.calc.bossCuts[0].clearRate = 1e308)), 400);
await importAs("import clearRate 2e6", payload(`big${tag}`, (p) => (p.calc.bossCuts[0].clearRate = 2e6)), 400);
await importAs("import clearRate 17832.188 (노말 스우) kept", payload(`swoo${tag}`, (p) => (p.calc.bossCuts[0].clearRate = 17832.188)), 201, (j) => j.name === `swoo${tag}`);
// API-3: NUL and lone surrogates -> 400, not 500
await importAs("import name with NUL", payload(`nul\u0000${tag}`), 400);
await importAs("import name with lone surrogate", payload(`s\ud800${tag}`), 400);
await importAs("import world_name with NUL", payload(`w${tag}`, (p) => (p.info.world_name = "스카\u0000니아")), 400);
await importAs("import analytics with NUL", payload(`an${tag}`, (p) => (p.calc.bossCuts[0].analytics = "x\u0000")), 400);
await importAs("import emoji name (well-formed pair) fine", payload(`🐉${tag}`), 201, (j) => j.name === `🐉${tag}`);
check("POST /api/character name with NUL (refused before the crawler)", await call("POST", "/api/character", { name: "a\u0000b" }), 400);
check("GET /api/character/rates?name=<NUL>", await call("GET", "/api/character/rates?name=a%00b"), 404);
check("DELETE /api/character/<NUL>", await call("DELETE", "/api/character/a%00b"), 404);
check("GET /api/party/requests?bossId=<NUL>", await call("GET", "/api/party/requests?bossId=a%00b"), 200, (j) => Array.isArray(j) && j.length === 0);
// API-9: partySize must be an integer number
const A = `swoo${tag}`;
for (const size of ["2", true, [2], null, 2.5, "abc"])
  check(`POST /api/party/requests partySize=${JSON.stringify(size)}`, await call("POST", "/api/party/requests", { characterName: A, bossId: "extreme-kaling", partySize: size }), 400);
check("POST /api/party/requests partySize=2", await call("POST", "/api/party/requests", { characterName: A, bossId: "extreme-kaling", partySize: 2 }), 201, (j) => j.ok === true);
check("POST /api/party members with non-strings", await call("POST", "/api/party", { bossId: "extreme-kaling", members: [{}, 1] }), 400);
// API-7: every failure is { error }
check("POST /api/party invalid JSON", await call("POST", "/api/party", "{nope", true), 400);
check("POST /api/party/requests invalid JSON", await call("POST", "/api/party/requests", "{nope", true), 400);
check("POST /api/character invalid JSON", await call("POST", "/api/character", "{nope", true), 400);
check("POST /api/character/import invalid JSON", await call("POST", "/api/character/import", "{nope", true), 400);
for (const [m, p] of [["PUT", "/api/party"], ["PATCH", "/api/character"], ["DELETE", "/api/boss/normal-lotus"], ["GET", "/api/character/import"], ["POST", "/api/health"], ["PUT", "/api/party/1"], ["POST", "/api/boss"], ["GET", "/api/character/x"], ["DELETE", "/api/party/requests"], ["PATCH", "/api/character/rates"]])
  check(`${m} ${p}`, await call(m, p), 405);
for (const p of ["/api/nope", "/api", "/api/character/a/b", "/api/character/.."]) check(`GET ${p}`, await call("GET", p), 404);
check("DELETE /api/character/%E0%A4%A (bad percent-encoding)", await call("DELETE", "/api/character/%E0%A4%A"), 400);

for (const n of made) {
  const r = await call("DELETE", `/api/character/${encodeURIComponent(n)}`);
  if (r.status !== 204) console.log(`cleanup: DELETE ${JSON.stringify(n)} -> ${show(r)}`);
}
console.log(`cleanup: ${made.size} temp characters`);
console.log(fails ? `# ${fails} failed` : "# all passed");
process.exit(fails ? 1 : 0);

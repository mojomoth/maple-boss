// npm run smoke: the PLAN.md API contract against a running server (BASE_URL, default http://localhost:3000),
// error paths included. Creates two characters under temporary names, a party request each and one party, then
// deletes the party and the characters (their rates and open requests go with them). One line per check; exit 1
// on any failure.
//
// It never makes the server crawl: POST /api/character only names a character it has just imported, which the
// local crawler path answers from its 1-hour cache, and the crawler-less path answers with 501.
import { readFileSync } from "node:fs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const tag = Date.now().toString(36).slice(-5);
const A = `아델smoke${tag}`; // seed/아델.json, the trimmed v1 payload the bookmarklet sends
const B = `고딩smoke${tag}`; // docs/research/samples/고딩.json wrapped as the whole localStorage store (~250 KB)
const BOSS = "extreme-kaling";
const created = new Set(); // characters cleanup() deletes
let partyId; // the party cleanup() deletes

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures++;
  return ok;
}

async function call(method, path, body, headers = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = typeof body === "string" || body instanceof ReadableStream ? body : JSON.stringify(body);
    if (body instanceof ReadableStream) init.duplex = "half";
    init.headers["content-type"] ??= "application/json";
  }
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, json, text, type: res.headers.get("content-type") ?? "" };
}

const short = (r) => (r.text.length > 140 ? r.text.slice(0, 140) + "…" : r.text);
// Every failure is { error: "<Korean message>" } with the expected status: no stack trace, no HTML page.
const isError = (r, status) => r.status === status && typeof r.json?.error === "string" && /[가-힣]/.test(r.json.error) && !/\bat \S+:\d+/.test(r.text);

async function expect(label, req, status, test = () => true) {
  let r;
  try {
    r = await req;
  } catch (e) {
    return check(label, false, `request failed: ${e.message}`), null;
  }
  let ok = r.status === status;
  if (ok && status >= 400) ok = isError(r, status);
  if (ok) {
    try {
      ok = test(r.json, r) !== false;
    } catch {
      ok = false;
    }
  }
  check(label, ok, `${r.status} ${short(r)}`);
  return ok ? r.json : null;
}

const renamed = (payload, name) => ({ ...payload, info: { ...payload.info, character_name: name } });
const seedA = renamed(JSON.parse(read("../seed/아델.json")), A);
const rawB = JSON.parse(read("../../docs/research/samples/고딩.json"));
rawB.userApiData.info.character_name = B;
const storeB = JSON.stringify({ state: { searchResult: rawB, isLoading: false, error: null }, version: 0 });

async function main() {
  console.log(`# smoke ${BASE}  temp characters: ${A}, ${B}`);

  // health
  const health = await expect("GET /api/health -> { ok, db, persistent }", call("GET", "/api/health"), 200, (j) =>
    j.ok === true && ["postgres", "pglite"].includes(j.db) && typeof j.persistent === "boolean");

  // pages: v1 at /, the PoCs under /pocs, the bookmarklet's landing page. The ones that show or make characters,
  // requests and parties carry the temporary storage notice exactly when the storage is not persistent.
  const NOTICE = "임시 저장소를 쓰고 있어요";
  const noticed = new Set(["/", "/pocs/character", "/pocs/party"]);
  for (const p of ["/", "/pocs/character", "/pocs/boss", "/pocs/boss?q=%EC%B9%B4%EB%A7%81", "/pocs/boss?q=a&q=b", "/pocs/party", "/import"]) {
    const r = await fetch(BASE + p).catch((e) => ({ status: e.message, headers: new Headers(), text: async () => "" }));
    const want = noticed.has(p) && health?.persistent === false;
    const has = (await r.text()).includes(NOTICE);
    check(`page ${p}${want ? " with the temporary storage notice" : ""}`, r.status === 200 && /text\/html/.test(r.headers.get("content-type") ?? "") && (!health || has === want), `${r.status} notice ${has}`);
  }
  for (const p of ["/character", "/boss", "/party", "/pocs"]) {
    const r = await fetch(BASE + p).catch((e) => ({ status: e.message, text: async () => "" }));
    const html = await r.text();
    check(`no page at ${p}: 404 with the app's Korean page and a way back`, r.status === 404 && html.includes("없는 페이지예요") && html.includes('href="/"'), String(r.status));
  }

  // every API failure is { error }, also the ones Next would answer itself
  await expect("PUT /api/party -> 405 { error }", call("PUT", "/api/party"), 405);
  await expect("GET /api/character/import -> 405 { error }", call("GET", "/api/character/import"), 405);
  await expect("GET /api/no-such-route -> 404 { error }", call("GET", "/api/no-such-route"), 404);
  // On Vercel the edge refuses a broken percent-encoding itself, before proxy.ts: a plain-text "400 Bad Request"
  // (HTTP/2: a stream reset). The app never sees it, so there only the status is checked. Anywhere else (next dev,
  // next start) the app answers, and its answer must be the { error } JSON.
  const badPath = call("DELETE", "/api/character/%E0%A4%A");
  const bad = await badPath.catch(() => null);
  if (bad?.status === 400 && /^text\/plain/.test(bad.type) && bad.text.trim() === "400 Bad Request")
    check("DELETE /api/character/%E0%A4%A (bad encoding) -> 400 from the platform before the app (status only)", true, `${bad.status} ${short(bad)}`);
  else await expect("DELETE /api/character/%E0%A4%A (bad encoding) -> 400 { error }", badPath, 400);

  // a POST or DELETE another site started is refused before any handler; the app's own origin and non-browser
  // clients (no Origin, no Sec-Fetch-Site) go through
  const evil = { origin: "https://evil.example" };
  await expect("POST /api/character/import, Origin of another site -> 403", call("POST", "/api/character/import", seedA, evil), 403);
  await expect("POST /api/character/import text/plain, Sec-Fetch-Site: cross-site -> 403", call("POST", "/api/character/import", JSON.stringify(seedA), { "content-type": "text/plain", "sec-fetch-site": "cross-site" }), 403);
  await expect("POST /api/character, Origin of another site -> 403 (never starts the crawler)", call("POST", "/api/character", { name: A }, evil), 403);
  await expect("POST /api/party/requests, Sec-Fetch-Site: same-site -> 403", call("POST", "/api/party/requests", {}, { "sec-fetch-site": "same-site" }), 403);
  await expect("DELETE /api/party/abc, Origin of another site -> 403", call("DELETE", "/api/party/abc", undefined, evil), 403);
  await expect("DELETE /api/character/x, Origin null -> 403", call("DELETE", "/api/character/x", undefined, { origin: "null" }), 403);
  await expect("GET /api/character, Origin of another site -> 200 (reads are not blocked)", call("GET", "/api/character", undefined, evil), 200);
  await expect("POST /api/character/import empty, Origin of this server -> 400 (reaches the handler)", call("POST", "/api/character/import", "", { origin: new URL(BASE).origin }), 400);
  await expect("POST /api/character/import empty, Sec-Fetch-Site: same-origin -> 400 (reaches the handler)", call("POST", "/api/character/import", "", { "sec-fetch-site": "same-origin" }), 400);
  const leaked = (await call("GET", "/api/character")).json?.some?.((c) => c.name === A);
  check(`no ${A} after the refused imports`, leaked === false, String(leaked));

  // bosses
  await expect("GET /api/boss -> Boss[]", call("GET", "/api/boss"), 200, (j) => Array.isArray(j) && j.length >= 60 && j.every((b) => b.id && b.name));
  await expect("GET /api/boss?q=카링 -> 카링 only", call("GET", `/api/boss?q=${encodeURIComponent("카링")}`), 200, (j) =>
    j.length > 0 && j.every((b) => b.name === "카링"));
  await expect(`GET /api/boss/${BOSS}`, call("GET", `/api/boss/${BOSS}`), 200, (j) => j.id === BOSS && j.maxParty >= 2);
  await expect("GET /api/boss/<unknown> -> 404", call("GET", "/api/boss/no-such-boss"), 404);

  // characters: list, import (two shapes), errors
  await expect("GET /api/character -> Character[]", call("GET", "/api/character"), 200, (j) => Array.isArray(j) && !j.some((c) => c.name === A || c.name === B));
  if (await expect(`POST /api/character/import seed payload as ${A} -> 201`, call("POST", "/api/character/import", seedA), 201, (j) =>
    j.name === A && j.job === seedA.info.character_class && j.combatPower === seedA.calc.combatPower && j.source === "maplescouter"))
    created.add(A);
  if (await expect(`POST /api/character/import whole store (${(storeB.length / 1024) | 0} KB) as ${B} -> 201`, call("POST", "/api/character/import", storeB), 201, (j) =>
    j.name === B && j.world === rawB.userApiData.info.world_name))
    created.add(B);
  await expect("POST /api/character/import same payload again -> 201 (upsert)", call("POST", "/api/character/import", seedA), 201, (j) => j.name === A);
  await expect("POST /api/character/import empty -> 400", call("POST", "/api/character/import", ""), 400);
  await expect("POST /api/character/import not JSON -> 400", call("POST", "/api/character/import", "{nope"), 400);
  await expect("POST /api/character/import wrong shape -> 400", call("POST", "/api/character/import", { v: 1, info: { character_name: "x" } }), 400);
  await expect("POST /api/character/import out-of-range value -> 400", call("POST", "/api/character/import", { ...seedA, info: { ...seedA.info, character_level: 999 } }), 400);
  await expect("POST /api/character/import name '..' -> 400 (could never be deleted)", call("POST", "/api/character/import", renamed(seedA, "..")), 400);
  // 'import' and 'rates' are also sibling routes of /api/character/[name]: they answer DELETE for their own name.
  // A real character with that name is left alone.
  const existing = new Set(((await call("GET", "/api/character")).json ?? []).map((c) => c.name));
  for (const n of ["import", "rates"]) {
    if (!(await expect(`DELETE /api/character/${n} with no such character -> 404 (not 405)`, call("DELETE", `/api/character/${n}`), 404))) continue;
    if (existing.has(n)) {
      console.log(`     a character named ${n} exists: its round trip is skipped`);
      continue;
    }
    if (await expect(`POST /api/character/import as '${n}' -> 201`, call("POST", "/api/character/import", renamed(seedA, n)), 201, (j) => j.name === n)) {
      created.add(n);
      await expect(`DELETE /api/character/${n} -> 204`, call("DELETE", `/api/character/${n}`), 204);
      if (await expect(`GET /api/character no longer lists '${n}'`, call("GET", "/api/character"), 200, (j) => !j.some((c) => c.name === n))) created.delete(n);
    }
  }
  await expect("POST /api/character/import NUL in a name -> 400, not 500", call("POST", "/api/character/import", renamed(seedA, "a\u0000b")), 400);
  await expect("POST /api/character/import maplescouter placeholder -> 400", call("POST", "/api/character/import", {
    state: { searchResult: { userApiData: { info: { ...seedA.info, character_name: "으낭다" } }, calculatedData: { ...seedA.calc, bossCuts: [] } } },
  }), 400, (j) => j.error.includes("으낭다"));
  const big = JSON.stringify({ ...seedA, pad: "x".repeat(1_100_000) });
  await expect("POST /api/character/import 1.1 MB -> 413", call("POST", "/api/character/import", big), 413);
  const chunked = new ReadableStream({
    start(c) {
      for (let i = 0; i < 12; i++) c.enqueue(new TextEncoder().encode("x".repeat(100_000)));
      c.close();
    },
  });
  await expect("POST /api/character/import 1.2 MB chunked, no content-length -> 413", call("POST", "/api/character/import", chunked), 413);

  await expect(`GET /api/character lists ${A} and ${B}`, call("GET", "/api/character"), 200, (j) => [A, B].every((n) => j.some((c) => c.name === n)));
  const ratesA = await expect(`GET /api/character/rates?name=${A} -> ClearRate[] + label`, call("GET", `/api/character/rates?name=${encodeURIComponent(A)}`), 200, (j) =>
    j.length === 60 && j.every((r) => r.characterName === A && typeof r.clearRate === "number" && typeof r.label === "string") &&
    j.every((r, i) => i === 0 || j[i - 1].clearRate <= r.clearRate));
  const ratesB = await expect(`GET /api/character/rates?name=${B}`, call("GET", `/api/character/rates?name=${encodeURIComponent(B)}`), 200, (j) => j.length === 60);
  await expect("GET /api/character/rates without name -> 400", call("GET", "/api/character/rates"), 400);
  await expect("GET /api/character/rates?name=<unknown> -> 404", call("GET", `/api/character/rates?name=nobody${tag}`), 404);

  // POST /api/character: the local crawler (cached, so no browser opens) or 501 + where to import from
  await expect("POST /api/character {} -> 400", call("POST", "/api/character", {}), 400);
  await expect("POST /api/character not JSON -> 400", call("POST", "/api/character", "{"), 400);
  await expect("POST /api/character name > 20 chars -> 400", call("POST", "/api/character", { name: "가".repeat(21) }), 400);
  const r = await call("POST", "/api/character", { name: A });
  if (r.status === 501)
    check("POST /api/character -> 501 + importUrl (no crawler here)", isError(r, 501) && r.json.importUrl === `https://maplescouter.com/ko/result?name=${encodeURIComponent(A)}`, `${r.status} ${short(r)}`);
  else check("POST /api/character -> 200 from the crawler path's cache", r.status === 200 && r.json?.name === A, `${r.status} ${short(r)}`);

  // party requests -> party -> list
  const rateOf = (rates) => rates?.find((x) => x.bossId === BOSS)?.clearRate;
  await expect(`POST /api/party/requests ${A} -> 201`, call("POST", "/api/party/requests", { characterName: A, bossId: BOSS, partySize: 3 }), 201);
  await expect(`POST /api/party/requests ${A} again, new size -> 201 (one open request)`, call("POST", "/api/party/requests", { characterName: A, bossId: BOSS, partySize: 2 }), 201);
  await expect(`POST /api/party/requests ${B} -> 201`, call("POST", "/api/party/requests", { characterName: B, bossId: BOSS, partySize: 2 }), 201);
  await expect("POST /api/party/requests unknown character -> 400", call("POST", "/api/party/requests", { characterName: `nobody${tag}`, bossId: BOSS, partySize: 2 }), 400);
  await expect("POST /api/party/requests unknown boss -> 400", call("POST", "/api/party/requests", { characterName: A, bossId: "no-such-boss", partySize: 2 }), 400);
  await expect("POST /api/party/requests party size 9 -> 400", call("POST", "/api/party/requests", { characterName: A, bossId: BOSS, partySize: 9 }), 400);
  await expect('POST /api/party/requests party size "2" -> 400 (integers only)', call("POST", "/api/party/requests", { characterName: A, bossId: BOSS, partySize: "2" }), 400);
  await expect("POST /api/party/requests not JSON -> 400", call("POST", "/api/party/requests", "nope"), 400);
  await expect(`GET /api/party/requests?bossId=${BOSS} -> Seeker[] with both`, call("GET", `/api/party/requests?bossId=${BOSS}`), 200, (j) => {
    const mine = j.filter((s) => s.character.name === A || s.character.name === B);
    return mine.length === 2 && mine.every((s) => s.bossId === BOSS && s.partySize === 2 && typeof s.clearRate === "number");
  });

  await expect("POST /api/party without members -> 400", call("POST", "/api/party", { bossId: BOSS }), 400);
  await expect("POST /api/party no members -> 400", call("POST", "/api/party", { bossId: BOSS, members: [] }), 400);
  await expect("POST /api/party unknown boss -> 400", call("POST", "/api/party", { bossId: "no-such-boss", members: [A] }), 400);
  await expect("POST /api/party not JSON -> 400", call("POST", "/api/party", "nope"), 400);
  const want = (rateOf(ratesA) ?? NaN) + (rateOf(ratesB) ?? NaN);
  const party = await expect(`POST /api/party ${A} + ${B} -> 201 { id, sum, clearable }`, call("POST", "/api/party", { bossId: BOSS, members: [A, B] }), 201, (j) =>
    Number.isInteger(j.id) && Math.abs(j.sum - want) < 1e-9 && j.clearable === j.sum >= 1.1 - 1e-9);
  partyId = party?.id;
  await expect("POST /api/party same members again -> 400 (requests closed)", call("POST", "/api/party", { bossId: BOSS, members: [A, B] }), 400);
  await expect("GET /api/party -> FormedParty[] with the new party", call("GET", "/api/party"), 200, (j) => {
    const p = j.find((x) => x.id === party?.id);
    return p && p.bossId === BOSS && p.members.map((m) => m.name).sort().join() === [A, B].sort().join() && Math.abs(p.sum - want) < 1e-9;
  });
  await expect("GET /api/party/requests no longer lists them", call("GET", `/api/party/requests?bossId=${BOSS}`), 200, (j) =>
    !j.some((s) => s.character.name === A || s.character.name === B));
}

async function cleanup() {
  if (partyId) {
    await expect(`DELETE /api/party/${partyId} -> 204`, call("DELETE", `/api/party/${partyId}`), 204);
    await expect(`DELETE /api/party/${partyId} again -> 404`, call("DELETE", `/api/party/${partyId}`), 404);
    await expect("GET /api/party no longer lists it", call("GET", "/api/party"), 200, (j) => !j.some((p) => p.id === partyId));
  }
  await expect("DELETE /api/party/<not a number> -> 404", call("DELETE", "/api/party/abc"), 404);
  for (const n of created) await expect(`DELETE /api/character/${n} -> 204`, call("DELETE", `/api/character/${encodeURIComponent(n)}`), 204);
  await expect(`DELETE /api/character/${A} again -> 404`, call("DELETE", `/api/character/${encodeURIComponent(A)}`), 404);
  await expect("GET /api/character no longer lists them", call("GET", "/api/character"), 200, (j) => !j.some((c) => c.name === A || c.name === B));
  await expect(`GET /api/character/rates?name=${A} after delete -> 404`, call("GET", `/api/character/rates?name=${encodeURIComponent(A)}`), 404);
}

try {
  await main();
} catch (e) {
  check("smoke run", false, e.stack ?? String(e));
} finally {
  await cleanup().catch((e) => check("cleanup", false, e.message));
}
console.log(failures ? `# ${failures} failed` : "# all passed");
process.exit(failures ? 1 : 0);

// Fix round 1, P1-1 repro (critic d2/d3 steps) with the new expectation: wherever characters, requests or parties
// are made or shown on temporary storage, the screen says they usually will not show up, and no success line
// promises a card. Whether the data shows up is recorded, not required (B1 is still open).
//   BASE_URL=https://maple-boss-livid.vercel.app node repro-p1-1.mjs <shots dir>
// Cleans up: DELETE bursts for its two characters; the two seed requests are closed by 1-member parties, which
// are then deleted (bursts, since every instance keeps its own /tmp copy). Never deletes a seed character.
import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";

const BASE = (process.env.BASE_URL ?? "https://maple-boss-livid.vercel.app").replace(/\/+$/, "");
const OUT = process.argv[2];
if (OUT) mkdirSync(OUT, { recursive: true });
const SAMPLES = new URL("../../../../../../research/samples/", import.meta.url).pathname;
const tag = Math.random().toString(36).slice(2, 7);
const A = `아델qa${tag}`; // bookmarklet
const B = `고딩qa${tag}`; // paste
const BOSS = "extreme-kaling";
const NOTICE = "임시 저장소를 쓰고 있어요. 가져온 캐릭터와 등록한 구직·파티는 보통 화면에 나오지 않고, 나와도 언제든 사라질 수 있어요.";
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d ? "  " + d : ""}`); if (!ok) fails++; return ok; };
const shot = async (page, name, full = false) => OUT && (await page.screenshot({ path: `${OUT}/${name}`, fullPage: full }), console.log(`     screenshot ${name}`));
const store = (file, name) => {
  const sr = JSON.parse(readFileSync(SAMPLES + file, "utf8"));
  sr.userApiData.info.character_name = name;
  return JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
};
const storeA = store("아델.json", A);
const mock = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><title>mock maplescouter</title><p id="s">loading</p><a id="bm">run bookmark</a>
<script>localStorage.setItem("character-store", ${JSON.stringify(storeA).replace(/</g, "\\u003c")});document.getElementById("s").textContent="ready";</script>`);
});
await new Promise((r) => mock.listen(0, "localhost", r));
const MOCK = `http://localhost:${mock.address().port}`;
const health = await (await fetch(BASE + "/api/health")).json();
console.log(`# P1-1 ${new Date().toISOString()} ${BASE}; health ${JSON.stringify(health)}; mock ${MOCK}; characters ${A} (bookmarklet), ${B} (paste)`);
check("storage is temporary on this deployment (B1 open), so the notices must show", health.persistent === false, JSON.stringify(health));

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const cards = () => page.$$eval(".card-name", (els) => els.map((e) => e.textContent));
const notice = () => page.getByText(NOTICE, { exact: true }).count();
const requests = [];
try {
  // 1. / and the guide
  await page.goto(BASE + "/"); await page.waitForLoadState("networkidle");
  check("/ shows the notice (new wording: usually not shown, may vanish any time)", (await notice()) === 1);
  await page.fill("#character-name", A);
  await page.click("button:has-text('추가')");
  const guide = page.locator("section.guide");
  await guide.waitFor({ timeout: 15000 });
  const help = await guide.locator(".section-help").innerText();
  check("import guide says an import usually does not show up (no 'card appears' promise)",
    help === "이 서버는 닉네임으로 바로 불러오지 못해요. 아래 두 단계로 가져올 수는 있지만, 임시 저장소라서 가져온 캐릭터가 보통 화면에 나오지 않아요." && !help.includes("카드가 생겨요"), help);
  const js = await guide.getByRole("link", { name: "Maple Boss로 보내기" }).getAttribute("href");
  await shot(page, "p1-1-guide-1440.png");
  await page.setViewportSize({ width: 375, height: 812 });
  await guide.scrollIntoViewIfNeeded();
  await shot(page, "p1-1-guide-375.png");
  await page.setViewportSize({ width: 1440, height: 900 });

  // 2-3. the real bookmarklet on a localhost mock page -> /import
  await page.goto(`${MOCK}/ko/result?name=${encodeURIComponent(A)}`);
  await page.locator("#s", { hasText: "ready" }).waitFor();
  await page.evaluate((h) => document.getElementById("bm").setAttribute("href", h), js);
  const seen = [];
  page.on("framenavigated", (f) => f === page.mainFrame() && seen.push(f.url()));
  await page.click("#bm");
  const done = page.locator(".empty-title");
  await done.filter({ hasText: /가져왔어요|\S+요\./ }).first().waitFor({ timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000); // a redirect to / would have happened by now
  const msg = (await done.count()) ? await done.innerText() : "(none)";
  check("/import result says it was imported and that / usually will not show it, and stays on /import",
    msg === `‘${A}’ 캐릭터를 가져왔어요. 임시 저장소라 메인 화면에는 보통 안 나와요.` && new URL(page.url()).pathname === "/import" && !new URL(page.url()).hash,
    `${msg} | at ${new URL(page.url()).pathname} | ${seen.map((u) => u.slice(0, 50)).join(" -> ")}`);
  await shot(page, "p1-1-import-result-1440.png");
  await page.setViewportSize({ width: 375, height: 812 });
  await shot(page, "p1-1-import-result-375.png");
  await page.setViewportSize({ width: 1440, height: 900 });
  await Promise.all([page.waitForURL(BASE + "/", { timeout: 45000 }), page.getByRole("link", { name: "메인 화면으로" }).click()]);
  await page.waitForLoadState("networkidle").catch(() => {});
  const cA = (await cards()).includes(A);
  check(`/ after /import: card ${A} shown, or the notice explains why not (no contradiction)`, cA || (await notice()) === 1, `card shown ${cA}`);

  // 4. paste
  await page.fill("#character-name", B);
  await page.click("button:has-text('추가')");
  await guide.waitFor();
  await guide.locator("summary", { hasText: "직접 붙여넣기" }).click();
  await page.locator("#paste-store").fill(store("고딩.json", B));
  await guide.getByRole("button", { name: "가져오기", exact: true }).click();
  await guide.waitFor({ state: "detached", timeout: 45000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
  const added = await page.locator("#add-msg").innerText();
  check("paste result line says the card usually will not show up", added === `‘${B}’ 캐릭터를 가져왔어요. 임시 저장소라 카드는 보통 안 나와요.`, added);
  const cB = (await cards()).includes(B);
  check(`/ after paste: card ${B} shown, or the notice explains why not`, cB || (await notice()) === 1, `card shown ${cB}`);
  await shot(page, "p1-1-after-paste-1440.png");
  await page.setViewportSize({ width: 375, height: 812 });
  await shot(page, "p1-1-after-paste-375.png");
  await page.setViewportSize({ width: 1440, height: 900 });
  let shownA = 0, shownB = 0;
  for (let i = 0; i < 10; i++) {
    await page.reload(); await page.waitForLoadState("domcontentloaded");
    const c = await cards();
    shownA += c.includes(A); shownB += c.includes(B);
  }
  console.log(`info 10 reloads of /: ${A} shown ${shownA}/10, ${B} shown ${shownB}/10 (B1: expected to be mostly 0)`);

  // 5. /pocs/character
  await page.goto(BASE + "/pocs/character"); await page.waitForLoadState("networkidle");
  check("/pocs/character shows the notice", (await notice()) === 1);
  await page.setViewportSize({ width: 375, height: 812 });
  await shot(page, "p1-1-pocs-character-375.png");
  await page.setViewportSize({ width: 1440, height: 900 });

  // 6. /pocs/party: two seekers for 익스트림 카링 (2인)
  await page.goto(BASE + "/pocs/party"); await page.waitForLoadState("networkidle");
  check("/pocs/party shows the notice before its forms", (await notice()) === 1 && (await page.evaluate((t) => {
    const p = [...document.querySelectorAll("main p")].find((e) => e.textContent === t);
    return !!(p && p.compareDocumentPosition(document.querySelector("main form")) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, NOTICE)));
  for (const name of ["강은호", "아델"]) {
    await page.selectOption("select[name=characterName]", { label: await page.locator("select[name=characterName] option", { hasText: name }).first().innerText() });
    await page.selectOption("select[name=bossId]", BOSS);
    await page.selectOption("select[name=partySize]", "2");
    await page.click("button:has-text('구직 등록')");
    const m = page.locator("form.form-row .msg");
    await m.waitFor({ timeout: 30000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    const t = (await m.count()) ? await m.innerText() : "(none)";
    if (/등록했어요/.test(t)) requests.push(name);
    check(`seeker ${name} registered (201), the notice still on the page`, /등록했어요/.test(t) && (await notice()) === 1, t);
  }
  await page.selectOption("select[name=builderBossId]", BOSS);
  await page.waitForTimeout(500);
  const rows = await page.$$eval(".table tbody tr", (trs) => trs.length);
  console.log(`info 보스별 구직 현황 for 익스트림 카링 right after: ${rows} rows (B1: expected 0 or fewer than 2)`);
  check("/pocs/party: seekers listed, or the notice explains why not", rows >= 2 || (await notice()) === 1, `${rows} rows`);
  await shot(page, "p1-1-party-after-requests-1440.png", true);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => scrollTo(0, 0));
  await shot(page, "p1-1-party-375.png");
  check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 400));
} catch (e) {
  check("run", false, e.stack ?? String(e));
} finally {
  await browser.close(); mock.close();
  const count = (st) => st.reduce((c, s) => ((c[s] = (c[s] ?? 0) + 1), c), {});
  const burst = (n, fn) => Promise.all(Array.from({ length: n }, fn));
  for (const n of [A, B]) {
    const st = await burst(60, async () => (await fetch(`${BASE}/api/character/${encodeURIComponent(n)}`, { method: "DELETE" })).status);
    console.log(`# cleanup DELETE burst ${n}: ${JSON.stringify(count(st))}`);
  }
  // close the seed requests by 1-member parties on every instance that has them, then delete those parties
  const ids = new Set();
  for (let round = 0; round < 2; round++)
    for (const n of requests) {
      const rs = await burst(60, async () => {
        const r = await fetch(`${BASE}/api/party`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bossId: BOSS, members: [n] }) });
        return { s: r.status, j: await r.json().catch(() => null) };
      });
      for (const r of rs) if (r.s === 201) ids.add(r.j.id);
      console.log(`# cleanup close request ${n} (round ${round}): ${JSON.stringify(count(rs.map((r) => r.s)))}`);
    }
  for (const id of ids) {
    const st = await burst(60, async () => (await fetch(`${BASE}/api/party/${id}`, { method: "DELETE" })).status);
    console.log(`# cleanup DELETE party ${id}: ${JSON.stringify(count(st))}`);
  }
  const lists = await burst(30, async () => (await (await fetch(BASE + "/api/character")).json()).map((c) => c.name));
  const reqs = await burst(30, async () => (await (await fetch(BASE + "/api/party/requests")).json()).length);
  const parties = await burst(30, async () => (await (await fetch(BASE + "/api/party")).json()).length);
  console.log(`# after cleanup (30 parallel each): ${lists.filter((l) => l.includes(A) || l.includes(B)).length} list ${A}/${B}; ` +
    `seeds on all ${lists.every((l) => ["강은호", "아델", "고딩"].every((s) => l.includes(s)))}; open requests ${reqs.join("")}; parties ${parties.join("")}`);
}
console.log(fails ? `# ${fails} failed` : "# all passed");

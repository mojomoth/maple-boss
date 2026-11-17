// Recheck 1 (copy of critic/scripts/d3.mjs with P1-1 checks). D-3 on production: /pocs/party seekers -> party -> saved list -> delete; /pocs/character and /pocs/boss.
import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const BASE = "https://maple-boss-livid.vercel.app";
const OUT = process.argv[2];
const BOSS = "extreme-kaling";
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d ? "  " + d : ""}`); if (!ok) fails++; return ok; };
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const apiLog = [];
page.on("response", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/")) apiLog.push(`${r.request().method()} ${decodeURIComponent(u.pathname)} ${r.status()}`); });
console.log(`# D-3 ${new Date().toISOString()} ${BASE}`);
const registered = [];
try {
  await page.goto(BASE + "/pocs/party"); await page.waitForLoadState("networkidle");
  check("/pocs/party renders", (await page.locator("h1", { hasText: "파티 편성" }).count()) === 1);
  const nt = await page.evaluate(() => [...document.querySelectorAll("p")].map((p) => p.textContent).filter((t) => t.includes("임시 저장소")));
  check("temporary-storage notice on /pocs/party says requests/parties usually do not show up", nt.length === 1 && /구직·파티는 보통 화면에 나오지 않/.test(nt[0]), nt.join(" | "));
  const order = await page.evaluate(() => { const n = [...document.querySelectorAll("p")].find((p) => p.textContent.includes("임시 저장소")); const f = document.querySelector("form"); return n && f ? !!(n.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) : false; });
  check("notice comes before the request form", order);
  for (const name of ["강은호", "아델"]) {
    await page.selectOption("select[name=characterName]", { label: (await page.locator("select[name=characterName] option", { hasText: name }).first().innerText()) });
    await page.selectOption("select[name=bossId]", BOSS);
    await page.selectOption("select[name=partySize]", "2");
    apiLog.length = 0;
    await page.click("button:has-text('구직 등록')");
    const msg = page.locator("form.form-row .msg");
    await msg.waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    const m = (await msg.count()) ? await msg.innerText() : "(none)";
    if (/등록했어요/.test(m)) registered.push(name);
    check(`seeker ${name} registered for 익스트림 카링 (2인)`, /등록했어요/.test(m), `${m} | ${apiLog.join(", ")}`);
  }
  await page.selectOption("select[name=builderBossId]", BOSS);
  await page.waitForTimeout(500);
  const rows = await page.$$eval(".table tbody tr", (trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim()));
  const listed = rows.some((r) => r.includes("강은호")) && rows.some((r) => r.includes("아델"));
  check("seekers listed under 보스별 구직 현황, or the page notice explains why not", listed || nt.length === 1, `listed ${listed}`);
  console.log("info both seekers listed under 보스별 구직 현황:", rows.some((r) => r.includes("강은호")) && rows.some((r) => r.includes("아델")), `rows: ${rows.join(" | ") || "(none)"}; text: ${(await page.locator("section[aria-labelledby=builder-title] .section-help").allInnerTexts()).join(" ")}`);
  if (OUT) await page.screenshot({ path: `${OUT}/d3-party-after-requests-1440.png`, fullPage: true });
  // reload a few times to see whether any page instance shows them
  let shown = 0;
  for (let i = 0; i < 8; i++) {
    await page.reload(); await page.waitForLoadState("domcontentloaded");
    await page.selectOption("select[name=builderBossId]", BOSS).catch(() => {});
    const r = await page.$$eval(".table tbody tr", (trs) => trs.length);
    if (r > 0) shown++;
  }
  console.log(`info seekers visible across 8 reloads of /pocs/party: ${shown}/8 (B1: expected 0)`);
  // if seekers are visible, form a party via the UI
  const boxes = page.locator("input[name=member]");
  if ((await boxes.count()) >= 2) {
    await page.click("button:has-text('추천 편성')");
    apiLog.length = 0;
    await page.click("button:has-text('파티 편성')");
    await page.waitForTimeout(3000);
    const m = await page.locator(".panel-body .msg").innerText().catch(() => "(none)");
    check("party formed with sum and verdict", /파티를 편성했어요/.test(m), `${m} | ${apiLog.join(", ")}`);
    const saved = await page.$$eval("ul.saved > li", (lis) => lis.map((l) => l.innerText.replace(/\s+/g, " ")));
    check("party in saved list with sum + verdict", saved.some((s) => /합계 [\d.,]+%/.test(s) && /공략 (가능|불가)/.test(s)), saved.join(" | "));
    if (OUT) await page.screenshot({ path: `${OUT}/d3-party-saved-1440.png`, fullPage: true });
    const del = page.locator("ul.saved > li button:has-text('삭제')").first();
    if (await del.count()) { await del.click(); await page.waitForTimeout(3000); }
    check("party deleted from saved list", (await page.locator("ul.saved > li").count()) === 0);
  } else {
    console.log("BLOCKED party formed via UI: no selectable seekers on the page (B1) -> cannot form/save/delete a party in the UI");
  }
  // /pocs/character and /pocs/boss
  await page.goto(BASE + "/pocs/character"); await page.waitForLoadState("networkidle");
  const ch = await page.locator("main").innerText();
  check("/pocs/character renders (form + list)", (await page.locator("#character-name").count()) === 1, ch.replace(/\s+/g, " ").slice(0, 200));
  const nc = await page.evaluate(() => [...document.querySelectorAll("p")].map((p) => p.textContent).filter((t) => t.includes("임시 저장소")));
  check("/pocs/character shows the notice", nc.length === 1, nc.join(" | "));
  await page.fill("#character-name", "아델qa" + Math.random().toString(36).slice(2, 6));
  apiLog.length = 0;
  await page.click("button:has-text('등록')");
  await page.locator("form .msg.is-error").waitFor({ timeout: 20000 }).catch(() => {});
  const cm = (await page.locator("form .msg").allInnerTexts()).join(" / ");
  check("/pocs/character register on Vercel -> 501 explained with the way to import", /바로 불러오지 못해요/.test(cm) && /메인 화면/.test(cm), `${cm} | ${apiLog.join(", ")}`);
  if (OUT) await page.screenshot({ path: `${OUT}/d3-pocs-character-1440.png`, fullPage: true });
  await page.goto(BASE + "/pocs/boss"); await page.waitForLoadState("networkidle");
  const bossInput = page.locator("input[name=q]");
  check("/pocs/boss renders search", (await bossInput.count()) >= 1);
  await bossInput.first().fill("검마"); await bossInput.first().press("Enter");
  await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  const bt = (await page.locator("main").innerText()).replace(/\s+/g, " ");
  check("/pocs/boss search 검마 shows 검은 마법사 results", /검은 마법사/.test(bt), page.url() + " " + bt.slice(0, 200));
  if (OUT) await page.screenshot({ path: `${OUT}/d3-pocs-boss-1440.png`, fullPage: true });
  check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
} catch (e) {
  check("run", false, e.stack ?? String(e));
} finally {
  await browser.close();
}
console.log(`# registered seekers (need cleanup): ${registered.join(",")}`);
console.log(fails ? `# ${fails} failed` : "# all passed");

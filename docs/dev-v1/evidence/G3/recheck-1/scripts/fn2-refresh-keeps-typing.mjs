// Recheck FN-2 side effect: a router.refresh() that is not a search (deleting a character through the modal) must not
// overwrite text being typed in the 보스 검색 field, and the next search after it still pushes one entry and syncs.
import { readFileSync } from "node:fs";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d ? `  | ${d}` : ""}`); if (!ok) fails++; };
const name = `재검R${Date.now().toString(36).slice(-4)}`;
const sr = JSON.parse(readFileSync("/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples/고딩.json", "utf8"));
sr.userApiData.info.character_name = name;
console.log("setup import", (await fetch(`${BASE}/api/character/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 }) })).status);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  await page.goto(BASE + "/?boss=hard-lotus", { waitUntil: "networkidle" });
  await page.fill("#boss-q", "");
  await page.type("#boss-q", "세렌", { delay: 30 }); // typed, not submitted
  const len0 = await page.evaluate(() => history.length);
  await page.click(`button.card:has-text("${name}")`);
  await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
  await page.click("dialog.confirm .btn--danger");
  await page.locator(`button.card:has-text("${name}")`).waitFor({ state: "detached", timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  const s = await page.evaluate(() => ({ field: document.querySelector("#boss-q").value, boss: document.querySelector(".boss-name h3").textContent, url: location.search, len: history.length }));
  check("refresh after a delete keeps the typed '세렌'", s.field === "세렌" && s.boss === "스우" && s.len === len0, JSON.stringify(s));
  await page.press("#boss-q", "Enter");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  const t = await page.evaluate(() => ({ field: document.querySelector("#boss-q").value, shown: `${document.querySelector(".boss-name .badge").textContent} ${document.querySelector(".boss-name h3").textContent}`, url: location.search, len: history.length }));
  check("then Enter searches 세렌: one new entry, field = shown boss", t.field === t.shown && /세렌/.test(t.shown) && t.len === len0 + 1, JSON.stringify(t));
  await page.goBack();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  const u = await page.evaluate(() => ({ field: document.querySelector("#boss-q").value, shown: `${document.querySelector(".boss-name .badge").textContent} ${document.querySelector(".boss-name h3").textContent}`, url: location.search }));
  check("Back returns to 하드 스우 with the field in step", u.shown === "하드 스우" && u.field === "하드 스우", JSON.stringify(u));
} catch (e) {
  check("run", false, e.stack);
} finally {
  console.log(`cleanup ${name}: ${(await fetch(`${BASE}/api/character/${encodeURIComponent(name)}`, { method: "DELETE" })).status} (404 = deleted by the modal)`);
  await browser.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");

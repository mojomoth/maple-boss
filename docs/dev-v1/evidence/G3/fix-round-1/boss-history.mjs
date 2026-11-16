// Fix round 1, FN-2: the 보스 검색 field after searches, Back/Forward and a refresh (critic-function/scripts/back.mjs, extended).
// Each step checks the boss on screen against the field; history.length checks for dead entries; pushes lists every
// history.pushState. A repeated exact label (typing it submits at once, then Enter) must add no entry.
// Usage: node boss-history.mjs [cpu throttle rate, 1] [wait ms per step, 2500] [screenshot path]
import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const rate = Number(process.argv[2] ?? 1);
const wait = Number(process.argv[3] ?? 2500);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
await ctx.addInitScript(() => {
  window.__h = [];
  for (const k of ["pushState", "replaceState"]) {
    const o = history[k].bind(history);
    history[k] = function (d, u, url) { if (k === "pushState") window.__h.push(`push ${decodeURIComponent(String(url))}`); return o(d, u, url); };
  }
});
const page = await ctx.newPage();
if (rate > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate }); }
const s = () => page.evaluate(() => `boss='${document.querySelector(".boss-name")?.textContent}' field='${document.querySelector("#boss-q")?.value}' url=${decodeURIComponent(location.pathname + location.search)} len=${history.length}`);
let bad = 0;
const expect = (label, line, boss, field) => { const ok = line.includes(`boss='${boss}'`) && line.includes(`field='${field}'`); if (!ok) bad++; console.log(`${ok ? "ok  " : "FAIL"} ${label.padEnd(16)} ${line}`); };
await page.goto(BASE + "/", { waitUntil: "networkidle" });
expect("start", await s(), "익스트림카링", "익스트림 카링");
const steps = [["하스우", "하드스우", "하드 스우"], ["노말 카링", "노말카링", "노말 카링"], ["노말 카링", "노말카링", "노말 카링"], ["카링 노말", "노말카링", "노말 카링"], ["zzz", "노말카링", "zzz"], ["카링", "이지카링", "이지 카링"]];
for (const [q, b, f] of steps) {
  await page.fill("#boss-q", q);
  await page.press("#boss-q", "Enter");
  await page.waitForTimeout(wait);
  expect(`search ${q}`, await s(), b, f);
  const focused = await page.evaluate(() => document.activeElement?.id);
  if (focused !== "boss-q") { bad++; console.log("FAIL focus left the field:", focused); }
}
// history: 6 entries after start (start + 5 searches) if no dead entries
const len = await page.evaluate(() => history.length);
console.log("     pushes:", (await page.evaluate(() => window.__h)).join(" | "));
console.log(`${len === 7 ? "ok  " : "FAIL"} history.length ${len} (want 7: blank, start, 하스우, 노말 카링, 카링 노말, zzz, 카링; the repeated exact label adds none)`); if (len !== 7) bad++;
const back = [["노말카링", "zzz"], ["노말카링", "노말 카링"], ["노말카링", "노말 카링"], ["하드스우", "하드 스우"], ["익스트림카링", "익스트림 카링"]];
for (const [b, f] of back) { await page.evaluate(() => history.back()); await page.waitForTimeout(wait); expect("back", await s(), b, f); }
for (const [b, f] of [["하드스우", "하드 스우"], ["노말카링", "노말 카링"]]) { await page.evaluate(() => history.forward()); await page.waitForTimeout(wait); expect("forward", await s(), b, f); }
await page.reload({ waitUntil: "networkidle" }); expect("reload", await s(), "노말카링", "노말 카링");
if (process.argv[4]) await page.screenshot({ path: process.argv[4] });
// A refresh (as after adding a character) renders the page again but must keep what is being typed.
await page.fill("#boss-q", "세렌");
const rsc = page.waitForResponse((r) => r.url().includes("_rsc="), { timeout: 15000 }).catch(() => null);
await page.evaluate(() => window.next.router.refresh());
const got = await rsc;
await page.waitForTimeout(1000);
const kept = await page.inputValue("#boss-q");
console.log(`${got && kept === "세렌" ? "ok  " : "FAIL"} refresh while typing keeps "${kept}" (server answered: ${!!got})`); if (!(got && kept === "세렌")) bad++;
console.log(bad ? `# ${bad} failed` : "# all passed");
await browser.close();
process.exit(bad ? 1 : 0);

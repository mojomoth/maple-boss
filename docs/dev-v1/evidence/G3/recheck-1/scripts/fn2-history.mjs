// Recheck FN-2 (independent of the builder's boss-history.mjs). The 보스 검색 field must always name the boss shown in
// 보스 정보 (or the missing text when #boss-msg shows), each search must add exactly one history entry, and Back/Forward
// (slow and rapid) must keep the field in step. Searches use per-key typing, the search button, Enter and fill().
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const W = Number(process.argv[2] ?? 1440), H = Number(process.argv[3] ?? 900);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, locale: "ko-KR" })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (process.env.THROTTLE) { const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.THROTTLE) }); }
let fails = 0;
const log = (s) => console.log(s);
const state = () => page.evaluate(() => {
  const badge = document.querySelector(".boss-name .badge")?.textContent ?? "";
  const name = document.querySelector(".boss-name h3")?.textContent ?? "";
  return { shown: `${badge} ${name}`, field: document.querySelector("#boss-q").value, msg: document.querySelector("#boss-msg").textContent, url: location.pathname + location.search, len: history.length, focus: document.activeElement?.id ?? document.activeElement?.tagName };
});
const settle = async () => { await page.waitForLoadState("networkidle"); await page.waitForTimeout(1200); };
const check = async (label, expect = {}) => {
  const s = await state();
  const fieldOk = s.msg ? s.field === expect.missing : s.field === s.shown;
  let ok = fieldOk;
  if (expect.shown && s.shown !== expect.shown) ok = false;
  if (expect.len !== undefined && s.len !== expect.len) ok = false;
  if (expect.focus && s.focus !== expect.focus) ok = false;
  if (!ok) fails++;
  log(`${ok ? "ok  " : "FAIL"} ${label.padEnd(26)} shown='${s.shown}' field='${s.field}' msg='${s.msg}' url=${decodeURIComponent(s.url)} len=${s.len} focus=${s.focus}${expect.shown ? ` (want shown '${expect.shown}')` : ""}${expect.len !== undefined ? ` (want len ${expect.len})` : ""}`);
  return s;
};
await page.goto(BASE + "/", { waitUntil: "networkidle" });
let s = await check("start");
let len = s.len;
// 1. per-key typing + Enter (the last key completes a label? no: alias)
await page.fill("#boss-q", "");
await page.type("#boss-q", "하스우", { delay: 40 });
await page.press("#boss-q", "Enter");
await settle();
await check("type 하스우 + Enter", { shown: "하드 스우", len: ++len, focus: "boss-q" });
// 2. per-key typing of a full label: last key auto-submits, then Enter
await page.fill("#boss-q", "");
await page.type("#boss-q", "노말 카링", { delay: 40 });
await page.press("#boss-q", "Enter");
await settle();
await check("type 노말 카링 + Enter", { shown: "노말 카링", len: ++len, focus: "boss-q" });
// 3. difficulty-first alias via the search button
await page.fill("#boss-q", "익스 카링");
await page.click("button[aria-label='보스 찾기']");
await settle();
await check("click 익스 카링", { shown: "익스트림 카링", len: ++len });
// 4. missing
await page.fill("#boss-q", "zzz");
await page.press("#boss-q", "Enter");
await settle();
await check("zzz (missing)", { shown: "익스트림 카링", missing: "zzz", len: ++len });
// 5. alias 카칼
await page.fill("#boss-q", "카칼");
await page.press("#boss-q", "Enter");
await settle();
await check("카칼", { shown: "카오스 감시자 칼로스", len: ++len });
// 6. Enter again without editing: no new entry
await page.press("#boss-q", "Enter");
await settle();
await check("Enter again (no-op)", { shown: "카오스 감시자 칼로스", len });
// slow Back x5, Forward x3
const expectBack = [
  ["back", { shown: "익스트림 카링", missing: "zzz" }],
  ["back", { shown: "익스트림 카링" }],
  ["back", { shown: "노말 카링" }],
  ["back", { shown: "하드 스우" }],
  ["back", { shown: "익스트림 카링" }],
  ["forward", { shown: "하드 스우" }],
  ["forward", { shown: "노말 카링" }],
  ["forward", { shown: "익스트림 카링" }],
];
for (const [dir, e] of expectBack) {
  await (dir === "back" ? page.goBack() : page.goForward());
  await settle();
  await check(`slow ${dir}`, { ...e, len });
}
// rapid: 2x forward with no wait, then 3x back with no wait
await page.evaluate(() => { history.forward(); });
await page.waitForTimeout(60);
await page.evaluate(() => { history.forward(); });
await settle();
await check("rapid forward x2", { shown: "카오스 감시자 칼로스", len });
for (let i = 0; i < 3; i++) { await page.evaluate(() => history.back()); await page.waitForTimeout(80); }
await settle();
await check("rapid back x3", { shown: "노말 카링", len }); // entries: blank, /, hard-lotus, normal-kaling, extreme-kaling, zzz, chaos-kalos
await page.reload({ waitUntil: "networkidle" });
await check("reload", { shown: "노말 카링", len });
// a shared /?q= link is rewritten to /?boss=<id>
await page.goto(BASE + "/?q=" + encodeURIComponent("검마"), { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const q = await check("shared /?q=검마", {});
if (!/boss=/.test(q.url)) { fails++; log("FAIL shared link not rewritten to ?boss="); }
await page.goBack(); await settle();
await check("back from shared link", {});
await page.screenshot({ path: process.argv[4] ?? `/tmp/recheck1/fn2-${W}.png` });
if (errors.length) { fails++; log("FAIL page errors: " + errors.join(" | ")); }
log(fails ? `# ${fails} failed` : "# all passed");
await browser.close();

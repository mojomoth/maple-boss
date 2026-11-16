// Fix round 1, D2: every boss label the search writes back fits the 보스 검색 field (critic-design/scripts/labels.mjs,
// at 1440, 1920 and 375), and a header shot after /?boss=extreme-first-adversary and a 칼로스 search.
// Usage: node labels.mjs [shots dir]
import path from "node:path";
import { mkdirSync } from "node:fs";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const out = path.resolve(process.argv[2] ?? "/tmp/fix1/labels");
mkdirSync(out, { recursive: true });
let fails = 0;
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
for (const [w, h] of [[1440, 900], [1920, 1080], [375, 812]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR" });
  await page.goto(BASE + "/?boss=extreme-first-adversary", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const shown = await page.inputValue("#boss-q");
  const [fit, room] = await page.evaluate(() => { const i = document.querySelector("#boss-q"); return [i.scrollWidth <= i.clientWidth, `${Math.round(i.getBoundingClientRect().width)}px field, client ${i.clientWidth}`]; });
  await page.locator(".search--boss").screenshot({ path: path.join(out, `long-boss-${w}.png`) });
  for (const hover of [false, true]) {
    if (hover) await page.hover("#boss-q");
    const r = await page.evaluate(() => {
      const i = document.querySelector("#boss-q");
      const keep = i.value;
      const labels = [...document.querySelectorAll("#boss-list option")].map((o) => o.value);
      const clipped = labels.filter((l) => { i.value = l; return i.scrollWidth > i.clientWidth; });
      i.value = keep;
      return { total: labels.length, clipped };
    });
    const ok = r.clipped.length === 0;
    if (!ok) fails++;
    console.log(`${ok ? "ok  " : "FAIL"} ${w}${hover ? " hover" : ""}: ${r.total} labels, ${r.clipped.length} clipped${r.clipped.length ? ": " + r.clipped.join(", ") : ""} (${room})`);
  }
  console.log(`${fit ? "ok  " : "FAIL"} ${w}: /?boss=extreme-first-adversary -> field "${shown}" fits`); if (!fit) fails++;
  // A search typed by hand, the label written back
  await page.fill("#boss-q", "카칼");
  await page.press("#boss-q", "Enter");
  await page.waitForURL((u) => u.searchParams.get("boss") === "chaos-kalos" && !u.searchParams.has("q"), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const v = await page.inputValue("#boss-q");
  const fit2 = await page.evaluate(() => { const i = document.querySelector("#boss-q"); return i.scrollWidth <= i.clientWidth; });
  console.log(`${fit2 && v === "카오스 감시자 칼로스" ? "ok  " : "FAIL"} ${w}: search "카칼" -> field "${v}" fits=${fit2}`); if (!(fit2 && v === "카오스 감시자 칼로스")) fails++;
  await page.close();
}
await browser.close();
console.log(fails ? `# ${fails} failed` : "# all passed");
process.exit(fails ? 1 : 0);

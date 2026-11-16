import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const BASE = "http://localhost:3100";
const out = process.argv[2];
const SEED = JSON.parse(readFileSync("/Users/jeongyounglee/work/repo/maple-boss/pocs/seed/아델.json", "utf8"));
const name = "WWWWWWWWWWWWWWWWWWWW";
const p = { ...SEED, info: { ...SEED.info, character_name: name, world_name: "가".repeat(50), character_class: "M".repeat(50) } };
console.log("import", (await fetch(BASE + "/api/character/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) })).status);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" })).newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
    const over = [...document.querySelectorAll(".card, .card *, .party *, .member *")].filter((e) => { const r = e.getBoundingClientRect(); const c = e.closest(".card, .party")?.getBoundingClientRect(); return c && (r.right > c.right + 1 || r.left < c.left - 1); }).length;
    return { vw, sw, over };
  });
  console.log(`${w}: page scrollWidth ${m.sw} vs ${m.vw}; elements spilling out of their card/party box: ${m.over}`);
  await page.locator(".card", { hasText: name }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/long-name-${w}.png` });
  await page.locator(".card", { hasText: name }).click();
  await page.waitForTimeout(300);
  const d = await page.evaluate(() => { const b = document.querySelector("dialog.confirm")?.getBoundingClientRect(); return b ? { left: b.left, right: b.right, vw: innerWidth } : null; });
  console.log(`${w}: dialog box ${JSON.stringify(d)}`);
  await page.screenshot({ path: `${out}/long-name-modal-${w}.png` });
}
await browser.close();
console.log("cleanup", (await fetch(BASE + "/api/character/" + name, { method: "DELETE" })).status);

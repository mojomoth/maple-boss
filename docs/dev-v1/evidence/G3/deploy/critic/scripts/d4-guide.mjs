import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const BASE = "https://maple-boss-livid.vercel.app";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, locale: "ko-KR", colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
for (const n of ["아델qa12345", "강은호", "WWWWWWWWWWWW", "Wide이름WWWWWWWWWWWW"]) {
  await page.fill("#character-name", n);
  await page.click("button:has-text('추가')");
  await page.locator("section.guide").waitFor();
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const g = document.querySelector("section.guide").getBoundingClientRect();
    const x = document.querySelector("section.guide .icon-btn").getBoundingClientRect();
    const st = getComputedStyle(document.querySelector("section.guide"));
    return { guide: `${Math.round(g.left)}..${Math.round(g.right)}`, close: `${Math.round(x.left)}..${Math.round(x.right)}`, vw: innerWidth, docW: document.documentElement.scrollWidth, bodyOverflowX: getComputedStyle(document.body).overflowX, htmlOverflowX: getComputedStyle(document.documentElement).overflowX };
  });
  console.log(`375 guide for '${n}' (${n.length} chars): ${JSON.stringify(r)}`);
  await page.locator("section.guide").screenshot({ path: `/tmp/critic-g3/shots/d4/guide-375-${n.length}.png` });
  await page.click("button[aria-label='가져오기 안내 닫기']", { force: true }).catch(async () => page.keyboard.press("Escape"));
  await page.waitForTimeout(200);
}
await browser.close();

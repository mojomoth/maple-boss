import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto("http://localhost:3000/?boss=extreme-kaling", { waitUntil: "networkidle" });
for (const [q, want] of [["노말 카링", "노말 카링"], ["익카링", "익스트림 카링"], ["카더스크", "카오스 더스크"], ["하드 검마", "하드 검은 마법사"]]) {
  await page.fill("#boss-q", q);
  await page.press("#boss-q", "Enter");
  await page.waitForFunction((w) => document.querySelector(".boss-name .badge").textContent + " " + document.querySelector(".boss-name h3").textContent === w, want, { timeout: 15000 }).then(() => console.log("ok", q, "->", want), async () => console.log("FAIL", q, await page.locator(".boss-name").innerText()));
  await page.waitForTimeout(500);
  console.log("   field", await page.inputValue("#boss-q"), "url", page.url(), "parties", await page.locator("ol.parties > li").count(), "first", (await page.locator("ol.parties > li").first().innerText().catch(()=>"")).replace(/\s+/g," ").slice(0,80));
}
await browser.close();

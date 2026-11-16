import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
for (const w of [320, 360, 390, 414, 430, 600, 640, 700, 768, 800, 900, 960, 961, 1000, 1024, 1100, 1180, 1200, 1280, 1366, 1440, 1536, 1920, 2560]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const a = document.querySelector(".logo a").getBoundingClientRect();
    const img = document.querySelector(".logo img").getBoundingClientRect();
    const docW = document.documentElement.scrollWidth;
    const labels = [...document.querySelectorAll(".search label")].map((l) => { const r = l.getBoundingClientRect(); return Math.round(r.width) + "x" + Math.round(r.height); });
    const ph = document.querySelector("#character-name"); 
    return { logoBox: Math.round(a.width), img: Math.round(img.width) + "x" + Math.round(img.height), docW, labels };
  });
  console.log(w, JSON.stringify(r));
}
await browser.close();

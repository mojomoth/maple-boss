// P2 follow-up: width of the header logo box between 961 and 1280px (outside the G3-2 sizes), after D2's wider field.
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
for (const w of [961, 1000, 1024, 1100, 1180, 1200, 1240, 1250, 1280, 1440]) {
  await p.setViewportSize({ width: w, height: 800 });
  await p.waitForTimeout(150);
  const r = await p.evaluate(() => { const l = document.querySelector(".logo").getBoundingClientRect(); const i = document.querySelector(".logo img").getBoundingClientRect(); return `logo box ${Math.round(l.width)}px, img ${Math.round(i.width)}px`; });
  console.log(`${w}: ${r}`);
}
await b.close();

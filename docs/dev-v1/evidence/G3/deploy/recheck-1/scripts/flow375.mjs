import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const BASE = "https://maple-boss-livid.vercel.app";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, locale: "ko-KR" });
await page.goto(BASE + "/flow", { waitUntil: "networkidle" });
const r = await page.evaluate(() => {
  const vw = innerWidth; const res = [];
  for (const el of document.querySelectorAll("body *")) {
    const b = el.getBoundingClientRect();
    if (b.right > vw + 1 && b.width > 0) {
      let sc = null; for (let p = el.parentElement; p; p = p.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) { sc = p.className; break; } }
      if (!sc) res.push(`${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className} right=${Math.round(b.right)} "${(el.textContent || "").trim().slice(0, 60)}"`);
    }
  }
  return { vw, docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, items: res.slice(0, 15) };
});
console.log(JSON.stringify(r, null, 1));
const blk = page.locator("text=막힌 일").first();
await blk.scrollIntoViewIfNeeded();
await page.screenshot({ path: (process.argv[2] ?? "/tmp") + "/flow-375-blockers.png" });
await browser.close();

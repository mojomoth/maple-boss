// zoom.mjs <url> <w> <h> <selector-or-x,y,w,h> <out> [scale]
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const [url, w, h, clip, out, scale = "2"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale, locale: "ko-KR", colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const [x, y, cw, ch] = clip.split(",").map(Number);
await page.screenshot({ path: out, clip: { x, y, width: cw, height: ch }, fullPage: true });
await browser.close();

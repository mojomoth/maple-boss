// Full-page screenshots of every screen at 1440 and 375 into argv[2], for a byte comparison before/after a CSS change.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../../../../pocs/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const out = process.argv[2];
mkdirSync(out, { recursive: true });
const PAGES = [["home", "/"], ["flow", "/flow"], ["import", "/import"], ["404", "/pocs"], ["character", "/pocs/character"], ["boss", "/pocs/boss?q=%EC%B9%B4%EB%A7%81"], ["party", "/pocs/party"]];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark", reducedMotion: "reduce" });
  for (const [name, url] of PAGES) {
    const page = await ctx.newPage();
    await page.goto("http://localhost:3000" + url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `${name}-${w}.png`), fullPage: true });
    if (name === "home") {
      await page.locator("button.card").first().click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `modal-${w}.png`) });
    }
    if (name === "flow") {
      await page.locator("button.flow-node").first().click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `flow-panel-${w}.png`) });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log("done", out);

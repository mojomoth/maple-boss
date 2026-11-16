// G3: the screens without a draft (/flow, /import, /pocs/*) at 1440 and 375, full page, for the design-language check.
// Usage: node screens.mjs <outDir>  (dev server on BASE_URL, default http://localhost:3000; system Chrome)
// /import is shot twice: with no payload (its error state) and while it waits on a slow import (its busy state,
// the POST is held by a route stub so nothing is saved). Also reports any element wider than the viewport.
// The Next dev-tools badge is hidden: it exists only under `next dev`.
import path from "node:path";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const out = path.resolve(process.argv[2] ?? ".");
const PAGES = [
  ["flow", "/flow"],
  ["import-error", "/import"],
  ["import-busy", "/import#%7B%7D"],
  ["pocs-character", "/pocs/character"],
  ["pocs-boss", "/pocs/boss?q=%EC%B9%B4%EB%A7%81"],
  ["pocs-party", "/pocs/party"],
];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
let fails = 0;
try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
    await ctx.route("**/api/character/import", () => {}); // never answers: /import stays in its busy state
    for (const [name, url] of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const res = await page.goto(BASE + url, { waitUntil: name === "import-busy" ? "load" : "networkidle" });
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `${name}-${w}.png`), fullPage: true });
      const wide = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        return { page: document.documentElement.scrollWidth, over: [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > vw + 1 && !e.closest(".flow-canvas, .cards, .table-wrap")).length };
      });
      const ok = res?.status() === 200 && errors.length === 0 && wide.page <= w;
      if (!ok) fails++;
      console.log(`${ok ? "ok  " : "FAIL"} ${w} ${url} ${res?.status()} scrollWidth ${wide.page}, elements past the edge ${wide.over}${errors.length ? ` | ${errors.join(" | ")}` : ""}`);
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(fails ? 1 : 0);

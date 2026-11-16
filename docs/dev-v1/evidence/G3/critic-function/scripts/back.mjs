import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" })).newPage();
const s = () => page.evaluate(() => `boss='${document.querySelector(".boss-name")?.textContent}' field='${document.querySelector("#boss-q")?.value}' url=${location.pathname + location.search} len=${history.length}`);
await page.goto(BASE + "/", { waitUntil: "networkidle" });
console.log("start  ", await s());
for (const q of ["하스우", "노말 카링"]) {
  await page.fill("#boss-q", q);
  await page.press("#boss-q", "Enter");
  await page.waitForTimeout(2500);
  console.log(`search ${q}`, await s());
}
await page.goBack(); await page.waitForTimeout(3000); console.log("back   ", await s());
await page.goBack(); await page.waitForTimeout(3000); console.log("back   ", await s());
await page.goForward(); await page.waitForTimeout(3000); console.log("forward", await s());
await page.screenshot({ path: process.argv[2] ?? "/tmp/critic-fn/back.png" });
await page.reload({ waitUntil: "networkidle" }); console.log("reload ", await s());
await browser.close();

import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const BASE = "http://localhost:3104";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR", colorScheme: "dark" })).newPage();
for (const [name, u] of [["dbdown-home", "/"], ["dbdown-party", "/pocs/party"], ["dbdown-character", "/pocs/character"]]) {
  await page.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(800);
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 220);
  console.log(`${u}: title='${await page.title()}' text='${text}'`);
  await page.screenshot({ path: `${out}/${name}.png` });
}
// retry button
await page.goto(BASE + "/", { waitUntil: "networkidle" }).catch(() => {});
const retry = page.locator("button:has-text('다시 시도')");
if (await retry.count()) { await retry.click(); await page.waitForTimeout(1500); console.log("after 다시 시도:", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 120)); }
await browser.close();

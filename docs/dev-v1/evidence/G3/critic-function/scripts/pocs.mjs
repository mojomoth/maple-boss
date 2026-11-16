import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(BASE + "/pocs/character", { waitUntil: "networkidle" });
const rows = await page.locator(".pick-row").count();
await page.locator(".pick-row").first().click();
await page.waitForSelector("ul.rates li", { timeout: 8000 }).catch(() => {});
console.log(`/pocs/character: ${rows} saved rows; after click: result '${await page.locator("#result-title").textContent().catch(() => "")}', rates ${await page.locator("ul.rates li").count()}, first '${(await page.locator("ul.rates li").first().textContent().catch(() => "")).trim()}'`);
for (const q of ["하스우", "검마", "노말 카링", "없는보스"]) {
  await page.goto(BASE + "/pocs/boss", { waitUntil: "networkidle" });
  await page.fill("input[name=q]", q);
  await page.click("button:has-text('검색')");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const groups = await page.locator("main section.panel").evaluateAll((s) => s.map((x) => `${x.getAttribute("aria-label")}[${[...x.querySelectorAll("tbody tr td:first-child")].map((t) => t.textContent).join(",")}]`));
  const help = await page.locator("main .section-help").textContent().catch(() => "");
  console.log(`/pocs/boss '${q}': ${groups.join(" ")} ${help ?? ""} url=${new URL(page.url()).search}`);
}
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();

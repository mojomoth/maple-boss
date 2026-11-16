import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const BASE = "http://localhost:3100";
const SEED = JSON.parse(readFileSync("/Users/jeongyounglee/work/repo/maple-boss/pocs/seed/아델.json", "utf8"));
const name = "<svg/onload=alert``>";
const p = { ...SEED, info: { ...SEED.info, character_name: name, character_class: `<img src=x onerror="window.__xss=1">`, world_name: `"><script>window.__xss=2</script>` } };
const r = await fetch(BASE + "/api/character/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
console.log("import", r.status);
await fetch(BASE + "/api/party/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ characterName: name, bossId: "extreme-kaling", partySize: 2 }) });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
let dialogs = 0;
page.on("dialog", (d) => { dialogs++; d.dismiss(); });
for (const u of ["/", "/pocs/party", "/pocs/character", `/?q=${encodeURIComponent("<svg/onload=alert(1)>")}`, `/pocs/boss?q=${encodeURIComponent("<img src=x onerror=alert(1)>")}`]) {
  await page.goto(BASE + u, { waitUntil: "networkidle" });
  if (u === "/") { await page.locator(".card", { hasText: "svg" }).click(); await page.waitForTimeout(300); }
  if (u === "/pocs/character") { await page.locator(".pick-row", { hasText: "svg" }).click(); await page.waitForTimeout(800); }
  if (u === "/pocs/party") { await page.selectOption("select[name=builderBossId]", "extreme-kaling"); await page.waitForTimeout(300); }
  const x = await page.evaluate(() => window.__xss);
  const injected = await page.evaluate(() => document.querySelectorAll("main svg[onload], main img[onerror], main script:not([src])").length);
  console.log(`${u}: window.__xss=${x} injected nodes=${injected} dialogs=${dialogs}`);
}
await browser.close();
const d = await fetch(BASE + "/api/character/" + encodeURIComponent(name), { method: "DELETE" });
console.log("cleanup", d.status);

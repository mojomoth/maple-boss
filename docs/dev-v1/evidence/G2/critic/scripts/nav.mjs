// G2 critic: click-through navigation at 1440x900 and 375x812, and /import with valid/invalid/empty hash.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");

const BASE = "http://localhost:3000";
const OUT = process.argv[2] ?? "/tmp/g2critic/shots";
mkdirSync(OUT, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let fails = 0;
const log = (ok, msg) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) fails++;
};

const browser = await chromium.launch({ executablePath: CHROME });
const tag = Date.now().toString(36).slice(-5);
const tmpName = `아델crit${tag}`;
try {
  for (const [w, h] of [
    [1440, 900],
    [375, 812],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
    const page = await ctx.newPage();
    const errors = [];
    const bad = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().startsWith(BASE) && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
    });

    for (const [target, label] of [
      ["/pocs/character", "캐릭터 등록"],
      ["/pocs/boss", "보스 조회"],
      ["/pocs/party", "파티 편성"],
      ["/flow", "개발 진행"],
    ]) {
      await page.goto(BASE + "/", { waitUntil: "networkidle" });
      const link = page.locator(`a[href="${target}"]`).first();
      const visible = await link.isVisible();
      const box = await link.boundingBox();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await page.waitForURL(BASE + target, { timeout: 10000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
      log(new URL(page.url()).pathname === target, `${w} / -> click "${label}" -> ${new URL(page.url()).pathname} (visible=${visible}, box=${box && `${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`})`);
      // horizontal overflow of the page itself
      const ovf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      log(ovf <= 0, `${w} ${target} page horizontal overflow = ${ovf}px`);
      await page.screenshot({ path: `${OUT}/${target.replaceAll("/", "_")}-${w}.png` });
      // way back to /
      const backs = page.locator('a[href="/"]');
      const n = await backs.count();
      let clicked = false;
      for (let i = 0; i < n; i++) {
        const b = backs.nth(i);
        if (await b.isVisible()) {
          const text = (await b.innerText()).trim() || (await b.getAttribute("aria-label"));
          await b.click();
          await page.waitForURL(BASE + "/", { timeout: 10000 }).catch(() => {});
          log(new URL(page.url()).pathname === "/", `${w} ${target} -> click back "${text}" -> ${new URL(page.url()).pathname}`);
          clicked = true;
          break;
        }
      }
      if (!clicked) log(false, `${w} ${target}: no visible link to /`);
    }

    // cross links between pocs pages, and from /flow to pocs pages
    for (const from of ["/pocs/character", "/pocs/boss", "/pocs/party", "/flow"]) {
      for (const to of ["/pocs/character", "/pocs/boss", "/pocs/party", "/flow"]) {
        if (from === to) continue;
        await page.goto(BASE + from, { waitUntil: "networkidle" });
        const l = page.locator(`a[href="${to}"]`).first();
        if (!(await l.count())) {
          console.log(`info ${w} ${from}: no link to ${to}`);
          continue;
        }
        await l.click();
        await page.waitForURL(BASE + to, { timeout: 10000 }).catch(() => {});
        log(new URL(page.url()).pathname === to, `${w} ${from} -> ${to}`);
      }
    }

    // /import: no hash, invalid hash, broken JSON, valid hash
    for (const [name, hash] of [
      ["empty", ""],
      ["garbage", "#%E0%A4%A"],
      ["not-maplescouter", "#" + encodeURIComponent(JSON.stringify({ foo: 1 }))],
    ]) {
      await page.goto(BASE + "/import" + hash, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const status = await page.locator('[role="status"]').innerText();
      const back = page.locator('main a[href="/"]');
      const hasBack = (await back.count()) > 0 && (await back.first().isVisible());
      await page.screenshot({ path: `${OUT}/import-${name}-${w}.png` });
      log(hasBack && !/가져오는 중/.test(status), `${w} /import ${name}: "${status}" back-link=${hasBack}`);
      if (hasBack) {
        await back.first().click();
        await page.waitForURL(BASE + "/", { timeout: 10000 }).catch(() => {});
        log(new URL(page.url()).pathname === "/", `${w} /import ${name} -> back -> ${new URL(page.url()).pathname}`);
      }
    }

    // valid import with a temp name, then delete it
    const seed = JSON.parse(readFileSync("/Users/jeongyounglee/work/repo/maple-boss/pocs/seed/아델.json", "utf8"));
    seed.info.character_name = tmpName;
    const renamed = JSON.stringify(seed);
    await page.goto(BASE + "/import#" + encodeURIComponent(renamed));
    await page.waitForURL(BASE + "/", { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    const onHome = new URL(page.url()).pathname === "/";
    const listed = await page.getByText(tmpName).count();
    log(onHome, `${w} /import valid -> ${new URL(page.url()).pathname} (name on page: ${listed})`);
    await page.screenshot({ path: `${OUT}/import-valid-after-${w}.png` });
    const del = await page.request.delete(`${BASE}/api/character/${encodeURIComponent(tmpName)}`);
    console.log(`info cleanup DELETE ${tmpName} -> ${del.status()}`);

    // unknown route
    const r404 = await page.goto(BASE + "/pocs", { waitUntil: "networkidle" });
    console.log(`info ${w} GET /pocs -> ${r404.status()}`);

    log(errors.length === 0, `${w} page errors: ${errors.join(" | ") || "none"}`);
    const realBad = bad.filter((b) => !b.endsWith("/pocs"));
    log(realBad.length === 0, `${w} >=400 responses: ${realBad.join(" | ") || "none"}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");
process.exit(fails ? 1 : 0);

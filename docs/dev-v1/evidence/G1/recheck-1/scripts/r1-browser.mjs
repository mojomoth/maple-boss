// Regression: /, /pocs/party at 1440 and 375, and /import (no payload, broken payload, valid payload).
// Checks: HTTP 200, no page errors / console errors, no sideways page scroll, no broken images, key content, screenshot.
import { BASE, launch, check, failures, payload, del } from "../../critic-ui/scripts/lib.mjs";
const OUT = "/Users/jeongyounglee/work/repo/maple-boss/docs/dev-v1/evidence/G1/recheck-1";
const browser = await launch();
const measure = (page) => page.evaluate(() => {
  const de = document.documentElement;
  const inScroller = (el) => { for (let a = el.parentElement; a; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return a !== document.body && a !== de; } return false; };
  const wide = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(el).position !== "fixed" && !inScroller(el); })
    .slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} ${Math.round(el.getBoundingClientRect().left)}..${Math.round(el.getBoundingClientRect().right)}`);
  const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(0, 80));
  return { scrollW: de.scrollWidth, innerW: innerWidth, wide, broken, text: document.body.innerText };
});
let made = null;
try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR" });
    const page = await ctx.newPage(); const errs = [];
    page.on("console", (m) => m.type() === "error" && errs.push(`console: ${m.text().slice(0, 200)}`));
    page.on("pageerror", (e) => errs.push(`pageerror: ${e.message.slice(0, 200)}`));
    // home
    errs.length = 0; let r = await page.goto(BASE + "/", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    let m = await measure(page);
    check(`${w} / : 200, no errors, no sideways scroll, images ok`, r.status() === 200 && errs.length === 0 && m.scrollW <= w && m.wide.length === 0 && m.broken.length === 0, JSON.stringify({ s: r.status(), errs, scrollW: m.scrollW, wide: m.wide, broken: m.broken }));
    check(`${w} / : sections present (내 캐릭터, 보스 정보, 추천 파티)`, /내 캐릭터/.test(m.text) && /보스 정보/.test(m.text) && /추천 파티/.test(m.text), "");
    await page.screenshot({ path: `${OUT}/home-${w}.png` });
    // boss search → recommendation updates
    await page.fill("#boss-q", "익스트림 카링"); await page.press("#boss-q", "Enter");
    await page.waitForURL(/q=/, { timeout: 10000 }).catch(() => {}); await page.waitForLoadState("networkidle"); await page.waitForTimeout(400);
    m = await measure(page);
    const boss = await page.locator(".boss-name").innerText().catch(() => "");
    const parties = await page.locator("ol.parties > li").count();
    check(`${w} / : boss search '익스트림 카링' shows the boss and recommended parties`, /카링/.test(boss) && errs.length === 0 && m.scrollW <= w, `boss=${boss.replace(/\n/g, " ")} parties=${parties} errs=${errs.join("|")} scrollW=${m.scrollW}`);
    // /pocs/party
    errs.length = 0; r = await page.goto(BASE + "/pocs/party", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    m = await measure(page);
    check(`${w} /pocs/party : 200, no errors, no sideways scroll, images ok`, r.status() === 200 && errs.length === 0 && m.scrollW <= w && m.wide.length === 0 && m.broken.length === 0, JSON.stringify({ s: r.status(), errs, scrollW: m.scrollW, wide: m.wide, broken: m.broken }));
    const sel = await page.locator("select").count();
    check(`${w} /pocs/party : controls render (selects, 구직 등록, 파티 편성)`, sel >= 2 && /구직 등록/.test(m.text) && /파티 편성/.test(m.text), `selects=${sel}`);
    await page.screenshot({ path: `${OUT}/pocs-party-${w}.png` });
    // /import
    errs.length = 0; r = await page.goto(BASE + "/import", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    m = await measure(page);
    check(`${w} /import (no payload): Korean error + 메인 화면으로 link, no sideways scroll`, r.status() === 200 && /가져올 데이터가 없어요/.test(m.text) && /메인 화면으로/.test(m.text) && m.scrollW <= w && errs.length === 0, JSON.stringify({ s: r.status(), errs, scrollW: m.scrollW, wide: m.wide }));
    await page.screenshot({ path: `${OUT}/import-empty-${w}.png` });
    await page.goto("about:blank"); // /import -> /import#x is a same-document hash change; the bookmarklet always arrives by a fresh load
    await page.goto(BASE + "/import#%7Bbroken", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    m = await measure(page);
    check(`${w} /import#broken: '깨져 있어요' message`, /깨져 있어요/.test(m.text), m.text.split("\n").slice(-4).join(" / "));
    if (w === 375) {
      const N = "재검증가져오기";
      await page.goto("about:blank");
      const t = await page.goto(BASE + "/import#" + encodeURIComponent(JSON.stringify(payload(N, [["카링", "Extreme", 0.5]]))), { waitUntil: "domcontentloaded" });
      made = N;
      await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 15000 }).catch(() => {});
      await page.waitForLoadState("networkidle"); await page.waitForTimeout(400);
      const url = page.url(); const card = await page.locator(".card-name", { hasText: new RegExp(`^${N}$`) }).count();
      check(`375 /import#<valid payload>: saves, lands on / with the new card`, t.status() === 200 && new URL(url).pathname === "/" && card === 1 && errs.length === 0, `url=${url} card=${card} errs=${errs.join("|")}`);
    }
    await ctx.close();
  }
} catch (e) { check("run", false, e.stack); }
finally { if (made) console.log(`cleanup ${made}: ${await del(made)}`); await browser.close(); }
console.log(failures() ? `# ${failures()} failed` : "# all passed");

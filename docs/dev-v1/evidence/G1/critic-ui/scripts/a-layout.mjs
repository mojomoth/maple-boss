import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const BASE = "http://localhost:3000";
const OUT = "/Users/jeongyounglee/work/repo/maple-boss/docs/dev-v1/evidence/G1/critic-ui";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR" });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(`${m.type()}: ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  for (const p of ["/", "/pocs/character", "/pocs/boss", "/pocs/party", "/import"]) {
    logs.length = 0;
    const r = await page.goto(BASE + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && getComputedStyle(el).position !== "fixed"; })
        .slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} right=${Math.round(el.getBoundingClientRect().right)}`);
      const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(0, 80));
      return { scrollW: de.scrollWidth, innerW: innerWidth, h1: document.querySelector("h1")?.textContent?.trim(), title: document.title, lang: de.lang, wide, brokenImgs: imgs };
    });
    const name = `${p === "/" ? "home" : p.slice(1).replace(/\//g, "-")}-${w}.png`;
    await page.screenshot({ path: `${OUT}/${name}`, fullPage: false });
    console.log(JSON.stringify({ p, w, status: r.status(), ...m, logs: [...logs] }));
  }
  await ctx.close();
}
await browser.close();

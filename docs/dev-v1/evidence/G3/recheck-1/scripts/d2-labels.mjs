// Recheck D2: every one of the 60 boss labels the app can write back into the header 보스 검색 field must fit the
// field's text box. Two measures per label: Chrome's scrollWidth vs clientWidth, and the span-measured text width vs the
// content box (border box minus borders and paddings) with a hidden cancel glyph. At rest, hovered and focused.
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "/tmp/recheck1";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
let fails = 0;
for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 800], [1024, 768], [375, 812]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  for (const mode of ["rest", "hover", "focus"]) {
    if (mode === "hover") await page.hover("#boss-q");
    if (mode === "focus") await page.focus("#boss-q");
    const r = await page.evaluate(() => {
      const i = document.querySelector("#boss-q");
      const cs = getComputedStyle(i);
      // a span with the field's font measures the text; the content box is the border box minus borders and paddings
      const span = document.createElement("span");
      span.style.cssText = `position:absolute;white-space:pre;visibility:hidden;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
      document.body.append(span);
      const ctx = { measureText: (t) => { span.textContent = t; return { width: span.getBoundingClientRect().width }; } };
      const box = i.getBoundingClientRect().width - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const btn = document.querySelector(".search--boss .icon-btn").getBoundingClientRect();
      const ir = i.getBoundingClientRect();
      const labels = [...document.querySelectorAll("#boss-list option")].map((o) => o.value);
      const keep = i.value;
      const bad = [];
      let widest = ["", 0];
      for (const l of labels) {
        i.value = l;
        const tw = ctx.measureText(l).width;
        if (tw > widest[1]) widest = [l, tw];
        // text ends at left + paddingLeft + tw; it must also stay left of the icon button
        const textEnd = ir.left + parseFloat(cs.paddingLeft) + tw;
        if (i.scrollWidth > i.clientWidth || tw > box || textEnd > btn.left) bad.push(`${l}(${tw.toFixed(1)})`);
      }
      i.value = keep;
      span.remove();
      return { n: labels.length, field: Math.round(ir.width), box: box.toFixed(1), btnLeft: Math.round(btn.left - ir.left), widest: `${widest[0]} ${widest[1].toFixed(1)}px`, bad };
    });
    const ok = r.bad.length === 0;
    if (!ok) fails++;
    console.log(`${ok ? "ok  " : "FAIL"} ${w}x${h} ${mode.padEnd(5)} ${r.n} labels, field ${r.field}px, text box ${r.box}px, button at +${r.btnLeft}px, widest ${r.widest}; clipped ${r.bad.length}${r.bad.length ? ": " + r.bad.join(", ") : ""}`);
  }
  await page.mouse.move(0, 0);
  await page.goto(BASE + "/?boss=extreme-first-adversary", { waitUntil: "networkidle" });
  await page.locator(".topbar").screenshot({ path: `${out}/d2-header-first-adversary-${w}.png` });
  await page.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");
await browser.close();

// Critic (design lens): capture every route at 1440x900, 1920x1080, 375x812 (+1448x1086 for draft comparison),
// and run layout checks in the page: horizontal overflow, elements outside viewport, clipped text, tiny text,
// overlapping text boxes, console/page errors.
// Usage: node shots.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const BASE = "http://localhost:3000";
const out = path.resolve(process.argv[2] ?? "/tmp/critic-design/out");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

const routes = [
  ["home", "/"],
  ["flow", "/flow"],
  ["import", "/import"],
  ["pocs-character", "/pocs/character"],
  ["pocs-boss", "/pocs/boss"],
  ["pocs-party", "/pocs/party"],
  ["404", "/no-such-page-xyz"],
  ["404-pocs", "/pocs"],
];
const sizes = [
  [1440, 900],
  [1920, 1080],
  [375, 812],
];

export const checks = () => {
  const vw = document.documentElement.clientWidth;
  const res = { title: document.title, docW: document.documentElement.scrollWidth, vw, docH: document.documentElement.scrollHeight, outside: [], clipped: [], tiny: [], overlaps: [] };
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    if (el.className && typeof el.className === "string") s += "." + el.className.trim().split(/\s+/).slice(0, 2).join(".");
    const t = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return t ? `${s} "${t}"` : s;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return false;
    if (el.closest(".visually-hidden, [hidden], nextjs-portal")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // inside a horizontal scroller?
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth) return p;
    }
    return null;
  };
  const all = [...document.body.querySelectorAll("*")].filter((el) => !["SCRIPT", "STYLE", "svg", "path", "NOSCRIPT"].includes(el.tagName) && !(el instanceof SVGElement));
  for (const el of all) {
    if (!visible(el)) continue;
    if (el.closest("dialog") && !el.closest("dialog").open) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) res.outside.push(`${desc(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    const cs = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      const fs = parseFloat(cs.fontSize);
      if (fs < 12) res.tiny.push(`${desc(el)} ${fs}px`);
      if ((/(hidden|clip)/.test(cs.overflowX) || /(hidden|clip)/.test(cs.overflow)) && el.scrollWidth > el.clientWidth + 1)
        res.clipped.push(`${desc(el)} sw=${el.scrollWidth} cw=${el.clientWidth} ellipsis=${cs.textOverflow}`);
      if ((/(hidden|clip)/.test(cs.overflowY)) && el.scrollHeight > el.clientHeight + 2)
        res.clipped.push(`${desc(el)} sh=${el.scrollHeight} ch=${el.clientHeight} (vertical)`);
    }
  }
  // overlapping text: text node rects of leaf-ish text elements
  const textEls = all.filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !(el.closest("dialog") && !el.closest("dialog").open));
  const rects = [];
  for (const el of textEls) {
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const rr of range.getClientRects()) if (rr.width > 1 && rr.height > 1) rects.push({ el, r: rr, t: n.textContent.trim().slice(0, 30) });
    }
  }
  // in the dialog case, ignore the background (inert) when dialog open
  const openDialog = document.querySelector("dialog[open]");
  const pool = openDialog ? rects.filter((x) => openDialog.contains(x.el)) : rects;
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i].r, b = pool[j].r;
      if (pool[i].el === pool[j].el) continue;
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 2 && iy > 3) res.overlaps.push(`"${pool[i].t}" x "${pool[j].t}" (${Math.round(ix)}x${Math.round(iy)})`);
    }
  res.overlaps = res.overlaps.slice(0, 20);
  return res;
};

const log = [];
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
  for (const [name, url] of routes) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 160)));
    const res = await page.goto(BASE + url, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const r = await page.evaluate(checks);
    await page.screenshot({ path: path.join(out, `${name}-${w}.png`), fullPage: true });
    const fonts = await page.evaluate(() => getComputedStyle(document.body).fontFamily.slice(0, 60));
    log.push(`${name} ${w}x${h} status=${res.status()} title="${r.title}" docW=${r.docW}/${r.vw} docH=${r.docH} font=${fonts}`);
    for (const k of ["outside", "clipped", "tiny", "overlaps"]) if (r[k].length) log.push(`  ${k}: ${r[k].slice(0, 12).join(" | ")}`);
    if (errors.length) log.push(`  errors: ${errors.slice(0, 5).join(" | ")}`);
    // the delete modal on /
    if (name === "home" && (await page.$("button.card"))) {
      await page.click("button.card");
      await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
      await page.waitForTimeout(300);
      const m = await page.evaluate(checks);
      const box = await page.evaluate(() => {
        const r = document.querySelector("dialog.confirm").getBoundingClientRect();
        return `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)} vh=${innerHeight}`;
      });
      await page.screenshot({ path: path.join(out, `modal-${w}.png`) });
      log.push(`modal ${w}x${h} dialog=${box}`);
      for (const k of ["outside", "clipped", "tiny", "overlaps"]) if (m[k].length) log.push(`  ${k}: ${m[k].slice(0, 12).join(" | ")}`);
      await page.keyboard.press("Escape");
    }
    await page.close();
  }
  await ctx.close();
}
writeFileSync(path.join(out, "shots.txt"), log.join("\n") + "\n");
console.log(log.join("\n"));
await browser.close();

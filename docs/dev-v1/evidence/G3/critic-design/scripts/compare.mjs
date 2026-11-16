// Side-by-side crops: the draft (1448x1086) and the app at a 1448x1086 viewport, region by region at 1:1.
// Usage: node compare.mjs <outDir>
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const out = path.resolve(process.argv[2] ?? "/tmp/critic-design/cmp");
mkdirSync(out, { recursive: true });
const REPO = "/Users/jeongyounglee/work/repo/maple-boss";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 1448, height: 1086 }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, "app-main-1448.png") });
await page.click("button.card");
await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, "app-modal-1448.png") });
await page.keyboard.press("Escape");

const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
// regions [name, x, y, w, h] in draft coordinates
const regions = [
  ["header", 0, 0, 1448, 90],
  ["cards", 40, 100, 720, 230],
  ["boss", 40, 520, 430, 520],
  ["party", 470, 520, 940, 300],
  ["footer", 300, 1020, 900, 66],
];
async function sbs(name, a, b, x, y, w, h) {
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#000;color:#ddd;font:13px sans-serif}
  .c{width:${w}px;height:${h}px;overflow:hidden;position:relative;border:1px solid #f0f}
  .c img{position:absolute;left:${-x}px;top:${-y}px}
  .wrap{display:flex;flex-direction:column;gap:6px;padding:6px}</style>
  <div class="wrap"><div>draft</div><div class="c"><img src="${b64(a)}"></div><div>app (1448x1086 viewport)</div><div class="c"><img src="${b64(b)}"></div></div>`;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: w + 14, height: h * 2 + 60 });
  await p.setContent(html, { waitUntil: "load" });
  await p.screenshot({ path: path.join(out, `sbs-${name}.png`), fullPage: true });
  await p.close();
}
const draftMain = `${REPO}/docs/drafts/maple-boss-main-dark-v2.png`;
const draftModal = `${REPO}/docs/drafts/maple-boss-delete-modal-dark-v2.png`;
for (const [n, x, y, w, h] of regions) await sbs(n, draftMain, path.join(out, "app-main-1448.png"), x, y, w, h);
await sbs("modal", draftModal, path.join(out, "app-modal-1448.png"), 390, 300, 670, 500);
// full side-by-side, half scale
const html = `<!doctype html><style>body{margin:0;background:#000;display:flex;gap:8px}img{width:724px}</style>
<img src="${b64(draftMain)}"><img src="${b64(path.join(out, "app-main-1448.png"))}">`;
const p = await ctx.newPage();
await p.setViewportSize({ width: 1456, height: 543 });
await p.setContent(html, { waitUntil: "load" });
await p.screenshot({ path: path.join(out, "sbs-main-full.png") });
await p.setContent(html.replace(draftMain, draftModal).replace(b64(draftMain), b64(draftModal)).replace(b64(path.join(out, "app-main-1448.png")), b64(path.join(out, "app-modal-1448.png"))), { waitUntil: "load" });
await p.screenshot({ path: path.join(out, "sbs-modal-full.png") });
await browser.close();
console.log("ok");

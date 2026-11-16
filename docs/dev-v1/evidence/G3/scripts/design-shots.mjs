// G3 design fidelity: the main screen and the delete modal next to the operator's drafts.
// Usage: node design-shots.mjs <outDir>   (dev server on BASE_URL, default http://localhost:3000; system Chrome)
// Writes main-1440.png (full page), main-375.png (full page), modal-1440.png, modal-375.png (viewport, the dialog
// open on the first card), and compare-main.png / compare-modal.png: the draft on the left, the app on the right,
// both scaled to the same width in one HTML page rendered by the same Chrome. Exits 1 on a non-200 or a page error.
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const REPO = "/Users/jeongyounglee/work/repo/maple-boss";
const out = path.resolve(process.argv[2] ?? ".");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
let fails = 0;

async function shoot(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const res = await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }); // the dev-tools badge, only under next dev
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const main = path.join(out, `main-${width}.png`);
  await page.screenshot({ path: main, fullPage: true });
  const sizes = await page.evaluate(() => ({ docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth }));
  await page.click("button.card");
  await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
  await page.waitForTimeout(200);
  const modal = path.join(out, `modal-${width}.png`);
  await page.screenshot({ path: modal });
  const box = await page.evaluate(() => {
    const r = document.querySelector("dialog.confirm").getBoundingClientRect();
    return `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`;
  });
  await page.keyboard.press("Escape");
  const ok = res?.status() === 200 && errors.length === 0;
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${width}: / ${res?.status()} page ${sizes.docW}x${sizes.docH}, dialog ${box}${errors.length ? ` | ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  return { main, modal };
}

const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
async function compare(name, draft, app, title) {
  const W = 720; // each side; the drafts are 1448 wide, so about half size
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#0d0f10;color:#d8e0dd;font:14px/1.4 -apple-system,"Apple SD Gothic Neo",sans-serif}
    .row{display:flex;gap:16px;padding:16px;align-items:flex-start}
    figure{margin:0;width:${W}px} img{width:${W}px;display:block;border:1px solid #333}
    figcaption{padding:0 0 8px;font-weight:700} h1{font-size:15px;margin:16px 16px 0}
  </style><h1>${title}</h1><div class="row">
    <figure><figcaption>원본 시안 ${path.relative(REPO, draft)}</figcaption><img src="${b64(draft)}"></figure>
    <figure><figcaption>현재 앱 (실제 데이터, 1440)</figcaption><img src="${b64(app)}"></figure>
  </div>`;
  const ctx = await browser.newContext({ viewport: { width: W * 2 + 48, height: 600 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: "load" });
  const file = path.join(out, name);
  await page.screenshot({ path: file, fullPage: true });
  await ctx.close();
  console.log(`ok   ${name}`);
}

try {
  const wide = await shoot(1440, 1086);
  await shoot(375, 812);
  await compare("compare-main.png", `${REPO}/docs/drafts/maple-boss-main-dark-v2.png`, wide.main, "메인 화면: 원본 시안(왼쪽)과 현재 앱(오른쪽)");
  await compare("compare-modal.png", `${REPO}/docs/drafts/maple-boss-delete-modal-dark-v2.png`, wide.modal, "삭제 모달: 원본 시안(왼쪽)과 현재 앱(오른쪽)");
} finally {
  await browser.close();
}
process.exit(fails ? 1 : 0);

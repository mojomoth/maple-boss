// crop.mjs <img> <x> <y> <w> <h> <out> [scale]
import { readFileSync } from "node:fs";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const pairs = JSON.parse(process.argv[2]); // [[img,x,y,w,h,label],...]
const outFile = process.argv[3];
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await browser.newPage();
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#000;color:#ddd;font:13px sans-serif;padding:6px;width:max-content}
.c{overflow:hidden;position:relative;border:1px solid #f0f;margin-bottom:6px}.c img{position:absolute}</style>` +
  pairs.map(([f, x, y, w, h, l]) => `<div>${l}</div><div class="c" style="width:${w}px;height:${h}px"><img style="left:${-x}px;top:${-y}px" src="${b64(f)}"></div>`).join("");
await p.setContent(html, { waitUntil: "load" });
await p.screenshot({ path: outFile, fullPage: true });
await browser.close();

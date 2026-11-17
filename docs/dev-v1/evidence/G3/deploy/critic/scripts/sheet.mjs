// contact sheet: node sheet.mjs out.png colWidth maxH file1 file2 ...
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const [out, colW, maxH, ...files] = process.argv.slice(2);
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#111;color:#ddd;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:8px;padding:8px}
figure{margin:0;width:${colW}px} .c{max-height:${maxH}px;overflow:hidden;border:1px solid #444} img{width:${colW}px;display:block} figcaption{padding:2px 0}</style>
${files.map((f) => `<figure><figcaption>${path.basename(f)}</figcaption><div class="c"><img src="${b64(f)}"></div></figure>`).join("")}`;
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: (Number(colW) + 8) * Math.min(files.length, 4) + 16, height: 400 } });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: out, fullPage: true });
await browser.close();

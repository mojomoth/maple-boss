import { readFileSync } from "node:fs";
import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const [out, draft, app, title] = process.argv.slice(2);
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const W = 720;
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#0d0f10;color:#d8e0dd;font:14px/1.4 -apple-system,"Apple SD Gothic Neo",sans-serif}
.row{display:flex;gap:16px;padding:16px;align-items:flex-start} figure{margin:0;width:${W}px} img{width:${W}px;display:block;border:1px solid #333}
figcaption{padding:0 0 8px;font-weight:700} h1{font-size:15px;margin:16px 16px 0}</style><h1>${title}</h1><div class="row">
<figure><figcaption>원본 시안 ${draft.split("/").slice(-1)[0]}</figcaption><img src="${b64(draft)}"></figure>
<figure><figcaption>배포본 https://maple-boss-livid.vercel.app (1440x900, 실제 데이터)</figcaption><img src="${b64(app)}"></figure></div>`;
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: W * 2 + 48, height: 600 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: out, fullPage: true });
await browser.close();

// Pixel diff of two PNGs in headless Chrome: node imgdiff.mjs a.png b.png out-diff.png
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const [a, b, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage();
const res = await page.evaluate(
  async ([A, B]) => {
    const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const px = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib);
    const c = new OffscreenCanvas(w, h); const x = c.getContext("2d"); const o = x.createImageData(w, h);
    let diff = 0; let minY = h, maxY = -1, minX = w, maxX = -1;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      const p = i / 4, X = p % w, Y = (p / w) | 0;
      if (d > 24) { diff++; o.data[i] = 255; o.data[i + 3] = 255; minY = Math.min(minY, Y); maxY = Math.max(maxY, Y); minX = Math.min(minX, X); maxX = Math.max(maxX, X); }
      else { o.data[i] = o.data[i + 1] = o.data[i + 2] = (da[i] * 0.3) | 0; o.data[i + 3] = 255; }
    }
    x.putImageData(o, 0, 0);
    const blob = await c.convertToBlob({ type: "image/png" });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ""; for (const v of buf) s += String.fromCharCode(v);
    return { a: [ia.width, ia.height], b: [ib.width, ib.height], diff, total: w * h, box: diff ? { minX, minY, maxX, maxY } : null, png: btoa(s) };
  },
  [a, b].map((f) => "data:image/png;base64," + readFileSync(f).toString("base64")),
);
if (out) writeFileSync(out, Buffer.from(res.png, "base64"));
console.log(`${a} ${res.a.join("x")} vs ${b} ${res.b.join("x")}: ${res.diff} px differ (${((100 * res.diff) / res.total).toFixed(3)}%) box=${JSON.stringify(res.box)}`);
await browser.close();

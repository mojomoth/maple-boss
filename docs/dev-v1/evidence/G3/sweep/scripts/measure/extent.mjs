// extent.mjs <png> <y0> <y1> <x0> <x1> [threshold]: horizontal/vertical extent of bright (text) pixels in a band
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const [file, y0, y1, x0, x1, th = "120"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage();
const data = readFileSync(file).toString("base64");
const r = await p.evaluate(async ({ data, y0, y1, x0, x1, th }) => {
  const img = new Image(); img.src = "data:image/png;base64," + data; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * img.width + x) * 4; const l = (d[i] + d[i + 1] + d[i + 2]) / 3; if (l > th) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); } }
  return { minx, maxx, w: maxx - minx + 1, miny, maxy, h: maxy - miny + 1, size: [img.width, img.height] };
}, { data, y0: +y0, y1: +y1, x0: +x0, x1: +x1, th: +th });
console.log(JSON.stringify(r));
await b.close();

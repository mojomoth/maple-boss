// runs.mjs <png> <x0,y0,x1,y1> [th]: x-runs of columns containing text pixels (gaps >= 5px split runs)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const [file, box, th = "110"] = process.argv.slice(2);
const [x0, y0, x1, y1] = box.split(",").map(Number);
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage();
const data = readFileSync(file).toString("base64");
const r = await p.evaluate(async ({ data, x0, y0, x1, y1, th }) => {
  const img = new Image(); img.src = "data:image/png;base64," + data; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data; const W = x1 - x0, H = y1 - y0;
  const col = []; for (let x = 0; x < W; x++) { let on = false; for (let y = 0; y < H; y++) { const i = (y * W + x) * 4; if ((d[i] + d[i + 1] + d[i + 2]) / 3 > th) { on = true; break; } } col.push(on); }
  const runs = []; let s = -1, gap = 0;
  for (let x = 0; x <= W; x++) { if (x < W && col[x]) { if (s < 0) s = x; gap = 0; } else if (s >= 0) { gap++; if (gap >= 5 || x === W) { runs.push([s + x0, x - gap + x0]); s = -1; gap = 0; } } }
  return runs;
}, { data, x0, y0, x1, y1, th: +th });
console.log(JSON.stringify(r));
await b.close();

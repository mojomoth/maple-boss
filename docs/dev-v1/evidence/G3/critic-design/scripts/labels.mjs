import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
const r = await page.evaluate(async () => {
  const i = document.querySelector("#boss-q");
  const labels = [...document.querySelectorAll("#boss-list option")].map((o) => o.value);
  const out = [];
  for (const l of labels) { i.value = l; out.push([l, i.scrollWidth > i.clientWidth]); }
  return { total: labels.length, clipped: out.filter((x) => x[1]).map((x) => x[0]) };
});
console.log(r.total, "labels;", r.clipped.length, "clipped at 1440:", r.clipped.join(", "));
await browser.close();

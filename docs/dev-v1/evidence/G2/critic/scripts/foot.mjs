import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  const foot = p.locator("footer.foot");
  await foot.scrollIntoViewIfNeeded();
  await foot.screenshot({ path: `/tmp/g2critic/shots/home-footer-${w}.png` });
  const links = await foot.locator("a").evaluateAll((as) => as.map((a) => { const r = a.getBoundingClientRect(); return `${a.textContent}@${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; }));
  console.log(w, links.join(" | "));
  for (const path of ["/pocs/character", "/pocs/boss", "/pocs/party"]) {
    await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
    const top = p.locator("header.topbar").first();
    await top.screenshot({ path: `/tmp/g2critic/shots/topbar${path.replaceAll("/", "_")}-${w}.png` });
    const tl = await top.locator("a").evaluateAll((as) => as.map((a) => { const r = a.getBoundingClientRect(); return `${a.textContent}@${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; }));
    const headers = await p.locator("header").count();
    console.log(w, path, `headers=${headers}`, tl.join(" | "));
  }
  await p.close();
}
await browser.close();

import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await browser.newPage({ viewport: { width: 375, height: 812 }, locale: "ko-KR", colorScheme: "dark" });
await p.goto("http://localhost:3000/flow", { waitUntil: "networkidle" });
// tab until G1-pass
for (let i = 0; i < 30; i++) {
  await p.keyboard.press("Tab");
  if ((await p.evaluate(() => document.activeElement?.dataset?.step)) === "G1-pass") break;
}
const r = await p.evaluate(() => {
  const el = document.activeElement; const b = el.getBoundingClientRect(); const c = document.querySelector(".flow-canvas").getBoundingClientRect();
  return { step: el.dataset.step, nodeLeft: Math.round(b.left), nodeRight: Math.round(b.right), canvasLeft: Math.round(c.left), canvasRight: Math.round(c.right), scrollLeft: document.querySelector(".flow-canvas").scrollLeft, outline: getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineColor };
});
console.log(JSON.stringify(r));
await p.screenshot({ path: "/tmp/g2critic/shots/flow-375-focus-G1-pass.png" });
await p.keyboard.press("Enter");
await p.waitForTimeout(300);
await p.screenshot({ path: "/tmp/g2critic/shots/flow-375-panel-keyboard.png" });
await browser.close();

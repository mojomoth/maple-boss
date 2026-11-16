import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
for (const [w, h] of [[320, 568], [375, 667], [812, 375], [1440, 600]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.click("button.card");
  await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const d = document.querySelector("dialog.confirm"); const b = d.getBoundingClientRect();
    const del = d.querySelector(".btn--danger").getBoundingClientRect();
    return { box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], scrollH: d.scrollHeight, clientH: d.clientHeight, overflowY: getComputedStyle(d).overflowY, delBottom: Math.round(del.bottom), vh: innerHeight };
  });
  // can the delete button be reached by scrolling within the dialog?
  await page.locator("dialog.confirm .btn--danger").scrollIntoViewIfNeeded();
  const vis = await page.evaluate(() => { const r = document.querySelector("dialog.confirm .btn--danger").getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
  console.log(w, h, JSON.stringify(r), "delete visible after scroll:", vis);
  await page.screenshot({ path: `/tmp/critic-design/cmp/modal-${w}x${h}.png` });
  await page.close();
}
await browser.close();

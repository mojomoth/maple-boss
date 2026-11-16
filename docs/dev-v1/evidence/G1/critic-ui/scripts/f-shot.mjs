import { BASE, OUT, launch, payload, importApi, del } from "./lib.mjs";
const n = "가나다라마바"; await importApi(payload(n, [["카링", "Extreme", 0.5]]));
const browser = await launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "ko-KR" })).newPage();
  await page.goto(BASE + "/"); const card = page.locator("button.card", { hasText: n }); await card.scrollIntoViewIfNeeded(); await card.click();
  await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/delete-modal-375-6char.png` });
  // card at 375 for the same name
  await page.keyboard.press("Escape"); await card.screenshot({ path: `${OUT}/card-375-6char.png` });
  console.log(await card.evaluate((c) => ({ w: c.getBoundingClientRect().width, sw: c.scrollWidth, cw: c.clientWidth })));
} finally { console.log(await del(n)); await browser.close(); }

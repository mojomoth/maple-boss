import { BASE, launch } from "./lib.mjs";
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
const p = await ctx.newPage();
const navs = []; p.on("request", (r) => r.url().includes("localhost:3000/?") && navs.push(decodeURIComponent(r.url().replace(BASE, "")).replace(/&_rsc=\w+/, "")));
for (let i = 0; i < 5; i++) {
  await p.goto(BASE + "/"); navs.length = 0;
  await p.locator("#boss-q").fill("노말 카링"); await p.keyboard.press("Enter");
  await p.waitForTimeout(2500);
  console.log(i, p.url().replace(BASE, ""), await p.locator(".boss-name .badge").innerText(), "field=" + (await p.inputValue("#boss-q")), JSON.stringify(navs));
}
// realistic: user types with IME-like composition via insertText per syllable then Enter after 100ms
for (let i = 0; i < 3; i++) {
  await p.goto(BASE + "/"); navs.length = 0;
  await p.locator("#boss-q").click(); await p.keyboard.press("Meta+A");
  await p.keyboard.insertText("노말 카링"); await p.waitForTimeout(100); await p.keyboard.press("Enter");
  await p.waitForTimeout(2500);
  console.log("ime", i, p.url().replace(BASE, ""), await p.locator(".boss-name .badge").innerText(), "field=" + (await p.inputValue("#boss-q")), JSON.stringify(navs));
}
await browser.close();

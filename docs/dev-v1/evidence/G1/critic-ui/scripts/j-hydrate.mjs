import { BASE, launch } from "./lib.mjs";
const browser = await launch();
for (let i = 0; i < 3; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.locator("#boss-q").waitFor({ state: "attached" });
  await p.locator("#boss-q").fill("카링 노말");
  const before = await p.inputValue("#boss-q");
  await p.waitForTimeout(3000);
  console.log(i, "typed before hydration:", before, "-> field after hydration:", await p.inputValue("#boss-q"));
  await ctx.close();
}
await browser.close();

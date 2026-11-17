import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const BASE = "https://maple-boss-livid.vercel.app";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const f = () => page.evaluate(() => { const a = document.activeElement; return `${a?.closest("dialog[open]") ? "in" : "OUT"}:${a?.tagName}${a?.getAttribute("aria-label") ? "[" + a.getAttribute("aria-label") + "]" : ""}:${(a?.tagName === "BUTTON" ? a.textContent : "").trim()}`; });
// keyboard only: Tab from top of page to the first card
await page.keyboard.press("Tab");
let steps = 0; while (!(await page.evaluate(() => document.activeElement?.classList.contains("card"))) && steps++ < 20) await page.keyboard.press("Tab");
console.log("reached card via Tab in", steps + 1, "presses:", await page.evaluate(() => document.activeElement.querySelector(".card-name").textContent));
await page.keyboard.press("Enter");
await page.waitForSelector("dialog[open]");
const ring = [await f()];
for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); ring.push(await f()); }
console.log("Tab ring:", ring.join(" > "));
const back = [];
for (let i = 0; i < 5; i++) { await page.keyboard.press("Shift+Tab"); back.push(await f()); }
console.log("Shift+Tab ring:", back.join(" > "));
console.log("aria:", await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return { labelledby: d.getAttribute("aria-labelledby"), title: document.getElementById(d.getAttribute("aria-labelledby"))?.textContent, modal: d.matches(":modal") }; }));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
console.log("after Esc:", await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), focus: document.activeElement?.className + " " + (document.activeElement?.querySelector?.(".card-name")?.textContent ?? "") })));
// close with X button via keyboard
await page.keyboard.press("Enter"); await page.waitForSelector("dialog[open]");
await page.keyboard.press("Shift+Tab"); console.log("Shift+Tab from 취소 ->", await f());
await page.keyboard.press("Enter"); await page.waitForTimeout(200);
console.log("after X:", await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), focus: document.activeElement?.className + " " + (document.activeElement?.querySelector?.(".card-name")?.textContent ?? "") })));
console.log("seed still on page:", await page.evaluate(() => [...document.querySelectorAll(".card-name")].map((e) => e.textContent).join(",")));
await browser.close();

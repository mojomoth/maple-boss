import { BASE, launch } from "./lib.mjs";
const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(BASE + "/");
const card = p.locator("button.card", { has: p.locator(".card-name", { hasText: /^\.\.$/ }) });
if (!(await card.count())) { console.log("no '..' card present; skipped"); process.exit(0); }
let url = null;
await p.route("**/*", (r) => r.request().method() === "DELETE" ? (url = r.request().url(), r.abort()) : r.continue());
await card.click(); await p.locator("dialog.confirm").getByRole("button", { name: "삭제" }).click(); await p.waitForTimeout(800);
console.log("browser sends DELETE to:", url, "(aborted here so the other critic's '..' is not touched)");
await browser.close();

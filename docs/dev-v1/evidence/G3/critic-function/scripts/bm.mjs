import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const tag = Date.now().toString(36).slice(-4);
const NAME = `북마클릿${tag}`;
const sr = JSON.parse(readFileSync("/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples/고딩.json", "utf8"));
sr.userApiData.info.character_name = NAME;
const store = JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
const srv = createServer((q, s) => { s.setHeader("content-type", "text/html; charset=utf-8"); s.end("<!doctype html><title>mock scouter</title><p>mock</p>"); }).listen(0, "127.0.0.1");
await new Promise((r) => srv.once("listening", r));
const mock = `http://127.0.0.1:${srv.address().port}/ko/result`;
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" })).newPage();
// take the href from the real guide
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.fill("#character-name", NAME);
await page.press("#character-name", "Enter");
await page.waitForSelector("a.bookmarklet[href^='javascript:']", { timeout: 5000 });
const href = await page.getAttribute("a.bookmarklet", "href");
const code = decodeURIComponent(href.slice("javascript:".length));
console.log("bookmarklet chars", href.length, "targets origin", code.includes(JSON.stringify(BASE)));
// 1. no store -> Korean alert
await page.goto(mock);
let alertText = "";
page.once("dialog", (d) => { alertText = d.message(); d.dismiss(); });
await page.evaluate(code);
await page.waitForTimeout(500);
console.log("no store -> alert:", alertText);
// 2. with store -> /import -> /
await page.evaluate((s) => localStorage.setItem("character-store", s), store);
const nav = [];
page.on("framenavigated", (f) => f === page.mainFrame() && nav.push(new URL(f.url()).pathname + (new URL(f.url()).hash ? "#…" : "")));
await page.evaluate(code);
await page.waitForURL((u) => u.pathname === "/" && u.origin === new URL(BASE).origin, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1000);
const card = await page.locator(".card-name", { hasText: NAME }).count();
console.log("navigations", nav.join(" -> "), "| card on /:", card, "| url:", page.url());
// back button: does it re-import / show an error?
await page.goBack(); await page.waitForTimeout(1500);
console.log("after Back:", page.url(), "|", (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 100));
await browser.close(); srv.close();
const d = await fetch(BASE + "/api/character/" + encodeURIComponent(NAME), { method: "DELETE" });
console.log("cleanup", d.status);

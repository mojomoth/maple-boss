// Recheck 1 (copy of critic/scripts/d1.mjs; viewport arg; 노칼 check expects 감시자 칼로스). D-1 scenario A on production.
//   node d1.mjs <shots dir> [width]
import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const BASE = "https://maple-boss-livid.vercel.app";
const OUT = process.argv[2];
const W = Number(process.argv[3] ?? 1440);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d ? "  " + d : ""}`); if (!ok) fails++; };
const ctx = await browser.newContext({ viewport: { width: W, height: W < 600 ? 812 : 900 }, locale: "ko-KR" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const state = async () => page.evaluate(() => ({
  url: location.pathname + location.search,
  field: document.querySelector("#boss-q")?.value,
  h3: document.querySelector(".boss-name h3")?.textContent,
  diff: document.querySelector(".boss-name .badge")?.textContent,
  parties: [...document.querySelectorAll("ol.parties > li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()),
  empty: document.querySelector("section[aria-labelledby=party-title] .empty")?.innerText.replace(/\s+/g, " ").trim() ?? "",
  msg: document.querySelector("#boss-msg")?.textContent,
  cards: [...document.querySelectorAll(".card-name")].map((e) => e.textContent),
  notice: [...document.querySelectorAll("p")].map((p) => p.textContent).find((t) => t.includes("임시 저장소")) ?? null,
}));
const settle = async () => { await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(600); };

let t = Date.now();
await page.goto(BASE + "/"); await settle();
let s = await state();
console.log(`# / loaded in ${Date.now() - t} ms`, JSON.stringify(s, null, 0));
check("default boss is 익스트림 카링", s.diff === "익스트림" && s.h3 === "카링" && s.field === "익스트림 카링");
check("seeded characters shown", ["강은호", "아델", "고딩"].every((n) => s.cards.includes(n)), s.cards.join(","));
check("3 recommended parties with sums", s.parties.length === 3 && s.parties.every((p) => /합계 \d+(\.\d+)?%/.test(p)), s.parties.join(" | "));
check("parties are >= 110% (verdict)", s.parties.every((p) => Number(p.match(/합계 ([\d.,]+)%/)[1].replace(/,/g, "")) >= 110));
const help = await page.locator("section[aria-labelledby=party-title] .section-help").innerText();
check("verdict copy present", /공략 가능/.test(help), help);
check("temporary storage notice shown", !!s.notice, s.notice);
if (OUT) await page.screenshot({ path: `${OUT}/d1-home-${W}.png`, fullPage: true });

async function search(q) {
  await page.fill("#boss-q", q);
  const t0 = Date.now();
  await page.press("#boss-q", "Enter");
  // done when the URL has no q= (matched and rewritten) or the missing message names q
  await page.waitForFunction((q) => (!location.search.includes("q=") && document.querySelector("#boss-q").value !== q) || (document.querySelector("#boss-msg")?.textContent ?? "").includes(q), q, { timeout: 30000 }).catch(() => console.log("# timeout waiting for", q));
  await page.waitForTimeout(300);
  console.log(`# search '${q}' settled in ${Date.now() - t0} ms`);
  return state();
}
const hist = [];
s = await search("검은 마법사"); hist.push(s); console.log("# name 검은 마법사", JSON.stringify(s));
check("name search '검은 마법사' -> 검은 마법사 boss", s.h3 === "검은 마법사" && /boss=/.test(s.url) && !/q=/.test(s.url), `${s.diff} ${s.h3} ${s.url}`);
check("field shows the boss label", s.field === `${s.diff} ${s.h3}`, s.field);
s = await search("검마"); hist.push(s); console.log("# alias 검마", JSON.stringify(s));
check("alias '검마' -> 검은 마법사", s.h3 === "검은 마법사", `${s.diff} ${s.h3} ${s.url}`);
s = await search("하스우"); hist.push(s); console.log("# shorthand 하스우", JSON.stringify(s));
check("shorthand '하스우' -> 하드 스우", s.h3 === "스우" && s.diff === "하드", `${s.diff} ${s.h3} ${s.url}`);
check("results update for 하드 스우 (parties or empty state)", s.parties.length > 0 || s.empty.length > 0, (s.parties.join(" | ") || s.empty).slice(0, 200));
s = await search("카링"); hist.push(s); console.log("# 카링", JSON.stringify(s));
s = await search("없는보스zz"); console.log("# missing", JSON.stringify(s));
check("unknown boss -> message, field keeps typed text, boss unchanged", /없는보스zz/.test(s.msg ?? "") && s.field === "없는보스zz", `${s.msg} field=${s.field} ${s.h3}`);
if (OUT) await page.screenshot({ path: `${OUT}/d1-missing-${W}.png` });
// datalist pick: typing an exact label submits at once
await page.fill("#boss-q", "");
await page.locator("#boss-q").pressSequentially("하드 데미안", { delay: 20 });
await settle();
s = await state();
console.log("# datalist exact label typed", JSON.stringify({ url: s.url, h3: s.h3, diff: s.diff, field: s.field }));
check("exact label submits (datalist pick path)", s.h3 === "데미안" && s.diff === "하드", `${s.diff} ${s.h3} ${s.url}`);

// Back / Forward consistency
const seq = [];
for (let i = 0; i < 6; i++) {
  await page.goBack(); await settle();
  const b = await state();
  seq.push(b);
  console.log(`# back ${i + 1}`, JSON.stringify({ url: b.url, field: b.field, diff: b.diff, h3: b.h3, msg: b.msg }));
}
for (let i = 0; i < 6; i++) {
  await page.goForward(); await settle();
  const b = await state();
  seq.push(b);
  console.log(`# fwd ${i + 1}`, JSON.stringify({ url: b.url, field: b.field, diff: b.diff, h3: b.h3, msg: b.msg }));
}
for (const b of seq) {
  const consistent = b.msg ? true : b.field === `${b.diff} ${b.h3}`;
  const urlOk = b.msg ? /q=/.test(b.url) : (/boss=/.test(b.url) || b.url === "/") && !/q=/.test(b.url);
  check(`back/forward ${b.url}: field '${b.field}' matches page '${b.diff} ${b.h3}'`, consistent && urlOk);
}
// focus stays in field after search
await page.goto(BASE + "/"); await settle();
s = await search("노칼");
const focused = await page.evaluate(() => document.activeElement?.id);
check("노칼 -> 노말 칼로스, focus stays in field", /칼로스$/.test(s.h3 ?? "") && s.diff === "노말" && focused === "boss-q", `${s.diff} ${s.h3} focus=${focused}`);
// direct URL with q
await page.goto(BASE + "/?q=" + encodeURIComponent("검마")); await settle();
s = await state();
check("shared /?q=검마 link -> boss shown, URL rewritten to ?boss=", s.h3 === "검은 마법사" && /boss=/.test(s.url) && !/q=/.test(s.url), s.url);
await page.goto(BASE + "/?boss=does-not-exist"); await settle();
s = await state();
check("/?boss=<unknown> falls back to default", s.h3 === "카링" && s.diff === "익스트림", `${s.diff} ${s.h3}`);
check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 500));
await browser.close();
console.log(fails ? `# ${fails} failed` : "# all passed");

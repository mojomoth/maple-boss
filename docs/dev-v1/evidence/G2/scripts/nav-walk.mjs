// G2 navigation in a real browser (system Chrome via playwright-core): clicks every header/footer link between
// /, /pocs/character, /pocs/boss, /pocs/party and /flow, runs the real bookmarklet code to reach /import (success
// lands on / by itself; the empty-payload error offers 메인 화면으로), and checks the link graph has no dead end.
// One line per hop. Usage: node nav-walk.mjs (dev server on BASE_URL, default http://localhost:3000)
import { readFileSync } from "node:fs";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
import { bookmarklet } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/app/import/bookmarklet.ts";
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const SAMPLE = "/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples/아델.json";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
let fails = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== "" ? `  | ${detail}` : ""}`); if (!ok) fails++; return ok; };
// What each screen shows first, so a hop proves it landed on the right page.
const HEADING = { "/": "내 캐릭터", "/flow": "개발 진행", "/pocs/character": "캐릭터 등록", "/pocs/boss": "보스 조회", "/pocs/party": "파티 구직·편성", "/import": "캐릭터 가져오기" };
const heading = (page) => page.evaluate(() => [...document.querySelectorAll("h1, h2")].map((h) => h.textContent.trim()).filter(Boolean));
// [from, where, link name, to]
const HOPS = [
  ["/", "footer", "개발 진행", "/flow"],
  ["/flow", "header", "메인 화면으로", "/"],
  ["/", "footer", "캐릭터 등록", "/pocs/character"],
  ["/pocs/character", "header", "보스 조회", "/pocs/boss"],
  ["/pocs/boss", "header", "파티 편성", "/pocs/party"],
  ["/pocs/party", "header", "개발 진행", "/flow"],
  ["/flow", "footer", "파티 편성", "/pocs/party"],
  ["/pocs/party", "header", "메인 화면으로", "/"],
  ["/", "footer", "보스 조회", "/pocs/boss"],
  ["/pocs/boss", "header", "메인 화면으로", "/"],
  ["/", "footer", "파티 편성", "/pocs/party"],
  ["/pocs/party", "header", "캐릭터 등록", "/pocs/character"],
  ["/pocs/character", "header", "개발 진행", "/flow"],
  ["/flow", "footer", "보스 조회", "/pocs/boss"],
  ["/pocs/boss", "header", "개발 진행", "/flow"],
  ["/flow", "footer", "캐릭터 등록", "/pocs/character"],
  ["/pocs/character", "header", "메인 화면으로", "/"],
  ["/", "footer", "개발 진행", "/flow"],
  ["/flow", "header", "Maple Boss 처음으로", "/"],
  ["/", "footer", "개발 진행", "/flow"],
  ["/flow", "footer", "메인 화면", "/"],
];

try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    console.log(`\n# ${w}x${h}`);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });

    let n = 0;
    for (const [from, where, name, to] of HOPS) {
      const at = new URL(page.url()).pathname;
      if (!check(`hop ${++n} start at ${from}`, at === from, at)) await page.goto(BASE + from, { waitUntil: "networkidle" });
      const link = page.locator(where).getByRole("link", { name, exact: true });
      await link.click();
      await page.waitForURL((u) => u.pathname === to, { timeout: 15000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
      const now = new URL(page.url()).pathname;
      const hs = await heading(page);
      check(`hop ${n}: ${from} --[${where} "${name}"]--> ${now}`, now === to && hs.includes(HEADING[to]), `expected ${to}, headings: ${hs.join(" / ")}`);
    }

    // /import, the bookmarklet's landing page. Run the real bookmarklet code with a maplescouter-shaped store, as
    // clicking it on a result page does; a good payload saves the character and returns to / by itself.
    const tmp = `아델nav${w}${Date.now().toString(36).slice(-4)}`;
    const sr = JSON.parse(readFileSync(SAMPLE, "utf8"));
    sr.userApiData.info.character_name = tmp;
    await page.evaluate((store) => localStorage.setItem("character-store", store), JSON.stringify({ state: { searchResult: sr } }));
    const code = decodeURIComponent(bookmarklet(BASE).slice("javascript:".length));
    const seen = [];
    page.on("framenavigated", (f) => f === page.mainFrame() && seen.push(new URL(f.url()).pathname));
    await page.evaluate(code);
    await page.waitForURL((u) => u.pathname === "/" && seen.includes("/import"), { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    const card = await page.locator(".card-name", { hasText: tmp }).count();
    check(`hop ${++n}: / --[bookmarklet]--> /import --[auto]--> ${new URL(page.url()).pathname}`, seen.includes("/import") && new URL(page.url()).pathname === "/" && card === 1, `navigations ${seen.join(" -> ")}, new card ${card}`);
    const del = await fetch(`${BASE}/api/character/${encodeURIComponent(tmp)}`, { method: "DELETE" });
    check(`cleanup: DELETE ${tmp}`, del.status === 204, del.status);
    await page.evaluate(() => localStorage.removeItem("character-store"));

    // A bookmarklet run that carried nothing lands on /import's error state, which links back to /.
    await page.goto(BASE + "/import", { waitUntil: "networkidle" });
    const msg = await page.locator(".empty-title").textContent();
    await page.locator("main").getByRole("link", { name: "메인 화면으로", exact: true }).click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
    check(`hop ${++n}: /import (no payload) --[main "메인 화면으로"]--> ${new URL(page.url()).pathname}`, new URL(page.url()).pathname === "/", msg);

    // The link graph: every screen is reachable from / and has a way back, with no dead end.
    const graph = {};
    for (const p of ["/", "/flow", "/pocs/character", "/pocs/boss", "/pocs/party"]) {
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      graph[p] = await page.evaluate(() => [...new Set([...document.querySelectorAll("a[href^='/']")].map((a) => new URL(a.href).pathname))].sort());
    }
    graph["/import"] = ["/"];
    const reach = (start) => { const seen = new Set([start]); const q = [start]; while (q.length) for (const t of graph[q.shift()] ?? []) if (!seen.has(t)) { seen.add(t); q.push(t); } return seen; };
    for (const [p, out] of Object.entries(graph)) console.log(`  links ${p.padEnd(16)} -> ${out.join(" ")}`);
    const fromHome = reach("/");
    check("every screen but /import is linked from / (/import is the bookmarklet's)", ["/flow", "/pocs/character", "/pocs/boss", "/pocs/party"].every((p) => fromHome.has(p)), [...fromHome].join(" "));
    check("every screen has a way back to /", Object.keys(graph).every((p) => reach(p).has("/")));
    check("no page errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails ? `\n${fails} failed` : "\nall ok");
process.exit(fails ? 1 : 0);

// G3 browser pass over each fixed UI item (system Chrome via playwright-core) against the dev server.
// Never makes the server crawl: POST /api/character is answered by a route mock wherever 추가 is pressed.
// Temp characters/parties are created through the API and deleted at the end. Usage: node ui-pass.mjs
import { readFileSync } from "node:fs";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = new URL("../shots/", import.meta.url).pathname;
const seed = JSON.parse(readFileSync(new URL("../../../../../../pocs/seed/아델.json", import.meta.url), "utf8"));
const OFFLINE = "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
const tag = Date.now().toString(36).slice(-4);
const made = new Set();
const parties = new Set();
let fails = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== "" ? `  | ${String(detail).slice(0, 240)}` : ""}`);
  if (!ok) fails++;
  return ok;
};
const api = async (method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: body ? { "content-type": "application/json" } : {}, body: body && JSON.stringify(body) });
  return [r.status, await r.json().catch(() => null)];
};
const payload = (name, cuts) => ({
  ...seed,
  info: { ...seed.info, character_name: name },
  calc: { ...seed.calc, bossCuts: cuts.map(([boss, difficulty, clearRate]) => ({ boss, difficulty, clearRate, analytics: "검증", bossStat: 100 })) },
});
async function importChar(name, cuts) {
  const [s] = await api("POST", "/api/character/import", payload(name, cuts));
  if (s === 201) made.add(name);
  return s;
}

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR", colorScheme: "dark" });
const errors = [];
const watch = (page) => {
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text()) && errors.push(`${page.url()}: ${m.text()}`));
  return page;
};

try {
  // P2-2: typing before hydration survives it (JS held back until both fields are filled).
  {
    const page = watch(await ctx.newPage());
    let release;
    const gate = new Promise((r) => (release = r));
    await page.route(/\/_next\/static\/.*\.js(\?|$)/, async (route) => {
      await gate;
      await route.continue();
    });
    await page.route("**/api/character", (r) => (r.request().method() === "POST" ? r.fulfill({ status: 501, contentType: "application/json", body: '{"error":"x","importUrl":"https://maplescouter.com/ko/result?name=x"}' }) : r.continue()));
    await page.goto(BASE + "/?boss=extreme-kaling", { waitUntil: "commit" });
    await page.locator("#boss-q").waitFor({ state: "visible" });
    const hydrated = () => page.evaluate(() => Object.keys(document.querySelector("#boss-q") ?? {}).some((k) => k.startsWith("__react")));
    const before = await hydrated();
    await page.locator("#boss-q").fill("카링 노말");
    await page.locator("#character-name").fill("아무개");
    release();
    await page.waitForFunction(() => Object.keys(document.querySelector("#boss-q") ?? {}).some((k) => k.startsWith("__react")), null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const boss = await page.inputValue("#boss-q");
    const nick = await page.inputValue("#character-name");
    check("P2-2 boss field typed before hydration is kept", !before && boss === "카링 노말", `hydrated before typing: ${before}, after: "${boss}"`);
    check("P2-2 nickname typed before hydration is kept", nick === "아무개", `"${nick}"`);
    await page.getByRole("button", { name: "추가", exact: true }).click();
    const guide = await page.locator("#guide-title").textContent({ timeout: 5000 }).catch(() => "(none)");
    check("P2-2 추가 uses the pre-hydration nickname (import guide opens for it)", /‘아무개’/.test(guide), guide);
    await page.locator("#boss-q").press("Enter");
    await page.waitForURL((u) => !u.searchParams.has("q") && u.searchParams.get("boss") === "normal-kaling", { timeout: 15000 }).catch(() => {});
    check("P2-2 the kept boss text still searches", new URL(page.url()).searchParams.get("boss") === "normal-kaling", page.url());

    // P2-4: after a paste import the focus goes to the nickname field, whose status line reports it.
    const T = `붙여${tag}`;
    await page.locator("summary", { hasText: "직접 붙여넣기" }).click();
    await page.locator("#paste-store").fill(JSON.stringify(payload(T, [["카링", "Extreme", 0.5]])));
    await page.getByRole("button", { name: "가져오기", exact: true }).click();
    await page.locator("#add-msg", { hasText: "가져왔어요" }).waitFor({ timeout: 15000 }).catch(() => {});
    made.add(T);
    const focus = await page.evaluate(() => `${document.activeElement?.tagName}#${document.activeElement?.id}`);
    const msg = await page.locator("#add-msg").textContent();
    check("P2-4 focus after paste import is the nickname field", focus === "INPUT#character-name", focus);
    check("P2-4 the field's status line says what happened", msg === `‘${T}’ 캐릭터를 가져왔어요.`, msg);
    check("P2-4 the nickname field is cleared", (await page.inputValue("#character-name")) === "");
    await page.locator(".topbar").screenshot({ path: OUT + "p2-4-paste-focus.png" });
    await page.close();
  }

  // P2-8 + API-8: searching the boss already shown clears ?q= and shows its label; shorthand finds the boss.
  {
    const page = watch(await ctx.newPage());
    await page.goto(BASE + "/?boss=extreme-kaling", { waitUntil: "networkidle" });
    for (const round of [1, 2]) {
      await page.locator("#boss-q").fill("카링 익스");
      await page.locator("#boss-q").press("Enter");
      await page.waitForURL((u) => !u.searchParams.has("q"), { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);
      const url = new URL(page.url());
      const value = await page.inputValue("#boss-q");
      const focus = await page.evaluate(() => document.activeElement?.id);
      check(`P2-8 round ${round}: boss already shown, "카링 익스" -> URL ${url.search}, field "${value}"`, url.search === "?boss=extreme-kaling" && value === "익스트림 카링" && focus === "boss-q", `focus ${focus}`);
    }
    for (const [q, boss, label] of [["하스우", "hard-lotus", "하드 스우"], ["익검마", "extreme-black-mage", "익스트림 검은 마법사"], ["하진힐", "hard-jin-hilla", "하드 진 힐라"]]) {
      await page.locator("#boss-q").fill(q);
      await page.locator("#boss-q").press("Enter");
      await page.waitForURL((u) => u.searchParams.get("boss") === boss && !u.searchParams.has("q"), { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(500);
      const shown = `${await page.locator(".boss-name .badge").textContent()} ${await page.locator(".boss-name h3").textContent()}`;
      check(`API-8 main search "${q}" -> ${shown}`, shown === label && (await page.inputValue("#boss-q")) === label, page.url());
    }
    await page.locator(".topbar").screenshot({ path: OUT + "p2-8-boss-search.png" });

    // P2-1: the delete modal says it in Korean when the server cannot be reached.
    await page.route("**/api/character/*", (r) => (r.request().method() === "DELETE" ? r.abort("failed") : r.continue()));
    await page.locator(".card").first().click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    const err = await page.locator(".confirm-error").textContent({ timeout: 5000 }).catch(() => "(none)");
    check("P2-1 delete modal, server unreachable -> Korean message", err === OFFLINE, err);
    await page.locator("dialog.confirm").screenshot({ path: OUT + "p2-1-delete-offline.png" });
    await page.keyboard.press("Escape");
    await page.close();
  }

  // P2-3 + P2-6 on /pocs/party: two members cut to 54.9% beside a sum of 109.9%, and a double click forms once.
  {
    const A = `반올림A${tag}`, B = `반올림B${tag}`;
    for (const n of [A, B]) {
      await importChar(n, [["카링", "Extreme", 0.5496]]);
      await api("POST", "/api/party/requests", { characterName: n, bossId: "extreme-kaling", partySize: 2 });
    }
    const page = watch(await ctx.newPage());
    await page.goto(BASE + "/pocs/party", { waitUntil: "networkidle" });
    const builder = page.locator("section", { has: page.locator("#builder-title") });
    await builder.locator("select[name=builderBossId]").selectOption("extreme-kaling");
    await builder.locator("select[name=builderSize]").selectOption("2");
    for (const n of [A, B]) await builder.getByLabel(`${n} 선택`).check();
    const rates = await Promise.all([A, B].map((n) => builder.locator("tr", { hasText: n }).locator("td.end").textContent()));
    const line = (await builder.locator(".sum-line").textContent()).replace(/\s+/g, " ");
    check("P2-6 member rates are cut like the sum (54.9% + 54.9% beside 109.9%)", rates.every((r) => r.startsWith("54.9%")), rates.join(" / "));
    check("P2-6 sum line: 109.9%, 공략 불가, 0.1% 부족", /합계 109\.9%/.test(line) && /공략 불가 \(0\.1% 부족\)/.test(line), line);
    await builder.screenshot({ path: OUT + "p2-3-6-builder.png" });

    const posts = [];
    page.on("response", (r) => r.url().endsWith("/api/party") && r.request().method() === "POST" && posts.push(r.status()));
    await builder.getByRole("button", { name: "파티 편성", exact: true }).dblclick();
    await page.waitForTimeout(2500);
    const msg = await builder.locator("p.msg").textContent().catch(() => "");
    const [, list] = await api("GET", "/api/party");
    for (const p of list.filter((p) => p.members.some((m) => m.name === A))) parties.add(p.id);
    check("P2-3 double click 파티 편성 -> one POST, one party, success message kept", posts.length === 1 && parties.size === 1 && /^#\d+ 파티를 편성했어요\. 합계 109\.9%로, 110%까지 0\.1% 모자라요\.$/.test(msg), `POSTs ${posts.join(",")}, parties ${parties.size}, "${msg}"`);
    const saved = page.locator(".saved > li", { hasText: A });
    const savedText = (await saved.textContent()).replace(/\s+/g, " ");
    check("P2-6 saved party: members 54.9% each, sum 109.9%, 공략 불가", /합계 109\.9%/.test(savedText) && (savedText.match(/54\.9%/g) ?? []).length === 2 && /공략 불가/.test(savedText), savedText);
    await saved.screenshot({ path: OUT + "p2-6-saved.png" });

    // Failed to fetch on this screen too
    await page.route("**/api/party/requests", (r) => (r.request().method() === "POST" ? r.abort("failed") : r.continue()));
    await page.getByRole("button", { name: "구직 등록", exact: true }).click();
    const reqMsg = await page.locator("section", { has: page.locator("#request-title") }).locator("p.msg").textContent({ timeout: 5000 }).catch(() => "(none)");
    check("P2-1 구직 등록, server unreachable -> Korean message", reqMsg === OFFLINE, reqMsg);

    // G2-P2-4: the screen-switch nav marks the current page
    for (const [path, label] of [["/pocs/party", "파티 편성"], ["/pocs/character", "캐릭터 등록"], ["/pocs/boss", "보스 조회"]]) {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      const cur = await page.locator('nav[aria-label="다른 화면"] a[aria-current="page"]').allTextContents();
      check(`G2-P2-4 ${path}: aria-current on "${label}" only`, cur.length === 1 && cur[0] === label, cur.join(","));
    }
    await page.locator("header").screenshot({ path: OUT + "g2p2-4-pocs-nav.png" });

    // API-8 on /pocs/boss
    await page.goto(BASE + "/pocs/boss?q=" + encodeURIComponent("검마"), { waitUntil: "networkidle" });
    const groups = await page.locator("section.panel h2").allTextContents();
    check("API-8 /pocs/boss?q=검마 -> 검은 마법사", groups.length === 1 && groups[0] === "검은 마법사", groups.join(","));
    await page.close();
  }

  // G2-P2-2: an unknown address gets the app's 404 page with a way back.
  {
    const page = watch(await ctx.newPage());
    const res = await page.goto(BASE + "/pocs", { waitUntil: "networkidle" });
    const h1 = await page.locator("h1#status-title").textContent().catch(() => "(none)");
    check("G2-P2-2 /pocs -> 404, Korean page", res.status() === 404 && h1 === "없는 페이지예요", `${res.status()} ${h1}`);
    await page.screenshot({ path: OUT + "g2p2-2-not-found.png", clip: { x: 0, y: 0, width: 1440, height: 520 } });
    await page.locator("main").getByRole("link", { name: "메인 화면으로", exact: true }).click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
    check("G2-P2-2 its link goes back to /", new URL(page.url()).pathname === "/", page.url());

    // Page titles name the screen
    const TITLES = { "/": "파티 추천", "/import": "캐릭터 가져오기", "/flow": "개발 진행", "/pocs/character": "캐릭터 등록", "/pocs/boss": "보스 조회", "/pocs/party": "파티 편성", "/pocs": "없는 페이지" };
    for (const [path, t] of Object.entries(TITLES)) {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      const title = await page.title();
      check(`title ${path} -> "${title}"`, title === `${t} · Maple Boss`);
    }
    await page.close();
  }
} catch (e) {
  check("ui pass", false, e.stack ?? e);
} finally {
  for (const id of parties) await api("DELETE", `/api/party/${id}`);
  for (const n of made) {
    const [s] = await api("DELETE", `/api/character/${encodeURIComponent(n)}`);
    if (s !== 204) console.log(`cleanup: ${n} -> ${s}`);
  }
  console.log(`cleanup: ${parties.size} parties, ${made.size} characters`);
  check("no page errors or console errors", errors.length === 0, errors.join(" | "));
  await browser.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");
process.exit(fails ? 1 : 0);

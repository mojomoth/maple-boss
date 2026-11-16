// Critic browser walk: boss search, delete modal (keyboard + error paths), party flow, add/paste (no-crawler server).
// Usage: BASE_URL=... CRAWLER=0|1 node browser.mjs <shots dir>
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const NO_CRAWLER = process.env.CRAWLER === "0";
const out = path.resolve(process.argv[2] ?? "/tmp/critic-fn/shots");
mkdirSync(out, { recursive: true });
const SEED = JSON.parse(readFileSync("/Users/jeongyounglee/work/repo/maple-boss/pocs/seed/아델.json", "utf8"));
const tag = Date.now().toString(36).slice(-4);
const T1 = `크리틱A${tag}`, T2 = `크리틱B${tag}`, T3 = `크리틱C${tag}`;
const created = new Set();
const partyIds = new Set();
let bad = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "ok  " : "BAD "} ${label}${detail ? `  | ${detail}` : ""}`); if (!ok) bad++; return ok; };
const note = (s) => console.log(`     ${s}`);

async function api(method, p, body) {
  const res = await fetch(BASE + p, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch {}
  return { status: res.status, json: j };
}
const named = (n) => ({ ...SEED, info: { ...SEED.info, character_name: n } });
async function importChar(n) { const r = await api("POST", "/api/character/import", named(n)); if (r.status === 201) created.add(n); return r.status; }

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR", colorScheme: "dark" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
const active = () => page.evaluate(() => {
  const a = document.activeElement;
  if (!a) return "none";
  const inDialog = !!a.closest("dialog[open]");
  return `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}${a.className ? "." + String(a.className).split(" ")[0] : ""}[${(a.getAttribute("aria-label") ?? a.textContent ?? "").trim().slice(0, 20)}]${inDialog ? " (in dialog)" : ""}`;
});
const bossShown = () => page.evaluate(() => ({
  boss: document.querySelector(".boss-name")?.textContent?.trim(),
  input: document.querySelector("#boss-q")?.value,
  msg: document.querySelector("#boss-msg")?.textContent?.trim(),
  parties: document.querySelectorAll("ol.parties > li").length,
  partyTop: document.querySelector("ol.parties > li .members")?.textContent?.trim().slice(0, 60) ?? document.querySelector("#party-title")?.closest("section")?.querySelector(".empty-title")?.textContent,
  url: location.pathname + location.search,
}));

try {
  // ---------- 1. boss search
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const first = await bossShown();
  note(`initial: ${JSON.stringify(first)}`);
  const cases = [
    ["카링", /카링/], ["검마", /검은 마법사/], ["하스우", /하드\s*스우/], ["노말 카링", /노말\s*카링/], ["카링 노말", /노말\s*카링/],
    ["익스트림 검마", /익스트림\s*검은 마법사/], ["가엔슬", /가디언 엔젤 슬라임/], ["extreme-black", /익스트림\s*검은 마법사/], ["  하드   윌  ", /하드\s*윌/],
  ];
  for (const [q, want] of cases) {
    await page.fill("#boss-q", q);
    await page.press("#boss-q", "Enter");
    await page.waitForFunction((w) => new RegExp(w).test(document.querySelector(".boss-name")?.textContent ?? ""), want.source, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const s = await bossShown();
    const focus = await active();
    check(`boss search '${q}'`, want.test(s.boss ?? "") && !s.msg && s.input && want.test(s.input), `${JSON.stringify(s)} focus=${focus}`);
  }
  // a search that misses
  await page.fill("#boss-q", "없는보스zz");
  await page.press("#boss-q", "Enter");
  await page.waitForFunction(() => (document.querySelector("#boss-msg")?.textContent ?? "").length > 0, null, { timeout: 8000 }).catch(() => {});
  const miss = await bossShown();
  check("boss search miss shows Korean message, keeps current boss", /없어요/.test(miss.msg ?? "") && /하드\s*윌/.test(miss.boss ?? ""), JSON.stringify(miss));
  await page.screenshot({ path: path.join(out, "boss-miss.png") });
  // datalist pick: typing a full label submits by itself
  await page.fill("#boss-q", "");
  await page.type("#boss-q", "하드 스우", { delay: 30 });
  await page.waitForFunction(() => /하드\s*스우/.test(document.querySelector(".boss-name")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  const dl = await bossShown();
  check("typing a full datalist label submits it", /하드\s*스우/.test(dl.boss ?? "") && !dl.msg, JSON.stringify(dl));
  // recommended parties really change with the boss
  await page.fill("#boss-q", "익스트림 카링"); await page.press("#boss-q", "Enter");
  await page.waitForFunction(() => /익스트림\s*카링/.test(document.querySelector(".boss-name")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  const ek = await bossShown();
  await page.fill("#boss-q", "이지 카링"); await page.press("#boss-q", "Enter");
  await page.waitForFunction(() => /이지\s*카링/.test(document.querySelector(".boss-name")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  const ezk = await bossShown();
  check("recommended parties differ between 익스트림 카링 and 이지 카링", JSON.stringify([ek.parties, ek.partyTop]) !== JSON.stringify([ezk.parties, ezk.partyTop]), `EK ${ek.parties} '${ek.partyTop}' / EZ ${ezk.parties} '${ezk.partyTop}'`);
  // back/forward keeps input and boss in step
  await page.goBack(); await page.waitForTimeout(800);
  const back = await bossShown();
  check("Back after two searches shows the previous boss and the field agrees", /익스트림\s*카링/.test(back.boss ?? "") && /익스트림\s*카링/.test(back.input ?? ""), JSON.stringify(back));

  // ---------- 2. delete modal
  check(`import temp ${T1} via API`, (await importChar(T1)) === 201);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const count0 = await page.locator(".cards > li").count();
  const card = page.locator(".card", { hasText: T1 });
  await card.focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector("dialog.confirm[open]", { timeout: 5000 }).catch(() => {});
  check("Enter on a card opens the dialog", await page.locator("dialog.confirm[open]").count() === 1);
  check("focus starts on 취소", /취소/.test(await active()), await active());
  await page.screenshot({ path: path.join(out, "modal-1440.png") });
  const seen = [];
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); seen.push(await active()); }
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Shift+Tab"); seen.push(await active()); }
  const escaped = seen.filter((s) => !s.includes("(in dialog)"));
  check("Tab / Shift+Tab never leave the dialog", escaped.length === 0, seen.join(" -> "));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("Esc closes the dialog", await page.locator("dialog.confirm[open]").count() === 0);
  const afterEsc = await active();
  check("focus returns to the card after Esc", afterEsc.includes(T1) || afterEsc.includes("button.card"), afterEsc);
  // close button and backdrop
  await card.click();
  await page.click("dialog.confirm .confirm-close");
  await page.waitForTimeout(150);
  check("X closes the dialog", await page.locator("dialog.confirm[open]").count() === 0, await active());
  await card.click();
  await page.mouse.click(10, 10);
  await page.waitForTimeout(150);
  check("backdrop click closes the dialog", await page.locator("dialog.confirm[open]").count() === 0);
  // offline
  await page.route("**/api/character/**", (r) => r.abort());
  await card.click();
  await page.click("dialog.confirm .btn--danger");
  await page.waitForSelector(".confirm-error", { timeout: 5000 }).catch(() => {});
  const offline = await page.locator(".confirm-error").textContent().catch(() => "");
  check("delete while offline: Korean error in the dialog", /서버에 연결하지 못했어요/.test(offline ?? ""), offline);
  check("focus stays in the dialog after the error", (await active()).includes("(in dialog)"), await active());
  await page.screenshot({ path: path.join(out, "modal-offline.png") });
  await page.unroute("**/api/character/**");
  await page.keyboard.press("Escape");
  // 500 with a non-JSON body
  await page.route("**/api/character/**", (r) => r.fulfill({ status: 500, body: "<html>oops</html>", contentType: "text/html" }));
  await card.click();
  await page.click("dialog.confirm .btn--danger");
  await page.waitForSelector(".confirm-error", { timeout: 5000 }).catch(() => {});
  const e500 = await page.locator(".confirm-error").textContent().catch(() => "");
  check("delete 500 (HTML body): Korean error", /[가-힣]/.test(e500 ?? "") && !/oops/.test(e500 ?? ""), e500);
  await page.unroute("**/api/character/**");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  // reopen: is the old error gone?
  await card.click();
  const stale = await page.locator(".confirm-error").count();
  check("reopening the dialog does not show the previous error", stale === 0);
  // real delete
  await page.click("dialog.confirm .btn--danger");
  await page.waitForFunction((n) => ![...document.querySelectorAll(".card-name")].some((e) => e.textContent === n), T1, { timeout: 8000 }).catch(() => {});
  const gone = !(await page.locator(".card", { hasText: T1 }).count());
  if (gone) created.delete(T1);
  check("삭제 removes the card", gone);
  check("dialog closed after delete", await page.locator("dialog.confirm[open]").count() === 0);
  check("focus on 내 캐릭터 heading after delete", /chars-title/.test(await active()), await active());
  check("card count went down by one", (await page.locator(".cards > li").count()) === count0 - 1, `${count0} -> ${await page.locator(".cards > li").count()}`);
  check("API agrees it is gone", (await api("GET", "/api/character")).json.every((c) => c.name !== T1));

  // ---------- 3. party: request -> formation -> saved list -> delete
  check(`import ${T2}, ${T3}`, (await importChar(T2)) === 201 && (await importChar(T3)) === 201);
  await page.goto(BASE + "/pocs/party", { waitUntil: "networkidle" });
  for (const n of [T2, T3]) {
    await page.selectOption("select[name=characterName]", n);
    await page.selectOption("select[name=bossId]", "extreme-kaling");
    await page.selectOption("select[name=partySize]", "2");
    await page.click("button:has-text('구직 등록')");
    await page.waitForFunction((n) => document.querySelector("form.form-row .msg")?.textContent?.includes(n), n, { timeout: 8000 }).catch(() => {});
    const msg = await page.locator("form.form-row .msg").first().textContent().catch(() => "");
    check(`구직 등록 ${n}`, msg?.includes(n) && /등록했어요/.test(msg), msg);
  }
  await page.waitForTimeout(500);
  await page.selectOption("select[name=builderBossId]", "extreme-kaling");
  await page.selectOption("select[name=builderSize]", "2");
  await page.waitForTimeout(200);
  for (const n of [T2, T3]) await page.check(`input[name=member][value="${n}"]`);
  const sumLine = await page.locator(".sum-line").textContent();
  note(`sum line: ${sumLine}`);
  // double click: one party, no error after success
  await page.dblclick("button:has-text('파티 편성')");
  await page.waitForFunction(() => /편성했어요|못했어요|아니에요|됐어요/.test([...document.querySelectorAll(".panel-body > .msg")].map((e) => e.textContent).join(" ")), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const fmsg = await page.locator(".panel-body > .msg").textContent().catch(() => "");
  check("파티 편성 (double click) shows only the success message", /편성했어요/.test(fmsg ?? ""), fmsg);
  const id = Number(/#(\d+)/.exec(fmsg ?? "")?.[1]);
  if (id) partyIds.add(id);
  const saved = page.locator("ul.saved > li", { hasText: T2 });
  check("saved list shows the new party with both members", (await saved.count()) === 1 && (await saved.first().textContent()).includes(T3), (await saved.first().textContent().catch(() => "")).slice(0, 120));
  const parties = (await api("GET", "/api/party")).json.filter((p) => p.members.some((m) => m.name === T2));
  check("exactly one party was saved (double click)", parties.length === 1, `ids ${parties.map((p) => p.id)}`);
  for (const p of parties) partyIds.add(p.id);
  await page.screenshot({ path: path.join(out, "party-saved-1440.png"), fullPage: true });
  const delBtn = await saved.first().locator("button, a").count();
  check("saved party has a delete control on /pocs/party", delBtn > 0, `controls in the saved item: ${delBtn}`);
  // request error path: character removed after the page loaded
  check(`delete ${T3} via API (page still lists it)`, (await api("DELETE", `/api/character/${encodeURIComponent(T3)}`)).status === 204);
  created.delete(T3);
  await page.selectOption("select[name=characterName]", T3);
  await page.click("button:has-text('구직 등록')");
  await page.waitForTimeout(800);
  const emsg = await page.locator("form.form-row .msg").first().textContent().catch(() => "");
  check("구직 등록 for a removed character: Korean error", /등록되지 않은 캐릭터예요/.test(emsg ?? ""), emsg);
  await page.route("**/api/party/requests", (r) => r.abort());
  await page.selectOption("select[name=characterName]", T2);
  await page.click("button:has-text('구직 등록')");
  await page.waitForTimeout(800);
  const omsg = await page.locator("form.form-row .msg").first().textContent().catch(() => "");
  check("구직 등록 offline: Korean error", /서버에 연결하지 못했어요/.test(omsg ?? ""), omsg);
  await page.unroute("**/api/party/requests");
  const isErrStyled = await page.locator("form.form-row .msg").first().evaluate((e) => getComputedStyle(e).color);
  note(`request message colour on error: ${isErrStyled}`);

  // ---------- 4. add character: guide + paste (no crawler server only)
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.fill("#character-name", "   ");
  await page.click("form.search--add button[type=submit]");
  await page.waitForTimeout(300);
  const spaceMsg = await page.locator("#add-msg").textContent();
  check("spaces-only nickname: Korean error under the field", /닉네임을 입력해 주세요/.test(spaceMsg ?? ""), spaceMsg);
  const empty = await page.evaluate(() => { const i = document.querySelector("#character-name"); i.value = ""; return i.validationMessage; });
  note(`empty nickname -> native validation bubble: '${empty}'`);
  if (NO_CRAWLER) {
    await page.fill("#character-name", T1);
    await page.press("#character-name", "Enter");
    await page.waitForSelector("#guide-title", { timeout: 5000 }).catch(() => {});
    check("nickname opens the import guide", await page.locator("#guide-title").count() === 1);
    check("guide heading has focus", /guide-title/.test(await active()), await active());
    await page.click("summary:has-text('직접 붙여넣기')");
    await page.route("**/api/character/import", (r) => r.abort());
    await page.fill("#paste-store", JSON.stringify(named(T1)));
    await page.click(".paste-form button[type=submit]");
    await page.waitForTimeout(600);
    const off = await page.locator("#paste-msg").textContent();
    check("paste offline: Korean error", /서버에 연결하지 못했어요/.test(off ?? ""), off);
    await page.unroute("**/api/character/import");
    await page.fill("#paste-store", "{\"v\":1}");
    await page.click(".paste-form button[type=submit]");
    await page.waitForTimeout(600);
    const shape = await page.locator("#paste-msg").textContent();
    check("paste wrong shape: Korean error", /[가-힣]/.test(shape ?? ""), shape);
    await page.fill("#paste-store", JSON.stringify(named(T1)));
    await page.click(".paste-form button[type=submit]");
    await page.waitForFunction((n) => [...document.querySelectorAll(".card-name")].some((e) => e.textContent === n), T1, { timeout: 8000 }).catch(() => {});
    const ok = (await page.locator(".card", { hasText: T1 }).count()) === 1;
    if (ok) created.add(T1);
    check("paste imports and shows the card", ok);
    check("guide closed, focus back on the nickname field", (await page.locator("#guide-title").count()) === 0 && /character-name/.test(await active()), await active());
    note(`status: ${await page.locator("#add-msg").textContent()}`);
    // guide close button
    await page.fill("#character-name", "닫기테스트");
    await page.press("#character-name", "Enter");
    await page.waitForSelector("#guide-title", { timeout: 5000 }).catch(() => {});
    await page.click("button[aria-label='가져오기 안내 닫기']");
    check("closing the guide returns focus to the field", /character-name/.test(await active()), await active());
    // Esc inside the guide?
    await page.press("#character-name", "Enter");
    await page.waitForSelector("#guide-title", { timeout: 5000 }).catch(() => {});
    await page.keyboard.press("Escape");
    note(`Esc in guide -> guide still open: ${await page.locator("#guide-title").count()}`);
  }
  check("no uncaught page errors", errors.filter((e) => !/Failed to load resource|ERR_FAILED|net::/.test(e)).length === 0, errors.join(" || ").slice(0, 600));
} finally {
  for (const id of partyIds) console.log(`cleanup party ${id}: ${(await api("DELETE", `/api/party/${id}`)).status}`);
  for (const n of created) console.log(`cleanup ${n}: ${(await api("DELETE", `/api/character/${encodeURIComponent(n)}`)).status}`);
  await browser.close();
  console.log(bad ? `# ${bad} BAD` : "# all ok");
}

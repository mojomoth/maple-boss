// Critic (design lens), visual side of G3-3 on the running dev server. Screenshots + checks.
// Usage: node interact.mjs <outDir>
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const BASE = "http://localhost:3000";
const out = path.resolve(process.argv[2] ?? "/tmp/critic-design/int");
mkdirSync(out, { recursive: true });
const tag = Date.now().toString(36).slice(-4);
const A = `크리틱A${tag}`; // via bookmarklet
const B = `크리틱B${tag}`; // via paste
const store = (file, name) => {
  const sr = JSON.parse(readFileSync(`/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples/${file}`, "utf8"));
  sr.userApiData.info.character_name = name;
  return JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
};
const log = [];
let fails = 0;
const check = (label, ok, detail = "") => {
  log.push(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `  | ${detail}` : ""}`);
  if (!ok) fails++;
  return ok;
};
const storeA = store("아델.json", A);
const mock = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><p id="s">loading</p><script>localStorage.setItem("character-store", ${JSON.stringify(storeA).replace(/</g, "\\u003c")});document.getElementById("s").textContent="ready";</script>`);
});
await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const MOCK = `http://127.0.0.1:${mock.address().port}`;

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const created = [];
const active = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a ? `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}${a.className ? "." + String(a.className).split(" ")[0] : ""} "${(a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 20)}"` : "none";
});
try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const shot = (n, full = false) => page.screenshot({ path: path.join(out, `${n}-${w}.png`), fullPage: full });

    // Boss search: name, alias, difficulty, initial, miss
    for (const [q, wantName, wantDiff] of [["루시드", "루시드", null], ["검마", "검은 마법사", null], ["하드 루시드", "루시드", "하드"], ["익카링", "카링", "익스트림"], ["노말 카링", "카링", "노말"]]) {
      await page.fill("#boss-q", q);
      await page.press("#boss-q", "Enter");
      await page.waitForFunction((n) => document.querySelector(".boss-name h3")?.textContent === n, wantName, { timeout: 15000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
      const name = await page.locator(".boss-name h3").innerText();
      const diff = await page.locator(".boss-name .badge").innerText();
      const parties = await page.locator("ol.parties > li").count();
      const empty = (await page.locator("section[aria-labelledby=party-title] .empty-title").count()) ? await page.locator("section[aria-labelledby=party-title] .empty-title").innerText() : "";
      const count = await page.locator("section[aria-labelledby=party-title] .count").innerText();
      const field = await page.inputValue("#boss-q");
      check(`${w} boss search "${q}" -> ${wantDiff ?? ""} ${wantName}`, name === wantName && (!wantDiff || diff === wantDiff), `shown ${diff} ${name}, parties ${parties} (count badge ${count}) ${empty}; field="${field}" url=${page.url().replace(BASE, "")}`);
      if (q === "루시드") await shot("search-lucid", true);
      if (q === "익카링") await shot("search-ext-kaling");
    }
    // miss
    await page.fill("#boss-q", "없는보스");
    await page.press("#boss-q", "Enter");
    await page.locator("#boss-msg").filter({ hasText: /\S/ }).waitFor({ timeout: 15000 }).catch(() => {});
    const miss = await page.locator("#boss-msg").innerText();
    check(`${w} boss search miss shows Korean message`, /맞는 보스가 없어요/.test(miss), miss);
    await shot("search-miss");
    // message box vs other elements
    const ov = await page.evaluate(() => {
      const m = document.querySelector("#boss-msg").getBoundingClientRect();
      const hits = [...document.querySelectorAll(".section-head, .section-help, #add-msg, .search label, .field, .btn")].filter((e) => {
        const r = e.getBoundingClientRect();
        return Math.min(r.right, m.right) - Math.max(r.left, m.left) > 2 && Math.min(r.bottom, m.bottom) - Math.max(r.top, m.top) > 2;
      }).map((e) => e.className || e.tagName);
      return { m: [Math.round(m.left), Math.round(m.top), Math.round(m.right), Math.round(m.bottom)], hits, vw: innerWidth };
    });
    check(`${w} miss message does not overlap and stays in viewport`, ov.hits.length === 0 && ov.m[2] <= ov.vw && ov.m[0] >= 0, JSON.stringify(ov));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

    // Add: empty, spaces
    await page.click("button:has-text('추가')");
    await page.waitForTimeout(200);
    const v1 = await page.evaluate(() => document.querySelector("#character-name").validationMessage);
    log.push(`     ${w} empty submit -> browser validation: "${v1}"`);
    await page.fill("#character-name", "   ");
    await page.click("button:has-text('추가')");
    await page.waitForTimeout(200);
    const m1 = await page.locator("#add-msg").innerText();
    check(`${w} spaces-only nickname -> Korean message`, /닉네임을 입력해 주세요/.test(m1), m1);
    await shot("add-empty");

    // crawler busy + error (intercepted: the dev server has the local crawler, which would open a real window)
    await page.route("**/api/character", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await new Promise((r) => setTimeout(r, 1500));
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "maplescouter에서 ‘없는닉’ 캐릭터를 찾지 못했어요. 닉네임을 확인해 주세요." }) });
    });
    await page.fill("#character-name", "없는닉");
    await page.click("button:has-text('추가')");
    await page.waitForTimeout(400);
    const busy = await page.locator("#add-msg").innerText();
    check(`${w} crawler busy line is Korean and visible`, /불러오는 중/.test(busy), busy);
    await shot("add-busy");
    const busyBox = await page.evaluate(() => { const r = document.querySelector("#add-msg").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), innerWidth]; });
    check(`${w} busy line inside viewport`, busyBox[0] >= 0 && busyBox[1] <= busyBox[2], JSON.stringify(busyBox));
    await page.waitForTimeout(1600);
    const errm = await page.locator("#add-msg").innerText();
    check(`${w} crawler 404 -> Korean message under the field`, /찾지 못했어요/.test(errm), errm);
    await shot("add-404");
    await page.unroute("**/api/character");

    // Server unreachable for add
    await page.route("**/api/character", (route) => (route.request().method() === "POST" ? route.abort("connectionrefused") : route.continue()));
    await page.fill("#character-name", "오프라인");
    await page.click("button:has-text('추가')");
    await page.locator("#add-msg").filter({ hasText: /연결/ }).waitFor({ timeout: 5000 }).catch(() => {});
    check(`${w} add offline -> Korean`, /서버에 연결하지 못했어요/.test(await page.locator("#add-msg").innerText()), await page.locator("#add-msg").innerText());
    await page.unroute("**/api/character");

    // Guide (501), as on a server without the crawler
    await page.route("**/api/character", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 501, contentType: "application/json", body: '{"error":"x"}' }) : route.continue()));
    const nick = w === 1440 ? A : B;
    await page.fill("#character-name", nick);
    await page.click("button:has-text('추가')");
    const guide = page.locator("section.guide");
    await guide.waitFor({ timeout: 10000 });
    check(`${w} guide opens, heading focused`, (await active(page)).includes("guide-title"), await active(page));
    const bm = guide.getByRole("link", { name: "Maple Boss로 보내기" });
    await bm.click();
    await shot("guide", false);
    await page.screenshot({ path: path.join(out, `guide-full-${w}.png`), fullPage: true });
    await guide.locator("summary", { hasText: "직접 붙여넣기" }).click();
    await guide.getByRole("button", { name: "가져오기", exact: true }).click();
    const pm0 = await page.locator("#paste-msg").innerText();
    check(`${w} paste empty -> Korean`, /가져올 데이터가 없어요/.test(pm0), pm0);
    await page.fill("#paste-store", "{nope");
    await guide.getByRole("button", { name: "가져오기", exact: true }).click();
    await page.locator("#paste-msg").filter({ hasText: /JSON|형식/ }).waitFor({ timeout: 10000 }).catch(() => {});
    const pm1 = await page.locator("#paste-msg").innerText();
    check(`${w} paste non-JSON -> Korean`, /[가-힣]/.test(pm1) && !/[A-Za-z]{6,}/.test(pm1.replace(/maplescouter|JSON|character-store/g, "")), pm1);
    await guide.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `guide-paste-error-${w}.png`), fullPage: true });
    await page.unroute("**/api/character");

    if (w === 1440) {
      // bookmarklet path
      const js = await bm.getAttribute("href");
      await page.goto(`${MOCK}/ko/result`);
      await page.locator("#s", { hasText: "ready" }).waitFor();
      await Promise.all([page.waitForURL(BASE + "/", { timeout: 30000 }), page.evaluate(decodeURIComponent(js.slice("javascript:".length))).catch(() => {})]);
      await page.locator(".card-name", { hasText: A }).waitFor({ timeout: 15000 }).catch(() => {});
      if (check(`bookmarklet -> /import -> / shows card ${A}`, (await page.locator(".card-name", { hasText: A }).count()) === 1)) created.push(A);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.waitForTimeout(300);
      await shot("after-bookmarklet", true);
    } else {
      // paste fallback import
      await page.fill("#paste-store", store("고딩.json", B));
      await guide.getByRole("button", { name: "가져오기", exact: true }).click();
      await guide.waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
      await page.locator(".card-name", { hasText: B }).waitFor({ timeout: 15000 }).catch(() => {});
      if (check(`375 paste imports ${B}`, (await page.locator(".card-name", { hasText: B }).count()) === 1)) created.push(B);
      const am = await page.locator("#add-msg").innerText();
      check(`375 paste confirmation line`, am.includes(B), `${am} ; focus ${await active(page)}`);
      await shot("after-paste");
      const amBox = await page.evaluate(() => { const r = document.querySelector("#add-msg").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), innerWidth]; });
      check(`375 confirmation inside viewport`, amBox[0] >= 0 && amBox[1] <= amBox[2], JSON.stringify(amBox));
    }

    // Delete via modal, keyboard: the created character's card
    const name = w === 1440 ? A : B;
    const card = page.locator("button.card", { has: page.locator(".card-name", { hasText: name }) });
    await card.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
    const f0 = await active(page);
    const seq = [];
    for (let i = 0; i < 5; i++) { await page.keyboard.press("Tab"); seq.push(await active(page)); }
    const back = [];
    for (let i = 0; i < 4; i++) { await page.keyboard.press("Shift+Tab"); back.push(await active(page)); }
    const inside = await page.evaluate(() => document.querySelector("dialog.confirm").contains(document.activeElement));
    check(`${w} modal initial focus on 취소`, f0.includes("취소"), f0);
    log.push(`     ${w} Tab: ${seq.join(" > ")}`);
    log.push(`     ${w} Shift+Tab: ${back.join(" > ")}`);
    check(`${w} focus stays inside dialog after Tab cycling`, inside && [...seq, ...back].every((s) => /취소|삭제|닫기/.test(s)), "");
    await page.screenshot({ path: path.join(out, `modal-kbd-${w}.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const closed = await page.evaluate(() => !document.querySelector("dialog.confirm").open);
    const ret = await active(page);
    check(`${w} Esc closes, focus returns to card`, closed && ret.includes(name), ret);
    // delete fails offline -> Korean in modal
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
    await page.route("**/api/character/**", (route) => (route.request().method() === "DELETE" ? route.abort("connectionrefused") : route.continue()));
    await page.locator("dialog.confirm .btn--danger").click();
    await page.locator(".confirm-error").waitFor({ timeout: 5000 }).catch(() => {});
    const de = (await page.locator(".confirm-error").count()) ? await page.locator(".confirm-error").innerText() : "(none)";
    check(`${w} delete offline -> Korean error in modal`, /서버에 연결하지 못했어요/.test(de), de);
    await page.screenshot({ path: path.join(out, `modal-error-${w}.png`) });
    const mb = await page.evaluate(() => { const r = document.querySelector("dialog.confirm").getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight]; });
    check(`${w} modal with error fits viewport`, mb[0] >= 0 && mb[1] <= mb[2], JSON.stringify(mb));
    await page.unroute("**/api/character/**");
    // real delete via keyboard: Tab to 삭제, Enter
    await page.locator("dialog.confirm .btn--quiet").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.locator(".card-name", { hasText: name }).waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
    const gone = (await page.locator(".card-name", { hasText: name }).count()) === 0;
    if (check(`${w} keyboard delete removes the card`, gone, `focus ${await active(page)}`)) created.splice(created.indexOf(name), 1);
    check(`${w} no page errors`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
} catch (e) {
  check("run", false, e.stack);
} finally {
  for (const n of created) {
    const r = await fetch(`${BASE}/api/character/${encodeURIComponent(n)}`, { method: "DELETE" });
    log.push(`cleanup ${n}: ${r.status}`);
  }
  await browser.close();
  mock.close();
}
log.push(fails ? `# ${fails} failed` : "# all passed");
writeFileSync(path.join(out, "interact.txt"), log.join("\n") + "\n");
console.log(log.join("\n"));

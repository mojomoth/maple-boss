// G3b P2 sweep: one browser check per UI row of STATUS.md "G3 로컬 Critic P2" at 1440, 1100 and 375 (plus the
// 961..1281 header band for D3), in the system Chrome. Also FN-3 (delete 'import' through the modal), FN-7 (a real
// cross-site POST from another origin) and FN-11 (no logo warning in the console).
// usage: BASE_URL=http://localhost:3000 node ui-sweep.mjs [shots dir]
// Creates temporary characters (WWWWWWWWWWWW, import, rates, 스윕<tag>, csrf<tag>) and deletes them; a name that
// already exists is left alone and its check is skipped. One line per check, exit 1 on any failure.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const POCS = "/Users/jeongyounglee/work/repo/maple-boss/pocs";
const require = createRequire(`${POCS}/package.json`);
const { chromium } = require("playwright-core");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.argv[2] && path.resolve(process.argv[2]);
if (OUT) mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SEED = JSON.parse(readFileSync(`${POCS}/seed/아델.json`, "utf8"));
const tag = Date.now().toString(36).slice(-4);
const WIDE = "WWWWWWWWWWWW"; // 12 letters, a legal MapleStory length, the widest Latin glyph
const PARTY = `스윕${tag}`;
const BOSS = "extreme-kaling";
const WIDTHS = [1440, 1100, 375];

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== "" ? `  | ${detail}` : ""}`);
  if (!ok) failures++;
  return ok;
};
const note = (s) => console.log(`     ${s}`);
const payload = (name, job = SEED.info.character_class) => ({ ...SEED, info: { ...SEED.info, character_name: name, character_class: job } });
const api = (method, p, body) =>
  fetch(BASE + p, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
const names = async () => (await (await api("GET", "/api/character")).json()).map((c) => c.name);
const created = new Set();
async function importAs(name, job) {
  if ((await names()).includes(name)) return note(`${name} already exists: left alone, its checks are skipped`), false;
  const r = await api("POST", "/api/character/import", payload(name, job));
  if (r.status === 201) created.add(name);
  return check(`setup: import ${name}`, r.status === 201, r.status);
}
const shot = async (page, name, clip) => {
  if (!OUT) return;
  await page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) });
  note(`screenshot ${name}`);
};
// An element, scrolled into view, with a margin, clamped to the viewport.
const shotOf = async (page, name, locator, p = 8) => {
  if (!OUT) return;
  await locator.scrollIntoViewIfNeeded();
  const r = await locator.boundingBox();
  const vp = page.viewportSize();
  const x = Math.max(0, r.x - p), y = Math.max(0, r.y - p);
  await shot(page, name, { x, y, width: Math.min(vp.width - x, r.width + 2 * p), height: Math.min(vp.height - y, r.height + 2 * p) });
};

const browser = await chromium.launch({ executablePath: CHROME });
const evil = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end("<!doctype html><title>another site</title><p>another site</p>");
});
await new Promise((r) => evil.listen(0, "127.0.0.1", r));
const EVIL = `http://127.0.0.1:${evil.address().port}`;

try {
  const hasWide = await importAs(WIDE, "아크메이지(불,독)");
  const hasParty = await importAs(PARTY);

  for (const w of WIDTHS) {
    console.log(`\n# ${w}`);
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
    const page = await ctx.newPage();
    const warnings = [];
    page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.evaluate(() => document.fonts.ready);

    // D3: the logo keeps 272x77, nothing overlaps it, the page does not scroll sideways
    const head = await page.evaluate(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect().toJSON();
      return { logo: r(".logo img"), add: r(".search--add"), boss: r(".search--boss"), bar: r(".topbar"), docW: document.documentElement.scrollWidth, vw: innerWidth };
    });
    const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
    check(`${w} D3 logo 272x77, clear of both searches, no sideways scroll`,
      Math.round(head.logo.width) === 272 && Math.round(head.logo.height) === 77 && apart(head.logo, head.add) && apart(head.logo, head.boss) && head.docW <= head.vw,
      `logo ${Math.round(head.logo.width)}x${Math.round(head.logo.height)}, bar ${Math.round(head.bar.height)}px, doc ${head.docW}/${head.vw}`);
    await shot(page, `d3-header-${w}.png`, { x: 0, y: 0, width: w, height: Math.ceil(head.bar.height) + 2 });

    // D4: no native glyph (bright pixels) between the boss text and the magnifier, hovered and focused; the list
    // and the search still work
    const field = page.locator("#boss-q");
    for (const state of ["hover", "focus"]) {
      if (state === "hover") await field.hover();
      else await field.focus();
      await page.waitForTimeout(150);
      const box = await field.boundingBox();
      // a 56px strip left of the 44px icon button, away from the text (익스트림 카링 ends ~110px in)
      const strip = { x: box.x + box.width - 44 - 58, y: box.y + 8, width: 56, height: box.height - 16 };
      const png = await page.screenshot({ clip: strip });
      const bright = await page.evaluate(async (b64) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] > 170) n++;
        return n;
      }, png.toString("base64"));
      check(`${w} D4 boss field ${state}: no native × or ▾ glyph`, bright === 0, `${bright} bright pixels in the strip`);
      if (state === "focus") await shotOf(page, `d4-field-focus-${w}.png`, page.locator(".search--boss"), 6);
    }
    const list = await page.evaluate(() => ({ id: document.querySelector("#boss-q").list?.id, n: document.querySelector("#boss-q").list?.options.length }));
    check(`${w} D4 datalist still attached`, list.id === "boss-list" && list.n === 60, JSON.stringify(list));
    await field.fill("하스우");
    await field.press("Enter");
    await page.waitForFunction(() => document.querySelector(".boss-name h3")?.textContent === "스우" && new URL(location.href).searchParams.get("boss") === "hard-lotus", null, { timeout: 15000 }).catch(() => {});
    check(`${w} D4 typed search still works (하스우 -> 하드 스우)`, (await page.locator(".boss-name h3").textContent()) === "스우" && (await field.inputValue()) === "하드 스우", `${await field.inputValue()} ${new URL(page.url()).search}`);

    // FN-10: the 12-letter name and the long job end in an ellipsis inside the card
    if (hasWide) {
      await page.goto(BASE + "/", { waitUntil: "networkidle" });
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      const card = page.locator(".card", { has: page.locator(".card-name", { hasText: WIDE }) });
      await card.scrollIntoViewIfNeeded();
      const r = await card.evaluate((c, wide) => {
        const cr = c.getBoundingClientRect();
        const name = c.querySelector(".card-name");
        const meta = c.querySelector(".meta");
        const job = meta.lastElementChild;
        const spill = [...c.querySelectorAll("*")]
          .filter((e) => !e.closest(".sprite"))
          .filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > cr.right + 0.5 || r.left < cr.left - 0.5); })
          .map((e) => e.className || e.tagName);
        const lh = parseFloat(getComputedStyle(meta).lineHeight) || 25;
        return {
          nameCut: name.scrollWidth > name.clientWidth, nameEllipsis: getComputedStyle(name).textOverflow,
          jobCut: job.scrollWidth > job.clientWidth, jobEllipsis: getComputedStyle(job).textOverflow,
          metaOneLine: meta.getBoundingClientRect().height < lh * 1.5, spill,
          accessibleText: c.textContent.includes(wide) && c.textContent.includes("아크메이지(불,독)"),
        };
      }, WIDE);
      check(`${w} FN-10 name: one line, ellipsis when cut`, r.nameEllipsis === "ellipsis" && (r.nameCut || w > 1600), `cut ${r.nameCut}, text-overflow ${r.nameEllipsis}`);
      check(`${w} FN-10 Lv · job: one line (no wrapped '·'), ellipsis on the job`, r.metaOneLine && r.jobEllipsis === "ellipsis", `job cut ${r.jobCut}`);
      check(`${w} FN-10 nothing spills out of the card; the card text keeps the full name and job`, r.spill.length === 0 && r.accessibleText, r.spill.join(","));
      await shotOf(page, `fn10-card-${w}.png`, card, 4);
      // the same name in a party row (it has 익스트림 카링 rates): it stays inside its member column and its row
      const over = await page.evaluate((wide) => {
        const m = [...document.querySelectorAll(".party .member")].find((e) => e.querySelector("strong")?.textContent === wide);
        if (!m) return "not in a party row";
        const out = (e, box) => { const r = e.getBoundingClientRect(); return r.right > box.right + 0.5 || r.left < box.left - 0.5; };
        const mb = m.getBoundingClientRect(), pb = m.closest(".party").getBoundingClientRect();
        return [...m.querySelectorAll("*")].filter((e) => !e.closest(".sprite") && (out(e, mb) || out(e, pb))).map((e) => e.tagName).join(",");
      }, WIDE);
      check(`${w} FN-10 party row: the name stays inside its member column`, over === "", over || "0 elements");
      if (over === "") await shotOf(page, `fn10-party-${w}.png`, page.locator(".party", { has: page.locator(".member strong", { hasText: WIDE }) }).first(), 4);
      // /pocs/character lists it too
      await page.goto(BASE + "/pocs/character", { waitUntil: "networkidle" });
      const row = page.locator(".pick-row", { has: page.locator("strong", { hasText: WIDE }) });
      const rowOver = await row.evaluate((c) => { const b = c.getBoundingClientRect(); return [...c.querySelectorAll("*")].filter((e) => !e.closest(".sprite")).filter((e) => { const r = e.getBoundingClientRect(); return r.right > b.right + 0.5; }).length; });
      check(`${w} FN-10 /pocs/character row: nothing spills out`, rowOver === 0, `${rowOver} elements`);
    }

    // D6: the dialog's supporting line (draft: 414px wide at 1448), dot spacing, and the dialog still fits
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.locator("button.card").first().click();
    await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
    await page.waitForTimeout(200);
    const d6 = await page.evaluate(() => {
      const note = document.querySelector(".confirm-note");
      const rg = document.createRange();
      rg.selectNodeContents(note);
      const rects = [...rg.getClientRects()];
      const meta = document.querySelector(".preview .meta");
      const lv = meta.firstElementChild.getBoundingClientRect();
      const jobText = document.createRange();
      jobText.selectNodeContents(meta.lastElementChild);
      const dlg = document.querySelector("dialog.confirm").getBoundingClientRect();
      const del = document.querySelector(".confirm .btn--danger").getBoundingClientRect();
      return {
        size: getComputedStyle(note).fontSize, lines: rects.length, width: Math.round(Math.max(...rects.map((r) => r.width))),
        dotGap: Math.round(jobText.getBoundingClientRect().left - lv.right), dialog: [Math.round(dlg.left), Math.round(dlg.right), Math.round(dlg.width)], vw: innerWidth,
        reachable: del.height > 0, docW: document.documentElement.scrollWidth,
      };
    });
    check(`${w} D6 supporting line 21.6px`, d6.size === "21.6px", `${d6.size}, ${d6.lines} line(s), widest ${d6.width}px`);
    if (w === 1440) check(`${w} D6 one line about as wide as the draft's (414px)`, d6.lines === 1 && Math.abs(d6.width - 414) <= 12, `${d6.width}px`);
    check(`${w} D6 dialog inside the viewport, no sideways scroll`, d6.dialog[0] >= 0 && d6.dialog[1] <= d6.vw && d6.docW <= d6.vw && d6.reachable, `dialog ${d6.dialog.join("..")} (w ${d6.dialog[2]}), 'Lv.' box to job text ${d6.dotGap}px`);
    await shotOf(page, `d6-modal-${w}.png`, page.locator("dialog.confirm"), 0);
    await page.keyboard.press("Escape");

    // FN-3: a character named 'import' goes away through the modal like any other
    if (w === 1440) {
      const probe = await api("DELETE", "/api/character/import");
      if (probe.status === 405) check("FN-3 DELETE /api/character/import reaches the character", false, "405: the fix is not running, 'import' not created");
      else if (await importAs("import")) {
        await page.goto(BASE + "/", { waitUntil: "networkidle" });
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await page.locator(".card", { has: page.locator(".card-name", { hasText: /^import$/ }) }).click();
        await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
        await page.click("dialog.confirm .btn--danger");
        await page.waitForFunction(() => !document.querySelector("dialog.confirm")?.open, null, { timeout: 8000 }).catch(() => {});
        await page.locator(".card-name", { hasText: /^import$/ }).waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
        const left = await page.locator(".card-name", { hasText: /^import$/ }).count();
        const err = await page.locator(".confirm-error").textContent().catch(() => "");
        const gone = !(await names()).includes("import");
        if (gone) created.delete("import");
        check("FN-3 'import' deleted from its card's dialog (card gone, API agrees)", left === 0 && gone, `cards ${left}, error '${err ?? ""}'`);
      }
      if (await importAs("rates")) {
        const del = await page.evaluate(async () => (await fetch("/api/character/rates", { method: "DELETE" })).status);
        const again = await page.evaluate(async () => (await fetch("/api/character/rates", { method: "DELETE" })).status);
        if (del === 204) created.delete("rates");
        check("FN-3 'rates': same-origin DELETE 204, then 404", del === 204 && again === 404, `${del}, ${again}`);
      }
    }

    // D5: links inside a sentence are underlined and mint, unlike the text around them
    await page.goto(BASE + "/pocs/character", { waitUntil: "networkidle" });
    await page.route("**/api/character", (r) =>
      r.request().method() === "POST"
        ? r.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ error: "이 서버는 닉네임으로 바로 불러오지 못해요. maplescouter 결과 페이지에서 가져와 주세요.", importUrl: "https://maplescouter.com/ko/result?name=x" }) })
        : r.fallback(),
    );
    await page.fill("#character-name", "링크확인");
    await page.click("form.form-row .btn--primary");
    await page.waitForSelector("p.msg a");
    const links = await page.evaluate(() => [...document.querySelectorAll("p.msg a")].map((a) => {
      const s = getComputedStyle(a); const p = getComputedStyle(a.closest("p"));
      return { text: a.textContent.trim(), underline: s.textDecorationLine.includes("underline"), color: s.color, around: p.color };
    }));
    check(`${w} D5 /pocs/character 501 line: links underlined, coloured apart from the sentence`, links.length === 2 && links.every((l) => l.underline && l.color !== l.around), links.map((l) => `${l.text}: ${l.underline ? "underline" : "none"} ${l.color} vs ${l.around}`).join("; "));
    await shotOf(page, `d5-pchar-links-${w}.png`, page.locator("p.msg:has(a)"));
    await page.unroute("**/api/character");
    // /pocs/party shows its sentence link only with no characters at all; the same markup, checked in place
    await page.goto(BASE + "/pocs/party", { waitUntil: "networkidle" });
    const party = await page.evaluate(() => {
      const p = document.createElement("p");
      p.className = "section-help";
      p.innerHTML = '먼저 <a href="/pocs/character">캐릭터 등록</a>에서 캐릭터를 등록해 주세요.';
      document.querySelector("#request-title").after(p);
      const s = getComputedStyle(p.querySelector("a"));
      const r = { underline: s.textDecorationLine.includes("underline"), color: s.color, around: getComputedStyle(p).color };
      p.remove();
      return r;
    });
    check(`${w} D5 /pocs/party help-line link (same markup as page.tsx:28) underlined and mint`, party.underline && party.color !== party.around, JSON.stringify(party));

    // D7: /pocs/party heading names the screen as its title and nav do
    const h1 = await page.locator("h1").textContent();
    check(`${w} D7 /pocs/party h1 = '파티 편성' (title '${await page.title()}')`, h1 === "파티 편성" && (await page.title()).startsWith("파티 편성 ·"), h1);

    // FN-6: /pocs/party errors look and announce as errors; success stays a status
    await page.route("**/api/party/requests", (r) => r.request().method() === "POST" ? r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "등록되지 않은 캐릭터예요." }) }) : r.fallback());
    await page.locator("form.form-row").first().locator("button.btn--primary").click();
    const reqErr = await page.locator("form.form-row p.msg").first().evaluate((p) => ({ text: p.textContent, cls: p.className, role: p.getAttribute("role"), color: getComputedStyle(p).color }));
    await page.unroute("**/api/party/requests");
    await page.route("**/api/party/requests", (r) => r.request().method() === "POST" ? r.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true}' }) : r.fallback());
    await page.locator("form.form-row").first().locator("button.btn--primary").click();
    await page.waitForFunction(() => document.querySelector("form.form-row p.msg")?.getAttribute("role") === "status");
    const reqOk = await page.locator("form.form-row p.msg").first().evaluate((p) => ({ text: p.textContent, cls: p.className, role: p.getAttribute("role"), color: getComputedStyle(p).color }));
    await page.unroute("**/api/party/requests");
    check(`${w} FN-6 구직 등록 error: .is-error, role=alert, error colour`, reqErr.cls.includes("is-error") && reqErr.role === "alert" && reqErr.color !== reqOk.color, `${reqErr.text} | ${reqErr.color}`);
    check(`${w} FN-6 구직 등록 success: plain .msg, role=status`, !reqOk.cls.includes("is-error") && reqOk.role === "status", `${reqOk.text} | ${reqOk.color}`);
    await shotOf(page, `fn6-request-ok-${w}.png`, page.locator("form.form-row").first(), 6);
    if (hasParty) {
      // a real open request for the temporary character, so the builder has a row to pick
      const req = await api("POST", "/api/party/requests", { characterName: PARTY, bossId: BOSS, partySize: 6 });
      await page.goto(BASE + "/pocs/party", { waitUntil: "networkidle" });
      await page.selectOption("select[name=builderBossId]", BOSS);
      await page.check(`input[name=member][value="${PARTY}"]`);
      await page.route("**/api/party", (r) => r.request().method() === "POST" ? r.abort() : r.fallback());
      await page.click("button:has-text('파티 편성')");
      const formErr = await page.locator(".panel-body > p.msg").evaluate((p) => ({ text: p.textContent, cls: p.className, role: p.getAttribute("role") }));
      await page.unroute("**/api/party");
      check(`${w} FN-6 파티 편성 offline: Korean error, .is-error, role=alert`, req.status === 201 && formErr.cls.includes("is-error") && formErr.role === "alert" && /서버에 연결하지 못했어요/.test(formErr.text), formErr.text);
      await shotOf(page, `fn6-form-error-${w}.png`, page.locator(".panel-body > p.msg"));
    }

    // FN-5: /pocs/character says when the list or the rates fail to load
    await page.route("**/api/character", (r) => r.request().method() === "GET" ? r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "캐릭터 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }) }) : r.fallback());
    await page.goto(BASE + "/pocs/character", { waitUntil: "networkidle" });
    const listErr = await page.evaluate(() => ({ alert: document.querySelector("#list-title")?.closest("section").querySelector("[role=alert]")?.textContent, count: !!document.querySelector("#list-title + .count") }));
    check(`${w} FN-5 list 500: Korean alert, no '0' count`, listErr.alert === "캐릭터 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." && !listErr.count, JSON.stringify(listErr));
    await shotOf(page, `fn5-list-error-${w}.png`, page.locator("#list-title").locator("xpath=ancestor::section"), 6);
    await page.unroute("**/api/character");
    await page.route("**/api/character", (r) => r.request().method() === "GET" ? r.abort() : r.fallback());
    await page.click("button:has-text('다시 시도')");
    await page.waitForTimeout(300);
    const offline = await page.locator("#list-title").locator("xpath=ancestor::section").locator("[role=alert]").textContent().catch(() => "");
    check(`${w} FN-5 list offline: the shared offline text`, offline === "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.", offline);
    await page.unroute("**/api/character");
    await page.click("button:has-text('다시 시도')");
    await page.waitForSelector(".pick-row");
    check(`${w} FN-5 다시 시도 loads the list and clears the alert`, (await page.locator(".pick-row").count()) > 0 && (await page.locator("#list-title").locator("xpath=ancestor::section").locator("[role=alert]").count()) === 0);
    await page.route("**/api/character/rates*", (r) => r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "배율을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }) }));
    await page.locator(".pick-row").first().click();
    await page.waitForSelector("#result-title");
    await page.waitForTimeout(300);
    const ratesErr = await page.evaluate(() => ({ alert: document.querySelector(".panel [role=alert]")?.textContent, empty: document.body.innerText.includes("배율 데이터가 없어요.") }));
    check(`${w} FN-5 rates 500: Korean alert, not '배율 데이터가 없어요.'`, ratesErr.alert === "배율을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." && !ratesErr.empty, JSON.stringify(ratesErr));
    await page.unroute("**/api/character/rates*");

    // D7: the /pocs/boss placeholder fits its field; FN-4: a repeated q takes the first value
    const res = await page.goto(BASE + `/pocs/boss?q=${encodeURIComponent("하스우")}&q=b`, { waitUntil: "networkidle" });
    const fn4 = await page.evaluate(() => ({ panels: [...document.querySelectorAll("main section.panel")].map((s) => s.getAttribute("aria-label")), value: document.querySelector("input[name=q]").value }));
    check(`${w} FN-4 /pocs/boss?q=하스우&q=b -> 200, 스우, field 하스우`, res?.status() === 200 && fn4.panels.join() === "스우" && fn4.value === "하스우", `${res?.status()} ${JSON.stringify(fn4)}`);
    await page.goto(BASE + "/pocs/boss", { waitUntil: "networkidle" });
    const ph = await page.evaluate(() => {
      const i = document.querySelector("input[name=q]");
      const s = getComputedStyle(i);
      const g = document.createElement("canvas").getContext("2d");
      g.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      return { text: i.placeholder, need: Math.ceil(g.measureText(i.placeholder).width), room: Math.floor(i.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)) };
    });
    check(`${w} D7 /pocs/boss placeholder fits`, ph.need <= ph.room, `'${ph.text}' ${ph.need}px in ${ph.room}px`);
    await shotOf(page, `d7-pocs-boss-${w}.png`, page.locator("form.form-row"), 6);

    // FN-11: no next/image warning anywhere (and no other console warning)
    for (const u of ["/", "/pocs/character", "/pocs/boss", "/pocs/party", "/flow", "/import", "/no-such-page"]) await page.goto(BASE + u, { waitUntil: "networkidle" });
    const logoWarn = warnings.filter((t) => /Image with src/.test(t));
    check(`${w} FN-11 no logo warning on / /pocs/* /flow /import 404`, logoWarn.length === 0, logoWarn[0]?.slice(0, 120) ?? `${warnings.length} other warnings`);
    check(`${w} no page errors`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // D3 across the band the critic measured: 961..1281, plus /import and 404 headers (logo only) stay 80px
  console.log("\n# D3 band");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const full = await page.evaluate(() => document.querySelector("#boss-q").clientWidth); // at 1440
  for (const w of [961, 1000, 1024, 1100, 1180, 1240, 1280, 1281, 1366]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(120);
    const r = await page.evaluate(() => {
      const b = (s) => document.querySelector(s).getBoundingClientRect();
      const logo = b(".logo img"), add = b(".search--add"), boss = b(".search--boss"), field = document.querySelector("#boss-q");
      const apart = (a, c) => a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top;
      return { logo: `${Math.round(logo.width)}x${Math.round(logo.height)}`, clear: apart(logo, add) && apart(logo, boss) && apart(add, boss), bar: Math.round(b(".topbar").height), field: field.clientWidth, docW: document.documentElement.scrollWidth, vw: innerWidth };
    });
    check(`band ${w}: logo ${r.logo}, searches clear of it and each other, boss field ${r.field}px`, r.logo === "272x77" && r.clear && r.field === full && r.docW <= r.vw, `bar ${r.bar}px, 1440 field ${full}px`);
    if ([961, 1024].includes(w)) await shot(page, `d3-header-${w}.png`, { x: 0, y: 0, width: w, height: r.bar + 2 });
  }
  for (const u of ["/import", "/no-such-page"]) {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(BASE + u, { waitUntil: "networkidle" });
    const bar = await page.evaluate(() => Math.round(document.querySelector(".topbar").getBoundingClientRect().height));
    check(`band 1100 ${u}: logo-only bar stays 80px`, bar === 80, `${bar}px`);
  }
  await ctx.close();

  // FN-7: a page on another origin posts to the API (text/plain, no preflight) and is refused; nothing is stored
  console.log("\n# FN-7 cross-site");
  const ctx2 = await browser.newContext({ locale: "ko-KR" });
  const ep = await ctx2.newPage();
  await ep.goto(EVIL);
  const csrf = `csrf${tag}`;
  const sent = await ep.evaluate(async ({ url, body }) => {
    const r = await fetch(url, { method: "POST", mode: "no-cors", headers: { "content-type": "text/plain" }, body });
    return r.type; // opaque: the page cannot read it either way
  }, { url: `${BASE}/api/character/import`, body: JSON.stringify(payload(csrf)) });
  await new Promise((r) => setTimeout(r, 500));
  const stored = (await names()).includes(csrf);
  if (stored) created.add(csrf);
  check(`FN-7 cross-site text/plain POST from ${EVIL} does not import '${csrf}'`, !stored, `fetch ${sent}, stored ${stored}`);
  // A classic attack page: an auto-submitted text/plain form into a hidden frame. text/plain sends "name=value", so a
  // name ending in ,"pad":" and the value "} make the body valid JSON for the import route.
  const viaForm = `form${tag}`;
  const formPost = (pg, url, name) => pg.evaluate(async ({ url, name }) => {
    const f = document.createElement("form");
    f.method = "POST";
    f.action = url;
    f.enctype = "text/plain";
    f.target = "sink";
    const i = document.createElement("input");
    i.name = name;
    i.value = '"}';
    f.append(i);
    const fr = document.createElement("iframe");
    fr.name = "sink";
    document.body.append(fr, f);
    const loaded = new Promise((r) => (fr.onload = r));
    f.submit();
    await loaded;
  }, { url, name });
  const formName = (n) => JSON.stringify(payload(n)).slice(0, -1) + ',"pad":"';
  await formPost(ep, `${BASE}/api/character/import`, formName(viaForm));
  await new Promise((r) => setTimeout(r, 500));
  const viaFormStored = (await names()).includes(viaForm);
  if (viaFormStored) created.add(viaForm);
  check(`FN-7 cross-site text/plain form POST (valid JSON body) does not import '${viaForm}'`, !viaFormStored, `stored ${viaFormStored}`);
  // positive control: the same request from the app's own origin goes through
  const app = await ctx2.newPage();
  await app.goto(BASE + "/pocs/boss", { waitUntil: "networkidle" });
  const same = `same${tag}`;
  const st = await app.evaluate(async (body) => (await fetch("/api/character/import", { method: "POST", headers: { "content-type": "application/json" }, body })).status, JSON.stringify(payload(same)));
  if (st === 201) created.add(same);
  check(`FN-7 the same POST from ${BASE} itself is accepted`, st === 201, st);
  // and the same form from the app's own origin goes through, so the form body above was a working attack
  const formOk = `formok${tag}`;
  await formPost(app, `${BASE}/api/character/import`, formName(formOk));
  await new Promise((r) => setTimeout(r, 500));
  const formOkStored = (await names()).includes(formOk);
  if (formOkStored) created.add(formOk);
  check(`FN-7 control: the same text/plain form from ${BASE} imports '${formOk}'`, formOkStored, `stored ${formOkStored}`);
  // The bookmarklet still works from another origin: it runs on the (mock) maplescouter page, opens /import with the
  // payload, and /import posts it from the app's own origin.
  const { bookmarklet } = await import(`${POCS}/app/import/bookmarklet.ts`);
  const viaBm = `북마클릿${tag}`;
  const sr = JSON.parse(readFileSync(`${POCS}/../docs/research/samples/아델.json`, "utf8"));
  sr.userApiData.info.character_name = viaBm;
  const bm = await ctx2.newPage();
  await bm.goto(EVIL);
  await bm.evaluate((store) => localStorage.setItem("character-store", store), JSON.stringify({ state: { searchResult: sr } }));
  const seen = [];
  bm.on("framenavigated", (f) => f === bm.mainFrame() && seen.push(new URL(f.url()).origin + new URL(f.url()).pathname));
  await bm.evaluate(decodeURIComponent(bookmarklet(BASE).slice("javascript:".length)));
  await bm.waitForURL((u) => u.origin === new URL(BASE).origin && u.pathname === "/" && seen.some((x) => x.endsWith("/import")), { timeout: 20000 }).catch(() => {});
  await bm.waitForLoadState("networkidle");
  const bmCard = await bm.locator(".card-name", { hasText: viaBm }).count();
  if ((await names()).includes(viaBm)) created.add(viaBm);
  check(`FN-7 bookmarklet from ${EVIL}: /import saves '${viaBm}' and lands on /`, bmCard === 1, `navigations ${seen.join(" -> ")}, card ${bmCard}`);
  await ctx2.close();
} catch (e) {
  check("sweep run", false, e.stack ?? String(e));
} finally {
  for (const n of created) {
    const r = await api("DELETE", `/api/character/${encodeURIComponent(n)}`);
    console.log(`cleanup ${n}: ${r.status}`);
  }
  await browser.close();
  evil.close();
}
console.log(failures ? `\n# ${failures} failed` : "\n# all passed");
process.exit(failures ? 1 : 0);

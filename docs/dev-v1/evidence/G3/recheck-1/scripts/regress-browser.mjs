// Recheck round 1 regression pass at 1440x900 and 375x812: / (search writes the label, parties follow the boss),
// the delete modal by keyboard (Tab trap both ways, Esc, focus back on the opener card, real delete of a throwaway
// character with focus on 내 캐릭터), /pocs/party (renders, rows have delete buttons) and /flow (renders, no errors).
// No horizontal overflow on any of them. Creates one tagged character per size and deletes it through the modal.
import { readFileSync } from "node:fs";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "/tmp/recheck1";
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d ? `  | ${d}` : ""}`); if (!ok) fails++; };
const store = (name) => {
  const sr = JSON.parse(readFileSync("/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples/고딩.json", "utf8"));
  sr.userApiData.info.character_name = name;
  return JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
};
const made = [];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a === document.body ? "body" : `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}${a.className ? "." + String(a.className).split(" ")[0] : ""} '${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 20)}'`; });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const name = `재검M${Date.now().toString(36).slice(-4)}`;
    const r = await fetch(`${BASE}/api/character/import`, { method: "POST", headers: { "content-type": "application/json" }, body: store(name) });
    made.push(name);
    console.log(`setup import ${name}: ${r.status}`);
    const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    check(`${w} / no horizontal overflow`, (await overflow(page)) <= 0);
    // search by difficulty + name, by alias
    for (const [q, want] of [["하드 세렌", "하드 선택받은 세렌"], ["없는보스", null], ["데미안", null], ["카칼", "카오스 감시자 칼로스"]]) {
      await page.fill("#boss-q", q);
      await page.press("#boss-q", "Enter");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1200);
      const s = await page.evaluate(() => ({ shown: `${document.querySelector(".boss-name .badge").textContent} ${document.querySelector(".boss-name h3").textContent}`, field: document.querySelector("#boss-q").value, msg: document.querySelector("#boss-msg").textContent, parties: document.querySelector("#party-title + .count")?.textContent }));
      const ok = s.msg ? s.field === q : s.field === s.shown && (!want || s.shown === want);
      check(`${w} search '${q}'`, ok, JSON.stringify(s));
    }
    await page.screenshot({ path: `${out}/regress-home-${w}.png`, fullPage: true });
    // the modal on our throwaway card
    const card = page.locator("button.card", { hasText: name });
    await card.scrollIntoViewIfNeeded();
    await card.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
    await page.waitForTimeout(250);
    check(`${w} modal opens with focus on 취소`, /취소/.test(await active(page)), await active(page));
    const seen = [];
    for (let i = 0; i < 5; i++) { await page.keyboard.press("Tab"); seen.push(await active(page)); }
    // native showModal(): the page behind is inert; after the last control Tab passes through the browser UI
    // ("body" here) and comes back to 닫기. Fail only if a page control outside the dialog gets focus.
    const inside = await page.evaluate(() => document.querySelector("dialog.confirm").contains(document.activeElement));
    check(`${w} Tab never reaches the page behind the modal`, inside && seen.every((s) => /닫기|취소|삭제|^body$/.test(s)), seen.join(" > "));
    await page.keyboard.press("Shift+Tab");
    check(`${w} Shift+Tab stays in the modal`, await page.evaluate(() => document.querySelector("dialog.confirm").contains(document.activeElement)), await active(page));
    await page.screenshot({ path: `${out}/regress-modal-${w}.png` });
    check(`${w} modal: no horizontal overflow`, (await overflow(page)) <= 0);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    const back = await active(page);
    check(`${w} Esc closes, focus back on the card`, !(await page.evaluate(() => document.querySelector("dialog.confirm").open)) && back.includes("card") && back.includes(name.slice(0, 3)), back);
    // real delete via keyboard
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
    await page.keyboard.press("Tab"); // 취소 -> 삭제
    check(`${w} Tab from 취소 reaches 삭제`, /삭제/.test(await active(page)), await active(page));
    await page.keyboard.press("Enter");
    await card.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    check(`${w} card gone after delete, focus on 내 캐릭터`, (await card.count()) === 0 && /chars-title/.test(await active(page)), await active(page));
    const list = await (await fetch(`${BASE}/api/character`)).json();
    check(`${w} API: character gone from GET /api/character`, !list.some((c) => c.name === name), list.map((c) => c.name).join(", "));
    // /pocs/party and /flow
    await page.goto(BASE + "/pocs/party", { waitUntil: "networkidle" });
    const rows = await page.locator("ul.saved > li").count();
    const dels = await page.locator("ul.saved > li").getByRole("button", { name: /파티 삭제$/ }).count();
    check(`${w} /pocs/party renders, one delete button per saved row`, rows === dels, `${rows} rows, ${dels} buttons`);
    check(`${w} /pocs/party no horizontal overflow`, (await overflow(page)) <= 0);
    await page.goto(BASE + "/flow", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const nodes = await page.locator(".flow-node, [class*=flow-node]").count();
    check(`${w} /flow renders nodes`, nodes > 0, `${nodes} node elements, title '${await page.title()}'`);
    check(`${w} /flow no horizontal overflow`, (await overflow(page)) <= 0);
    await page.screenshot({ path: `${out}/regress-flow-${w}.png` });
    check(`${w} no page errors`, errors.length === 0, errors.join(" | "));
    await page.close();
  }
} catch (e) {
  check("run", false, e.stack);
} finally {
  for (const n of made) console.log(`cleanup ${n}: ${(await fetch(`${BASE}/api/character/${encodeURIComponent(n)}`, { method: "DELETE" })).status} (404 = already deleted by the modal)`);
  await browser.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");

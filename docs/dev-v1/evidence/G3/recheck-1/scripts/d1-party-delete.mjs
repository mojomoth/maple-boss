// Recheck D1/FN-1 (independent of the builder's party-delete.mjs): on /pocs/party, request -> formation -> saved list ->
// delete through the row's own button, by keyboard, at 1440 and 375. Also: 500 JSON, 502 non-JSON and offline answers
// show Korean text in an alert and give the button back; the busy state; the row really leaves the DB (GET /api/party);
// other saved parties stay; where focus goes after the row is removed. Cleans up everything it creates.
import { readFileSync } from "node:fs";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "/tmp/recheck1";
const tag = Date.now().toString(36).slice(-4);
const names = [`재검A${tag}`, `재검B${tag}`];
const store = (file, name) => {
  const sr = JSON.parse(readFileSync(`/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples/${file}`, "utf8"));
  sr.userApiData.info.character_name = name;
  return JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
};
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d ? `  | ${d}` : ""}`); if (!ok) fails++; };
const created = [];
const apiIds = async () => (await (await fetch(`${BASE}/api/party`)).json()).map((p) => p.id);
for (const [n, f] of [[names[0], "강은호.json"], [names[1], "아델.json"]]) {
  const r = await fetch(`${BASE}/api/character/import`, { method: "POST", headers: { "content-type": "application/json" }, body: store(f, n) });
  console.log(`setup import ${n}: ${r.status}`);
}
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text())) errors.push("console: " + m.text()); });
    await page.goto(`${BASE}/pocs/party`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    for (const n of names) {
      await page.selectOption("select[name=characterName]", n);
      await page.selectOption("select[name=bossId]", "extreme-kaling");
      await page.selectOption("select[name=partySize]", "2");
      await page.click("button:has-text('구직 등록')");
      await page.locator("form .msg").filter({ hasText: n }).waitFor({ timeout: 10000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
    }
    await page.selectOption("select[name=builderBossId]", "extreme-kaling");
    await page.selectOption("select[name=builderSize]", "2");
    await page.waitForTimeout(300);
    for (const n of names) await page.check(`input[aria-label="${n} 선택"]`);
    await page.click("button:has-text('파티 편성')");
    await page.locator(".panel-body > .msg").filter({ hasText: /편성했어요|못했어요/ }).waitFor({ timeout: 10000 });
    const fm = await page.locator(".panel-body > .msg").innerText();
    const id = Number(fm.match(/#(\d+)/)?.[1]);
    check(`${w} formation`, id > 0, fm);
    created.push(id);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    const rowsBefore = await page.locator("ul.saved > li").count();
    const idsBefore = await apiIds();
    const btn = page.getByRole("button", { name: `#${id} 익스트림 카링 파티 삭제` });
    check(`${w} row has a delete button named '#${id} 익스트림 카링 파티 삭제'`, (await btn.count()) === 1, `rows ${rowsBefore}`);
    const box = await btn.boundingBox();
    check(`${w} button is at least 44px tall and inside the viewport width`, box && box.height >= 44 && box.x + box.width <= w, JSON.stringify(box));
    await btn.scrollIntoViewIfNeeded();
    const row = page.locator("ul.saved > li").filter({ has: btn });
    await row.screenshot({ path: `${out}/d1-row-${w}.png` });

    // error answers: route the one DELETE
    const url = `**/api/party/${id}`;
    const cases = [
      ["500 JSON", (r) => r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "파티를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요." }) }), /파티를 삭제하지 못했어요\. 잠시 뒤/],
      ["502 HTML", (r) => r.fulfill({ status: 502, contentType: "text/html", body: "<html>Bad Gateway</html>" }), /파티를 삭제하지 못했어요 \(502\)/],
      ["offline", (r) => r.abort("internetdisconnected"), /서버에 연결하지 못했어요/],
    ];
    for (const [label, handler, want] of cases) {
      await page.route(url, (r) => (r.request().method() === "DELETE" ? handler(r) : r.continue()));
      await btn.focus();
      await page.keyboard.press("Enter");
      const alert = row.getByRole("alert");
      await alert.waitFor({ timeout: 5000 }).catch(() => {});
      const t = await alert.innerText().catch(() => "(none)");
      check(`${w} ${label}: Korean alert in the row`, want.test(t) && !/[A-Za-z]{4,}/.test(t), t);
      // the name keeps its visually hidden prefix, so compare the end; and see where keyboard focus is now
      const bt = (await btn.textContent()).trim();
      const focused = await btn.evaluate((b) => document.activeElement === b ? "the button" : document.activeElement === document.body ? "body" : document.activeElement.tagName);
      check(`${w} ${label}: button usable again`, (await btn.isEnabled()) && bt.endsWith("삭제") && !bt.includes("중"), `'${bt}', focus on ${focused}`);
      if (label === "502 HTML") await row.screenshot({ path: `${out}/d1-error-${w}.png` });
      await page.unroute(url);
    }
    check(`${w} row still listed after the failures`, (await page.locator("ul.saved > li").count()) === rowsBefore && (await apiIds()).includes(id));

    // the real delete, slowed so the busy state can be seen; by keyboard (Space this time)
    await page.route(url, async (r) => { await new Promise((res) => setTimeout(res, 1200)); await r.continue(); });
    await btn.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    const busy = await btn.evaluate((b) => ({ text: b.textContent, disabled: b.disabled, ariaBusy: b.getAttribute("aria-busy") }));
    const alertGone = (await row.getByRole("alert").count()) === 0;
    check(`${w} busy state`, /삭제 중…/.test(busy.text) && busy.disabled && busy.ariaBusy === "true" && alertGone, JSON.stringify(busy) + ` alert cleared=${alertGone}`);
    await page.locator(`ul.saved > li`).filter({ hasText: names[0] }).waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
    await page.unroute(url);
    await page.waitForLoadState("networkidle");
    const rowsAfter = await page.locator("ul.saved > li").count();
    const idsAfter = await apiIds();
    check(`${w} row left the list, one fewer row`, rowsAfter === rowsBefore - 1, `${rowsBefore} -> ${rowsAfter}`);
    check(`${w} DB: id gone, others untouched`, !idsAfter.includes(id) && idsBefore.filter((x) => x !== id).every((x) => idsAfter.includes(x)), `before ${idsBefore.length} after ${idsAfter.length}`);
    const focus = await page.evaluate(() => { const a = document.activeElement; return a === document.body ? "body" : `${a.tagName}${a.id ? "#" + a.id : ""} '${(a.textContent ?? "").trim().slice(0, 30)}'`; });
    console.log(`info ${w} focus after the row is removed: ${focus}`);
    await page.screenshot({ path: `${out}/d1-after-delete-${w}.png`, fullPage: false });
    const again = await fetch(`${BASE}/api/party/${id}`, { method: "DELETE" });
    check(`${w} a second DELETE is 404`, again.status === 404);
    check(`${w} no page errors`, errors.length === 0, errors.join(" | "));
    await page.close();
  }
} catch (e) {
  check("run", false, e.stack);
} finally {
  for (const id of created) console.log(`cleanup party ${id}: ${(await fetch(`${BASE}/api/party/${id}`, { method: "DELETE" })).status}`);
  for (const n of names) console.log(`cleanup ${n}: ${(await fetch(`${BASE}/api/character/${encodeURIComponent(n)}`, { method: "DELETE" })).status}`);
  await browser.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");

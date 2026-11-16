// Fix round 1, D1/FN-1: /pocs/party request -> formation -> saved list -> delete, in the browser at 1440 and 375.
// Based on critic-design/scripts/party.mjs. Two tagged characters are imported through the API and removed at the end.
// Also checks the delete button's busy text, a server error (500) and an unreachable server in Korean.
// Usage: node party-delete.mjs [shots dir]
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const out = path.resolve(process.argv[2] ?? "/tmp/fix1/party");
mkdirSync(out, { recursive: true });
const tag = Date.now().toString(36).slice(-4);
const names = [`파티A${tag}`, `파티B${tag}`];
const store = (file, name) => {
  const sr = JSON.parse(readFileSync(`/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples/${file}`, "utf8"));
  sr.userApiData.info.character_name = name;
  return JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
};
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d !== "" ? `  | ${d}` : ""}`); if (!ok) fails++; };
const partyIds = new Set();
for (const [n, f] of [[names[0], "강은호.json"], [names[1], "아델.json"]]) {
  const r = await fetch(`${BASE}/api/character/import`, { method: "POST", headers: { "content-type": "application/json" }, body: store(f, n) });
  console.log(`     import ${n}: ${r.status}`);
}
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
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
    await page.locator(".panel-body > .msg").filter({ hasText: /편성했어요|못했어요/ }).waitFor({ timeout: 10000 }).catch(() => {});
    const fm = await page.locator(".panel-body > .msg").innerText().catch(() => "(none)");
    check(`${w} formation message`, /파티를 편성했어요/.test(fm), fm);
    const id = fm.match(/#(\d+)/)?.[1];
    if (id) partyIds.add(id);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const row = page.locator("ul.saved > li", { hasText: names[0] });
    check(`${w} saved list shows the new party`, (await row.count()) === 1);
    const del = row.getByRole("button", { name: `#${id} 익스트림 카링 파티 삭제`, exact: true });
    check(`${w} saved party has a delete button named "#${id} 익스트림 카링 파티 삭제"`, (await del.count()) === 1, `buttons in the row: ${await row.getByRole("button").count()}`);
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `saved-${w}.png`), fullPage: true });

    // Server error: Korean text from the API, the button comes back.
    await page.route(`**/api/party/${id}`, (r) => r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "파티를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요." }) }));
    await del.click();
    const err500 = await row.getByRole("alert").innerText({ timeout: 5000 }).catch(() => "(none)");
    check(`${w} 500 -> Korean error under the row`, err500 === "파티를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.", err500);
    check(`${w} 500 -> button usable again`, (await del.isEnabled()) && (await del.textContent()).endsWith(" 파티 삭제"), await del.textContent());
    await page.unroute(`**/api/party/${id}`);
    // Unreachable server: the shared offline text.
    await page.route(`**/api/party/${id}`, (r) => r.abort("failed"));
    await del.click();
    await page.waitForTimeout(300);
    const errOff = await row.getByRole("alert").innerText({ timeout: 5000 }).catch(() => "(none)");
    check(`${w} offline -> Korean error`, errOff === "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.", errOff);
    await row.screenshot({ path: path.join(out, `delete-error-${w}.png`) });
    await page.unroute(`**/api/party/${id}`);
    // Busy: hold the real request for a moment and read the button.
    let release;
    const held = new Promise((r) => (release = r));
    await page.route(`**/api/party/${id}`, async (r) => { await held; await r.continue(); });
    await del.click();
    const busyText = await row.getByRole("button", { name: `#${id} 익스트림 카링 파티 삭제 중…`, exact: true }).textContent({ timeout: 3000 }).catch(() => "(none)");
    const busyAttr = await row.locator("button[aria-busy=true]").count();
    check(`${w} busy -> "삭제 중…", disabled, aria-busy`, busyText.endsWith("삭제 중…") && busyAttr === 1 && (await row.locator("button:disabled").count()) === 1, busyText);
    check(`${w} the error line is cleared while it retries`, (await row.getByRole("alert").count()) === 0);
    release();
    await row.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
    check(`${w} after delete the party leaves the list`, (await page.locator("ul.saved > li", { hasText: names[0] }).count()) === 0);
    const api = await fetch(`${BASE}/api/party/${id}`, { method: "DELETE" });
    check(`${w} the party is gone on the server (DELETE again -> 404)`, api.status === 404, api.status);
    if (api.status === 404) partyIds.delete(id);
    check(`${w} no page errors`, errors.length === 0, errors.join(" | "));
    await page.close();
  }
} catch (e) {
  check("run", false, e.stack);
} finally {
  for (const id of partyIds) console.log(`     cleanup party ${id}: ${(await fetch(`${BASE}/api/party/${id}`, { method: "DELETE" })).status}`);
  for (const n of names) console.log(`     cleanup ${n}: ${(await fetch(`${BASE}/api/character/${encodeURIComponent(n)}`, { method: "DELETE" })).status}`);
  await browser.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");
process.exit(fails ? 1 : 0);

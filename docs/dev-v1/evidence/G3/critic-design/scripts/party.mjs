// Critic (design lens): /pocs/party request -> formation -> saved list -> delete, in the browser, 1440 and 375.
// Creates two tagged characters through the import API and removes them (requests cascade) and the party at the end.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const BASE = "http://localhost:3000";
const out = path.resolve(process.argv[2] ?? "/tmp/critic-design/party");
mkdirSync(out, { recursive: true });
const tag = Date.now().toString(36).slice(-4);
const names = [`파티A${tag}`, `파티B${tag}`];
const store = (file, name) => {
  const sr = JSON.parse(readFileSync(`/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples/${file}`, "utf8"));
  sr.userApiData.info.character_name = name;
  return JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
};
const log = [];
let fails = 0;
const check = (l, ok, d = "") => { log.push(`${ok ? "ok  " : "FAIL"} ${l}${d ? `  | ${d}` : ""}`); if (!ok) fails++; };
const partyIds = [];
for (const [n, f] of [[names[0], "강은호.json"], [names[1], "아델.json"]]) {
  const r = await fetch(`${BASE}/api/character/import`, { method: "POST", headers: { "content-type": "application/json" }, body: store(f, n) });
  log.push(`import ${n}: ${r.status}`);
}
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/pocs/party`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    if (true) {
      for (const n of names) {
        await page.selectOption("select[name=characterName]", n);
        await page.selectOption("select[name=bossId]", "extreme-kaling");
        await page.selectOption("select[name=partySize]", "2");
        await page.click("button:has-text('구직 등록')");
        await page.locator("form .msg").filter({ hasText: n }).waitFor({ timeout: 10000 }).catch(() => {});
        const m = await page.locator("form .msg").innerText().catch(() => "(none)");
        check(`request ${n}`, m.includes(n), m);
      }
      await page.screenshot({ path: path.join(out, `request-${w}.png`), fullPage: true });
      // duplicate request -> Korean error?
      await page.selectOption("select[name=characterName]", names[0]);
      await page.selectOption("select[name=bossId]", "extreme-kaling");
      await page.selectOption("select[name=partySize]", "2");
      await page.click("button:has-text('구직 등록')");
      await page.waitForTimeout(800);
      log.push(`     duplicate request message: ${await page.locator("form .msg").innerText().catch(() => "(none)")}`);
      await page.waitForLoadState("networkidle");
    }
    await page.selectOption("select[name=builderBossId]", "extreme-kaling");
    await page.selectOption("select[name=builderSize]", "2");
    await page.waitForTimeout(300);
    for (const n of names) await page.check(`input[aria-label="${n} 선택"]`);
    const sumLine = await page.locator(".sum-line").innerText();
    log.push(`     ${w} sum line: ${sumLine.replace(/\s+/g, " ")}`);
    await page.screenshot({ path: path.join(out, `picked-${w}.png`), fullPage: true });
    await page.click("button:has-text('파티 편성')");
    await page.locator(".panel-body > .msg").filter({ hasText: /편성했어요|못했어요/ }).waitFor({ timeout: 10000 }).catch(() => {});
    const fm = await page.locator(".panel-body > .msg").innerText().catch(() => "(none)");
    check(`${w} formation message`, /파티를 편성했어요/.test(fm), fm);
    const id = fm.match(/#(\d+)/)?.[1];
    if (id) partyIds.push(id);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const saved = page.locator("ul.saved > li", { hasText: names[0] });
    check(`${w} saved list shows the new party`, (await saved.count()) >= 1);
    await page.screenshot({ path: path.join(out, `saved-${w}.png`), fullPage: true });
    // a delete control for the saved party?
    const del = saved.first().locator("button, a, [role=button]");
    const delCount = await del.count();
    const anyDelete = await page.locator("section[aria-labelledby=saved-title]").getByRole("button").count();
    check(`${w} saved party has a delete control in the UI`, delCount > 0 || anyDelete > 0, `controls in the saved row: ${delCount}, buttons in 편성된 파티: ${anyDelete}`);
    check(`${w} no page errors`, errors.length === 0, errors.join(" | "));
    await page.close();
  }
} catch (e) {
  check("run", false, e.stack);
} finally {
  for (const id of partyIds) log.push(`cleanup party ${id}: ${(await fetch(`${BASE}/api/party/${id}`, { method: "DELETE" })).status}`);
  for (const n of names) log.push(`cleanup ${n}: ${(await fetch(`${BASE}/api/character/${encodeURIComponent(n)}`, { method: "DELETE" })).status}`);
  await browser.close();
}
log.push(fails ? `# ${fails} failed` : "# all passed");
writeFileSync(path.join(out, "party.txt"), log.join("\n") + "\n");
console.log(log.join("\n"));

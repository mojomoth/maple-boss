// D-2 scenario B on production: guide, real bookmarklet on a localhost mock page, persistence, paste fallback,
// delete modal (keyboard). Deletes what it creates (API bursts as a fallback). Never deletes seeds.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const BASE = "https://maple-boss-livid.vercel.app";
const OUT = process.argv[2];
const SAMPLES = new URL("../../../../../../research/samples/", import.meta.url).pathname;
const tag = Math.random().toString(36).slice(2, 7);
const A = `아델qa${tag}`; // bookmarklet
const B = `고딩qa${tag}`; // paste
const SEEDS = ["강은호", "아델", "고딩"];
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d ? "  " + d : ""}`); if (!ok) fails++; return ok; };
const store = (file, name) => {
  const sr = JSON.parse(readFileSync(SAMPLES + file, "utf8"));
  sr.userApiData.info.character_name = name;
  return JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
};
const storeA = store("아델.json", A);
const mock = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><title>mock maplescouter</title><p id="s">loading</p><a id="bm">run bookmark</a>
<script>localStorage.setItem("character-store", ${JSON.stringify(storeA).replace(/</g, "\\u003c")});document.getElementById("s").textContent="ready";</script>`);
});
await new Promise((r) => mock.listen(0, "localhost", r));
const MOCK = `http://localhost:${mock.address().port}`;
console.log(`# D-2 ${new Date().toISOString()} ${BASE}; mock maplescouter ${MOCK}; characters ${A} (bookmarklet), ${B} (paste)`);

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const apiLog = [];
page.on("response", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/")) apiLog.push(`${r.request().method()} ${decodeURIComponent(u.pathname)} ${r.status()}`); });
const cards = () => page.$$eval(".card-name", (els) => els.map((e) => e.textContent));
const apiList = async () => (await (await fetch(BASE + "/api/character")).json()).map((c) => c.name);

try {
  await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");
  check("storage notice shown on / (health persistent:false)", (await page.getByText("임시 저장소를 쓰고 있어요").count()) === 1);
  // 1. nickname -> guide
  await page.fill("#character-name", A);
  await page.click("button:has-text('추가')");
  const guide = page.locator("section.guide");
  await guide.waitFor({ timeout: 10000 });
  check("import guide appears for the nickname", (await guide.locator("h2").innerText()).includes(A), await guide.locator("h2").innerText());
  check("guide heading focused", await page.evaluate(() => document.activeElement?.id === "guide-title"));
  const step1 = guide.getByRole("link", { name: /maplescouter에서 결과 열기/ });
  const href1 = await step1.getAttribute("href");
  check("maplescouter link correct (new tab, noopener)", href1 === `https://maplescouter.com/ko/result?name=${encodeURIComponent(A)}` && (await step1.getAttribute("target")) === "_blank" && /noopener/.test(await step1.getAttribute("rel") ?? ""), href1);
  const bm = guide.getByRole("link", { name: "Maple Boss로 보내기" });
  const js = await bm.getAttribute("href");
  check("bookmarklet is javascript: for the production origin", js?.startsWith("javascript:") && decodeURIComponent(js).includes(JSON.stringify(BASE)), `${js?.length} chars`);
  await bm.click();
  check("clicking it on Maple Boss only shows the drag hint", page.url() === BASE + "/" && (await guide.getByText("북마크바로 끌어다 놓아 주세요").count()) === 1);
  if (OUT) await page.screenshot({ path: `${OUT}/d2-guide-1440.png` });

  // 2. the real bookmarklet on the localhost mock page: click a link carrying the exact javascript: URL
  await page.goto(`${MOCK}/ko/result?name=${encodeURIComponent(A)}`);
  await page.locator("#s", { hasText: "ready" }).waitFor();
  await page.evaluate((h) => document.getElementById("bm").setAttribute("href", h), js);
  const seen = [];
  page.on("framenavigated", (f) => f === page.mainFrame() && seen.push(f.url()));
  const t0 = Date.now();
  await Promise.all([page.waitForURL(BASE + "/", { timeout: 45000 }), page.click("#bm")]);
  await page.waitForLoadState("networkidle").catch(() => {});
  const landing = seen.find((u) => u.startsWith(`${BASE}/import#`));
  check("bookmarklet on localhost mock -> production /import#<payload> -> /", !!landing && seen.at(-1) === BASE + "/", `${Date.now() - t0} ms; ${seen.map((u) => u.slice(0, 70)).join(" -> ")}`);
  check("no hash left in the address bar", !new URL(page.url()).hash);
  console.log("# api calls so far:", apiLog.join(", "));
  const cardA = page.locator(".card-name", { hasText: A });
  await cardA.waitFor({ timeout: 15000 }).catch(() => {});
  const onPage = await cards();
  check(`card ${A} appears on / after the bookmarklet`, onPage.includes(A), `cards on /: ${onPage.join(",")}`);
  if (OUT) await page.screenshot({ path: `${OUT}/d2-after-bookmarklet-1440.png`, fullPage: true });
  // persistence: reloads and repeated requests
  let seenReload = 0;
  for (let i = 0; i < 10; i++) { await page.reload(); await page.waitForLoadState("domcontentloaded"); if ((await cards()).includes(A)) seenReload++; }
  check(`${A} survives 10 reloads of /`, seenReload === 10, `${seenReload}/10 reloads show it`);
  let seq = 0; for (let i = 0; i < 20; i++) if ((await apiList()).includes(A)) seq++;
  const par = (await Promise.all(Array.from({ length: 30 }, apiList))).filter((l) => l.includes(A)).length;
  check(`${A} in GET /api/character: 20 sequential + 30 parallel`, seq === 20 && par === 30, `sequential ${seq}/20, parallel ${par}/30`);

  // 3. paste fallback with another renamed sample
  await page.goto(BASE + "/"); await page.waitForLoadState("networkidle");
  await page.fill("#character-name", B);
  await page.click("button:has-text('추가')");
  await guide.waitFor();
  await guide.locator("summary", { hasText: "직접 붙여넣기" }).click();
  await page.fill("#paste-store", "{nope");
  await guide.getByRole("button", { name: "가져오기", exact: true }).click();
  const pasteMsg = page.locator("#paste-msg");
  await pasteMsg.filter({ hasText: /\S/ }).waitFor({ timeout: 20000 }).catch(() => {});
  check("paste non-JSON -> Korean error", /JSON 형식이 아니에요/.test(await pasteMsg.innerText()), await pasteMsg.innerText());
  await page.locator("#paste-store").fill(store("고딩.json", B));
  apiLog.length = 0;
  await guide.getByRole("button", { name: "가져오기", exact: true }).click();
  await guide.waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
  console.log("# api calls for paste:", apiLog.join(", "));
  const addMsg = await page.locator("#add-msg").innerText();
  check("paste confirmation under the field", addMsg.includes(`‘${B}’ 캐릭터를 가져왔어요.`), addMsg);
  const onPage2 = await cards();
  check(`card ${B} appears on / after paste`, onPage2.includes(B), `cards: ${onPage2.join(",")}`);
  if (OUT) await page.screenshot({ path: `${OUT}/d2-after-paste-1440.png`, fullPage: true });
  let seenReload2 = 0;
  for (let i = 0; i < 10; i++) { await page.reload(); await page.waitForLoadState("domcontentloaded"); if ((await cards()).includes(B)) seenReload2++; }
  check(`${B} survives 10 reloads of /`, seenReload2 === 10, `${seenReload2}/10`);
  let seq2 = 0; for (let i = 0; i < 20; i++) if ((await apiList()).includes(B)) seq2++;
  const par2 = (await Promise.all(Array.from({ length: 30 }, apiList))).filter((l) => l.includes(B)).length;
  check(`${B} in GET /api/character: 20 sequential + 30 parallel`, seq2 === 20 && par2 === 30, `sequential ${seq2}/20, parallel ${par2}/30`);

  // 4. delete via the modal (keyboard) for each created character that is on /; otherwise exercise the modal on a seed and CANCEL
  await page.goto(BASE + "/"); await page.waitForLoadState("networkidle");
  const present = (await cards()).filter((n) => n === A || n === B);
  const target = present[0] ?? "강은호";
  const isSeed = SEEDS.includes(target);
  console.log(`# modal keyboard test on ${target}${isSeed ? " (seed: Esc/cancel only, never confirm)" : ""}`);
  const card = page.locator("button.card", { has: page.locator(".card-name", { hasText: target }) }).first();
  await card.focus();
  await page.keyboard.press("Enter");
  const dlg = page.locator("dialog.confirm[open]");
  await dlg.waitFor({ timeout: 5000 });
  const focus = () => page.evaluate(() => { const a = document.activeElement; return { inDialog: !!a?.closest("dialog[open]"), text: (a?.getAttribute("aria-label") || a?.textContent || a?.tagName || "").trim().slice(0, 20) }; });
  let f = await focus();
  check("modal opens with focus on 취소", f.inDialog && f.text === "취소", JSON.stringify(f));
  if (OUT) await page.screenshot({ path: `${OUT}/d2-modal-1440.png` });
  const ring = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); ring.push(await focus()); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Shift+Tab"); ring.push(await focus()); }
  check("Tab / Shift+Tab never leave the dialog for page content", ring.every((r) => r.inDialog || r.text === "BODY" || r.text === "HTML"), ring.map((r) => `${r.inDialog ? "in" : "OUT"}:${r.text}`).join(" > "));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), focus: document.activeElement?.querySelector?.(".card-name")?.textContent ?? document.activeElement?.tagName }));
  check("Esc closes the modal and focus returns to the card", !after.open && after.focus === target, JSON.stringify(after));
  // backdrop click closes too
  await page.keyboard.press("Enter"); await dlg.waitFor();
  await page.mouse.click(5, 5); await page.waitForTimeout(300);
  check("backdrop click closes the modal", !(await page.locator("dialog[open]").count()));
  // 취소 via keyboard
  await card.focus(); await page.keyboard.press("Enter"); await dlg.waitFor();
  await page.keyboard.press("Enter"); await page.waitForTimeout(300); // focus is on 취소
  check("Enter on 취소 closes without deleting", !(await page.locator("dialog[open]").count()) && (await cards()).includes(target));
  if (!isSeed) {
    for (const name of present) {
      const c = page.locator("button.card", { has: page.locator(".card-name", { hasText: name }) }).first();
      await c.focus(); await page.keyboard.press("Enter"); await dlg.waitFor();
      await page.keyboard.press("Tab"); // -> 삭제
      const fd = await focus();
      check(`Tab from 취소 reaches 삭제 (${name})`, fd.text === "삭제", fd.text);
      await page.keyboard.press("Enter");
      await page.locator("dialog[open]").waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const left = await cards();
      const fa = await page.evaluate(() => document.activeElement?.id);
      check(`${name} deleted via the modal, focus on 내 캐릭터 heading`, !left.includes(name) && fa === "chars-title", `cards ${left.join(",")}; focus ${fa}`);
    }
  }
  check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 400));
} catch (e) {
  check("run", false, e.stack ?? String(e));
} finally {
  // API cleanup: parallel DELETE bursts (instances keep their own /tmp copies)
  for (const n of [A, B]) {
    const st = await Promise.all(Array.from({ length: 60 }, async () => (await fetch(BASE + "/api/character/" + encodeURIComponent(n), { method: "DELETE" })).status));
    const c = {}; for (const s of st) c[s] = (c[s] ?? 0) + 1;
    console.log(`# cleanup DELETE burst ${n}: ${JSON.stringify(c)}`);
  }
  const left = (await Promise.all(Array.from({ length: 30 }, apiList))).filter((l) => l.includes(A) || l.includes(B)).length;
  console.log(`# after cleanup: ${left}/30 parallel GETs still list ${A} or ${B}`);
  const seedsOk = (await apiList());
  console.log(`# seeds present: ${SEEDS.every((s) => seedsOk.includes(s))}`);
  await browser.close(); mock.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");

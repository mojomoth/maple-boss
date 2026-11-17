// Recheck 1, D-2 scenario B + P1-1 on production. Guide, real bookmarklet on a localhost mock page, /import result,
// persistence (recorded), paste fallback, truthfulness of every success line vs what the screen then shows,
// delete modal (keyboard) on a created card if any is on /, else on a seed with Esc/cancel only (never confirm).
//   node d2r.mjs <shots dir> [viewport width]
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const BASE = "https://maple-boss-livid.vercel.app";
const OUT = process.argv[2];
const W = Number(process.argv[3] ?? 1440);
const H = W < 600 ? 812 : 900;
const SAMPLES = new URL("../../../../../../research/samples/", import.meta.url).pathname;
const tag = Math.random().toString(36).slice(2, 7);
const A = `아델qa${tag}`; // bookmarklet
const B = `고딩qa${tag}`; // paste
const SEEDS = ["강은호", "아델", "고딩"];
const NOTICE = "임시 저장소를 쓰고 있어요";
let fails = 0;
const check = (l, ok, d = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${l}${d ? "  " + d : ""}`); if (!ok) fails++; return ok; };
const info = (l) => console.log(`info ${l}`);
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
const health = await (await fetch(BASE + "/api/health")).json();
console.log(`# D-2/P1-1 recheck ${new Date().toISOString()} ${BASE} @${W}; health ${JSON.stringify(health)}; mock ${MOCK}; characters ${A} (bookmarklet), ${B} (paste)`);

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: "ko-KR", colorScheme: "dark" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const apiLog = [];
page.on("response", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/")) apiLog.push(`${r.request().method()} ${decodeURIComponent(u.pathname)} ${r.status()}`); });
const cards = () => page.$$eval(".card-name", (els) => els.map((e) => e.textContent));
const apiList = async () => (await (await fetch(BASE + "/api/character")).json()).map((c) => c.name);
const noticeText = () => page.evaluate((n) => [...document.querySelectorAll("p")].map((p) => p.textContent).filter((t) => t.includes(n)), NOTICE);
const shot = async (name, full = false) => { if (OUT) await page.screenshot({ path: `${OUT}/${name}-${W}.png`, fullPage: full }); };

try {
  await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");
  const n0 = await noticeText();
  check("/ shows the temporary-storage notice once (health persistent:false)", health.persistent === false && n0.length === 1, n0.join(" | "));
  check("notice says imports and requests/parties usually do not show up", /가져온 캐릭터와 등록한 구직·파티는 보통 화면에 나오지 않/.test(n0[0] ?? ""), n0[0]);
  // 1. nickname -> guide
  await page.fill("#character-name", A);
  await page.click("button:has-text('추가')");
  const guide = page.locator("section.guide");
  await guide.waitFor({ timeout: 10000 });
  check("import guide appears for the nickname", (await guide.locator("h2").innerText()).includes(A), await guide.locator("h2").innerText());
  check("guide heading focused", await page.evaluate(() => document.activeElement?.id === "guide-title"));
  const gtext = (await guide.innerText()).replace(/\s+/g, " ");
  const help = await guide.locator(".section-help").first().innerText();
  check("guide help line warns that imports usually do not show (no '카드가 생겨요' promise)", /임시 저장소/.test(help) && /보통 화면에 나오지 않/.test(help) && !gtext.includes("카드가 생겨요"), help);
  const step1 = guide.getByRole("link", { name: /maplescouter에서 결과 열기/ });
  const href1 = await step1.getAttribute("href");
  check("maplescouter link correct (new tab, noopener)", href1 === `https://maplescouter.com/ko/result?name=${encodeURIComponent(A)}` && (await step1.getAttribute("target")) === "_blank" && /noopener/.test(await step1.getAttribute("rel") ?? ""), href1);
  const bm = guide.getByRole("link", { name: "Maple Boss로 보내기" });
  const js = await bm.getAttribute("href");
  check("bookmarklet is javascript: for the production origin", js?.startsWith("javascript:") && decodeURIComponent(js).includes(JSON.stringify(BASE)), `${js?.length} chars`);
  await bm.click();
  check("clicking it on Maple Boss only shows the drag hint", page.url() === BASE + "/" && (await guide.getByText("북마크바로 끌어다 놓아 주세요").count()) === 1);
  await shot("d2-guide");

  // 2. the real bookmarklet on the localhost mock page
  await page.goto(`${MOCK}/ko/result?name=${encodeURIComponent(A)}`);
  await page.locator("#s", { hasText: "ready" }).waitFor();
  await page.evaluate((h) => document.getElementById("bm").setAttribute("href", h), js);
  const seen = [];
  page.on("framenavigated", (f) => f === page.mainFrame() && seen.push(f.url()));
  const t0 = Date.now();
  apiLog.length = 0;
  await page.click("#bm");
  const status = page.locator("[role=status]", { hasText: /가져왔어요|가져오지 못했|없어요|깨져/ });
  await status.waitFor({ timeout: 45000 });
  await page.waitForTimeout(2500); // would it move on by itself?
  const landing = seen.find((u) => u.startsWith(`${BASE}/import#`));
  const res1 = await status.innerText();
  check("bookmarklet on localhost mock -> production /import#<payload>", !!landing, `${Date.now() - t0} ms; ${seen.map((u) => u.slice(0, 60)).join(" -> ")}`);
  check("no hash left in the address bar", !new URL(page.url()).hash, page.url());
  console.log("# api calls:", apiLog.join(", "));
  check("/import result says imported AND that / usually will not show it", res1 === `‘${A}’ 캐릭터를 가져왔어요. 임시 저장소라 메인 화면에는 보통 안 나와요.`, res1);
  check("/import stays (no auto-redirect that would hide the message)", new URL(page.url()).pathname === "/import", page.url());
  const back = page.getByRole("link", { name: "메인 화면으로" });
  check("/import offers the way back ('메인 화면으로')", (await back.count()) === 1);
  await shot("d2-import-result");
  await back.click();
  await page.waitForURL(BASE + "/", { timeout: 20000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  const cardA = page.locator(".card-name", { hasText: A });
  await cardA.waitFor({ timeout: 8000 }).catch(() => {});
  const onPage = await cards();
  const shownA = onPage.includes(A);
  const nA = await noticeText();
  check(`/ after /import: card ${A} shown, or the notice explains why not`, shownA || nA.length === 1, `card shown ${shownA}; cards ${onPage.join(",")}`);
  let seenReload = 0;
  for (let i = 0; i < 10; i++) { await page.reload(); await page.waitForLoadState("domcontentloaded"); if ((await cards()).includes(A)) seenReload++; }
  info(`${A}: on / in ${seenReload}/10 reloads (B1: expected 0 / unstable)`);
  let seq = 0; for (let i = 0; i < 10; i++) if ((await apiList()).includes(A)) seq++;
  const par = (await Promise.all(Array.from({ length: 30 }, apiList))).filter((l) => l.includes(A)).length;
  info(`${A}: GET /api/character sequential ${seq}/10, parallel ${par}/30`);

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
  check("paste line says imported AND that the card usually will not show", addMsg === `‘${B}’ 캐릭터를 가져왔어요. 임시 저장소라 카드는 보통 안 나와요.`, addMsg);
  const onPage2 = await cards();
  const shownB = onPage2.includes(B);
  check(`/ after paste: card ${B} shown, or the screen explains why not`, shownB || /보통 안 나와요/.test(addMsg), `card shown ${shownB}; cards ${onPage2.join(",")}`);
  await shot("d2-after-paste", true);
  let seenReload2 = 0;
  for (let i = 0; i < 10; i++) { await page.reload(); await page.waitForLoadState("domcontentloaded"); if ((await cards()).includes(B)) seenReload2++; }
  info(`${B}: on / in ${seenReload2}/10 reloads (B1: expected 0 / unstable)`);

  // 4. delete modal (keyboard)
  await page.goto(BASE + "/"); await page.waitForLoadState("networkidle");
  const present = (await cards()).filter((n) => n === A || n === B);
  const target = present[0] ?? "강은호";
  const isSeed = SEEDS.includes(target);
  console.log(`# modal keyboard test on ${target}${isSeed ? " (seed: Esc/cancel/X only, never confirm; created cards are not on / -> modal delete of them blocked by B1)" : ""}`);
  const card = page.locator("button.card", { has: page.locator(".card-name", { hasText: target }) }).first();
  await card.focus();
  await page.keyboard.press("Enter");
  const dlg = page.locator("dialog.confirm[open]");
  await dlg.waitFor({ timeout: 5000 });
  const focus = () => page.evaluate(() => { const a = document.activeElement; return { inDialog: !!a?.closest("dialog[open]"), text: (a === document.body || a === document.documentElement ? a.tagName : a?.getAttribute("aria-label") || a?.textContent || a?.tagName || "").trim().slice(0, 20) }; });
  let f = await focus();
  check("modal opens with focus on 취소", f.inDialog && f.text === "취소", JSON.stringify(f));
  check("dialog is modal with a title", await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return d.matches(":modal") && !!document.getElementById(d.getAttribute("aria-labelledby"))?.textContent; }));
  await shot("d2-modal");
  const ring = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); ring.push(await focus()); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Shift+Tab"); ring.push(await focus()); }
  // BODY = native modal <dialog> handing focus to the browser chrome between cycles; page content stays inert.
  check("Tab / Shift+Tab never reach page content behind the modal", ring.every((r) => r.inDialog || r.text === "BODY" || r.text === "HTML"), ring.map((r) => `${r.inDialog ? "in" : "OUT"}:${r.text}`).join(" > "));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), focus: document.activeElement?.querySelector?.(".card-name")?.textContent ?? document.activeElement?.tagName }));
  check("Esc closes the modal and focus returns to the card", !after.open && after.focus === target, JSON.stringify(after));
  await page.keyboard.press("Enter"); await dlg.waitFor();
  await page.keyboard.press("Shift+Tab"); // -> X
  const fx = await focus();
  await page.keyboard.press("Enter"); await page.waitForTimeout(300);
  const afterX = await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), focus: document.activeElement?.querySelector?.(".card-name")?.textContent ?? document.activeElement?.tagName }));
  check("X (닫기) by keyboard closes, focus back on the card", fx.text === "닫기" && !afterX.open && afterX.focus === target, `${fx.text} ${JSON.stringify(afterX)}`);
  await page.keyboard.press("Enter"); await dlg.waitFor();
  await page.mouse.click(5, 5); await page.waitForTimeout(300);
  check("backdrop click closes the modal", !(await page.locator("dialog[open]").count()));
  await card.focus(); await page.keyboard.press("Enter"); await dlg.waitFor();
  await page.keyboard.press("Enter"); await page.waitForTimeout(300); // focus is on 취소
  check("Enter on 취소 closes without deleting", !(await page.locator("dialog[open]").count()) && (await cards()).includes(target));
  if (!isSeed) {
    for (const name of present) {
      const c = page.locator("button.card", { has: page.locator(".card-name", { hasText: name }) }).first();
      await c.focus(); await page.keyboard.press("Enter"); await dlg.waitFor();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await page.locator("dialog[open]").waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const left = await cards();
      check(`${name} deleted via the modal`, !left.includes(name), left.join(","));
    }
  }
  check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 400));
} catch (e) {
  check("run", false, e.stack ?? String(e));
} finally {
  for (const n of [A, B]) {
    const st = await Promise.all(Array.from({ length: 60 }, async () => (await fetch(BASE + "/api/character/" + encodeURIComponent(n), { method: "DELETE" })).status));
    const c = {}; for (const s of st) c[s] = (c[s] ?? 0) + 1;
    console.log(`# cleanup DELETE burst ${n}: ${JSON.stringify(c)}`);
  }
  const left = (await Promise.all(Array.from({ length: 30 }, apiList))).filter((l) => l.includes(A) || l.includes(B)).length;
  console.log(`# after cleanup: ${left}/30 parallel GETs still list ${A} or ${B}`);
  const seedsOk = await apiList();
  console.log(`# seeds present: ${SEEDS.every((s) => seedsOk.includes(s))}`);
  await browser.close(); mock.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");

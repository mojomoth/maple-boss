import { BASE, OUT, launch, check, failures, payload, importApi, del } from "./lib.mjs";
const T = Date.now().toString(36).slice(-3);
const A = `가나다라마${T.slice(0,1)}`, B = `검증표${T}`; const made = [];
for (const [n, r] of [[A, 0.7], [B, 0.4]]) { const [s] = await importApi(payload(n, [["카링", "Extreme", r]])); if (s === 201) made.push(n); }
for (const n of made) await fetch(`${BASE}/api/party/requests`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ characterName: n, bossId: "extreme-kaling", partySize: 6 }) });
const browser = await launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "ko-KR" });
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${BASE}/pocs/party`);
  const b = page.locator("section", { hasText: "보스별 구직 현황" });
  await b.locator("select[name=builderBossId]").selectOption("extreme-kaling");
  await b.getByLabel(`${A} 선택`).check(); await b.getByLabel(`${B} 선택`).check();
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  await b.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/pocs-party-builder-375.png` });
  check("/pocs/party builder table at 375: no page overflow", sw <= 375, sw);
  await page.goto(`${BASE}/pocs/character`); await page.getByRole("button", { name: /강은호/ }).click(); await page.getByText(/보스 배율 \(60\)/).waitFor();
  const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: `${OUT}/pocs-character-detail-375.png` });
  check("/pocs/character detail at 375: no page overflow", sw2 <= 375, sw2);
  await ctx.close();
  // home boss search with keyboard (F2 on /)
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  const p = await c2.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/");
  await p.locator("#boss-q").fill("노말 카링"); await p.keyboard.press("Enter");
  await p.locator(".boss-name h3", { hasText: "카링" }).waitFor(); await p.waitForFunction(() => document.querySelector(".boss-name .badge")?.textContent === "노말", null, { timeout: 10000 }).catch(() => {});
  const stats = await p.locator("dl.stats").innerText();
  const focusKept = await p.evaluate(() => document.activeElement?.id);
  check("/ boss search '노말 카링' + Enter: 노말 카링 shown with stats; URL clean; focus kept", (await p.locator(".boss-name .badge").innerText()) === "노말" && /레벨\s*285/.test(stats) && /최대 인원\s*6명/.test(stats) && /\?boss=normal-kaling$/.test(p.url()) && focusKept === "boss-q", `${p.url()} focus=${focusKept} ${stats.replace(/\n/g, " ")}`);
  check("boss image loads", await p.locator(".boss-stage img").evaluate((i) => i.complete && i.naturalWidth > 0));
  await p.locator("#boss-q").fill("없는보스"); await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.getElementById("boss-msg")?.textContent.trim(), null, { timeout: 10000 }).catch(() => {});
  check("/ boss search miss: Korean message + aria-invalid, previous boss kept", /‘없는보스’에 맞는 보스가 없어요/.test(await p.locator("#boss-msg").innerText()) && (await p.getAttribute("#boss-q", "aria-invalid")) === "true" && (await p.locator(".boss-name .badge").innerText()) === "노말", await p.locator("#boss-msg").innerText());
  await p.locator("#boss-q").fill("검은마법사"); await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.querySelector(".boss-name h3")?.textContent.includes("검은"), null, { timeout: 10000 }).catch(() => {});
  check("/ alias search '검은마법사' resolves", (await p.locator(".boss-name h3").innerText()).includes("검은 마법사"), await p.locator(".boss-name").innerText());
  // datalist pick (simulate typing an exact label) auto-submits
  await p.locator("#boss-q").fill(""); await p.locator("#boss-q").pressSequentially("익스트림 카링");
  await p.waitForURL(/boss=extreme-kaling/, { timeout: 10000 }).catch(() => {});
  check("exact label input auto-submits", /boss=extreme-kaling/.test(p.url()), p.url());
  // footer nav to PoCs
  for (const [name, path] of [["캐릭터 등록", "/pocs/character"], ["보스 조회", "/pocs/boss"], ["파티 편성", "/pocs/party"]]) {
    await p.goto(BASE + "/"); await p.getByRole("navigation", { name: "PoC 화면" }).getByRole("link", { name }).click(); await p.waitForURL(BASE + path);
    check(`footer link ${name} -> ${path}`, p.url() === BASE + path);
  }
  check("no page errors", errs.length === 0, errs.join(" | "));
} catch (e) { check("run", false, e.stack); }
finally { for (const n of made) check(`cleanup ${n}`, (await del(n)) === 204); await browser.close(); }
console.log(failures() ? `# ${failures()} failed` : "# all passed");

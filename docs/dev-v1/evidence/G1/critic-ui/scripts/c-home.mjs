import { createServer } from "node:http";
import { BASE, OUT, launch, check, failures, sample, payload, importApi, del } from "./lib.mjs";
const T = Date.now().toString(36).slice(-3);
const BM = `검증북마${T}`, PS = `검증붙임${T}`, PS2 = `검증상태${T}`, PS3 = `검증결과${T}`, DM = `검증삭제${T}`;
const made = new Set();
const storeOf = (file, name, wrap = "store") => { const sr = sample(file); sr.userApiData.info.character_name = name; const st = { searchResult: sr, isLoading: false, error: null }; return wrap === "store" ? JSON.stringify({ state: st, version: 0 }) : wrap === "state" ? JSON.stringify(st) : JSON.stringify(sr); };
const placeholderStore = () => { const sr = sample("아델.json"); sr.userApiData.info.character_name = "으낭다"; sr.calculatedData.bossCuts = []; return JSON.stringify({ state: { searchResult: sr }, version: 0 }); };

// mock maplescouter: /with sets the store, /placeholder sets 으낭다, /none sets nothing
const stores = { with: storeOf("아델.json", BM), placeholder: placeholderStore() };
const mock = createServer((req, res) => {
  const kind = req.url.split("?")[0].slice(1);
  const set = stores[kind] ? `localStorage.setItem("character-store", ${JSON.stringify(stores[kind]).replace(/</g, "\\u003c")});` : `localStorage.removeItem("character-store");`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><title>mock maplescouter</title><p id="s">loading</p><script>${set}document.getElementById("s").textContent="ready";</script>`);
});
await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const MOCK = `http://127.0.0.1:${mock.address().port}`;
const browser = await launch();
const focusInfo = (page) => page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return "body"; const cs = getComputedStyle(a); return `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}${a.className && typeof a.className === "string" ? "." + a.className.split(" ").join(".") : ""} [${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 20)}] outline=${cs.outlineStyle}/${cs.outlineWidth} shadow=${cs.boxShadow !== "none"}`; });
const POST501 = (r) => r.request().method() === "POST" ? r.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ error: "이 서버에서는 닉네임으로 바로 불러올 수 없어요. maplescouter 결과 페이지에서 가져와 주세요.", importUrl: "x" }) }) : r.continue();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  const posted = []; page.on("request", (r) => r.url().endsWith("/api/character") && r.method() === "POST" && posted.push(r.postData()));
  await page.goto(BASE + "/");
  // tab order + focus ring
  const order = [];
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); order.push(await focusInfo(page)); }
  console.log("     tab order:\n       " + order.join("\n       "));
  check("tab order starts logo -> nickname -> 추가 -> boss search -> 보스 찾기 -> cards", /^a /.test(order[0]) && order[1].includes("#character-name") && order[2].includes("추가") && order[3].includes("#boss-q") && order[4].includes("보스 찾기") && order[5].includes("button.card"));
  check("every tab stop has a visible focus indicator", order.every((o) => !/outline=none/.test(o) || /shadow=true/.test(o)), order.filter((o) => /outline=none/.test(o) && !/shadow=true/.test(o)).join(" ; "));
  // whitespace-only nickname
  await page.fill("#character-name", "   "); await page.press("#character-name", "Enter");
  const m0 = await page.locator("#add-msg").innerText();
  check("spaces-only nickname: Korean error, aria-invalid, no request", /닉네임을 입력해 주세요/.test(m0) && (await page.getAttribute("#character-name", "aria-invalid")) === "true" && posted.length === 0, m0);
  // empty: native required blocks
  await page.fill("#character-name", ""); await page.press("#character-name", "Enter");
  check("empty nickname: native required blocks submit", posted.length === 0 && (await page.evaluate(() => !document.getElementById("character-name").validity.valid)));
  // crawler unavailable (501, intercepted so the local crawler is not spawned) -> guide, not an error
  await page.route("**/api/character", POST501);
  await page.fill("#character-name", PS); await page.press("#character-name", "Enter");
  const guide = page.locator("section.guide"); await guide.waitFor({ timeout: 10000 });
  check("501 -> guide opens (no error under the field)", (await guide.locator("h2").innerText()).includes(PS) && !(await page.locator("#add-msg").innerText()).trim(), await page.locator("#add-msg").innerText());
  check("guide heading focused", (await focusInfo(page)).includes("#guide-title"));
  const g = [];
  for (let i = 0; i < 5; i++) { await page.keyboard.press("Tab"); g.push(await focusInfo(page)); }
  console.log("     guide tab order:\n       " + g.join("\n       "));
  check("guide tab order: close -> step1 link -> bookmarklet -> summary", g[0].includes("가져오기 안내 닫기") && g[1].includes("maplescouter에서 결과 열기") && g[2].includes("Maple Boss로 보내기") && g[3].startsWith("summary"), "");
  const step1 = guide.getByRole("link", { name: /maplescouter에서 결과 열기/ });
  check("step 1 href/target/rel", (await step1.getAttribute("href")) === `https://maplescouter.com/ko/result?name=${encodeURIComponent(PS)}` && (await step1.getAttribute("target")) === "_blank" && /noopener/.test(await step1.getAttribute("rel")), await step1.getAttribute("href"));
  const js = await guide.getByRole("link", { name: "Maple Boss로 보내기" }).getAttribute("href");
  check("bookmarklet href is javascript: with this origin", js?.startsWith("javascript:") && decodeURIComponent(js).includes(JSON.stringify(BASE)), `${js?.length} chars`);
  await guide.getByRole("link", { name: "Maple Boss로 보내기" }).focus(); await page.keyboard.press("Enter"); // Enter on the bookmarklet in the guide
  check("Enter on bookmarklet here shows the drag hint and stays on /", page.url() === BASE + "/" && (await guide.getByText("북마크바로 끌어다 놓아 주세요").count()) === 1, page.url());
  await page.screenshot({ path: `${OUT}/guide-1440.png` });
  // paste fallback via keyboard
  await guide.locator("summary").focus(); await page.keyboard.press("Enter");
  check("summary opens with Enter", await guide.locator("details").evaluate((d) => d.open));
  const pasteBtn = guide.getByRole("button", { name: "가져오기", exact: true });
  const pasteMsg = page.locator("#paste-msg");
  for (const [what, text, re] of [["empty", "  ", /붙여 넣은 값이 없어요/], ["bad JSON", "{nope", /JSON 형식이 아니에요/], ["wrong shape", '{"a":1}', /캐릭터 데이터가 아니에요/], ["placeholder 으낭다", placeholderStore(), /으낭다/], ["> 1 MB", JSON.stringify({ v: 1, pad: "x".repeat(1_100_000) }), /너무 커요/]]) {
    await page.locator("#paste-store").fill(text); await pasteBtn.click();
    await page.waitForFunction(() => document.getElementById("paste-msg")?.textContent.trim(), null, { timeout: 15000 }).catch(() => {});
    const t = await pasteMsg.innerText();
    check(`paste ${what}: Korean error shown, aria-invalid`, re.test(t) && (await page.getAttribute("#paste-store", "aria-invalid")) === "true", t);
    await page.evaluate(() => (document.getElementById("paste-msg").textContent = "")); // not React state; just to detect the next message
  }
  // the screen reader-hidden emptiness: does an error clear on next attempt? (React state) - fine
  await page.locator("#paste-store").fill(storeOf("고딩.json", PS)); await pasteBtn.click();
  await guide.waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
  const cardPS = page.locator(".card-name", { hasText: PS }); await cardPS.waitFor({ timeout: 15000 }).catch(() => {});
  if (check("paste full store -> guide closes, card appears", (await cardPS.count()) === 1 && (await guide.count()) === 0)) made.add(PS);
  check("…confirmation under the field", (await page.locator("#add-msg").innerText()).includes(`‘${PS}’ 캐릭터를 가져왔어요.`), await page.locator("#add-msg").innerText());
  console.log("     focus after paste import: " + (await focusInfo(page)));
  // state and searchResult shapes via paste
  for (const [n, wrap] of [[PS2, "state"], [PS3, "searchResult"]]) {
    await page.fill("#character-name", n); await page.press("#character-name", "Enter"); await guide.waitFor();
    await guide.locator("summary").click(); await page.locator("#paste-store").fill(storeOf("강은호.json", n, wrap)); await pasteBtn.click();
    const c = page.locator(".card-name", { hasText: n }); await c.waitFor({ timeout: 15000 }).catch(() => {});
    if (check(`paste ${wrap} -> card`, (await c.count()) === 1)) made.add(n);
  }
  // close button returns focus to the nickname input
  await page.fill("#character-name", "닫기테스트"); await page.press("#character-name", "Enter"); await guide.waitFor();
  await guide.getByRole("button", { name: "가져오기 안내 닫기" }).click();
  check("close guide -> focus back on nickname input", (await focusInfo(page)).includes("#character-name") && (await guide.count()) === 0);
  await page.unroute("**/api/character");
  // 375 guide
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/api/character", POST501);
  await page.fill("#character-name", PS); await page.press("#character-name", "Enter"); await guide.waitFor();
  await guide.locator("summary").click();
  const ov = await page.evaluate(() => document.documentElement.scrollWidth);
  await guide.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/guide-375.png`, fullPage: true });
  check("guide at 375: no horizontal page overflow", ov <= 375, ov);
  await page.unroute("**/api/character");
  await page.setViewportSize({ width: 1440, height: 900 });

  // bookmarklet: real javascript: link click on the mock maplescouter page
  const runBm = async (kind) => {
    await page.goto(`${MOCK}/${kind}?name=x`); await page.locator("#s", { hasText: "ready" }).waitFor();
    await page.evaluate((href) => { const a = document.createElement("a"); a.id = "bm"; a.href = href; a.textContent = "bm"; document.body.append(a); }, js);
    let alertText = null; const onD = (d) => { alertText = d.message(); d.accept(); }; page.once("dialog", onD);
    const seen = []; const onN = (f) => f === page.mainFrame() && seen.push(f.url()); page.on("framenavigated", onN);
    await page.click("#bm");
    await page.waitForTimeout(kind === "with" ? 0 : 1500);
    if (kind !== "none") await page.waitForURL((u) => u.href.startsWith(BASE), { timeout: 15000 }).catch(() => {});
    if (kind === "with") await page.waitForURL(BASE + "/", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1000);
    page.off("framenavigated", onN); page.off("dialog", onD);
    return { alertText, seen };
  };
  let r = await runBm("with");
  const landing = r.seen.find((u) => u.startsWith(`${BASE}/import#`));
  check("bookmarklet on mock page -> /import#payload -> /", !!landing && page.url() === BASE + "/", r.seen.map((u) => u.slice(0, 50)).join(" -> "));
  check("fragment payload is trimmed (< 64 KB)", !!landing && landing.length < 64000, landing?.length);
  const cardBM = page.locator(".card-name", { hasText: BM }); await cardBM.waitFor({ timeout: 15000 }).catch(() => {});
  if (check(`card ${BM} on / after bookmarklet`, (await cardBM.count()) === 1)) made.add(BM);
  check("no hash left in URL", !new URL(page.url()).hash, page.url());
  const hist = await page.evaluate(() => history.length);
  await cardBM.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/after-bookmarklet-1440.png` });
  const ratesBM = await (await fetch(`${BASE}/api/character/rates?name=${encodeURIComponent(BM)}`)).json();
  check("bookmarklet-imported char has 60 rates", ratesBM.length === 60, ratesBM.length);
  // back button after import: does it land on /import and re-run? (payload removed by replaceState)
  await page.goBack().catch(() => {}); await page.waitForTimeout(1500);
  const backUrl = page.url(); const backMsg = await page.locator(".empty-title").innerText().catch(() => "");
  console.log(`     history.length=${hist}; after Back: ${backUrl.slice(0, 80)} msg=${backMsg}`);
  check("Back after import does not show an error page", !/is-error/.test(await page.locator(".empty-title").getAttribute("class").catch(() => "")) , `${backUrl} ${backMsg}`);
  r = await runBm("none");
  check("bookmarklet on page without store: Korean alert, no navigation", /Maple Boss로 보내지 못했어요/.test(r.alertText ?? "") && page.url().startsWith(MOCK), r.alertText);
  r = await runBm("placeholder");
  await page.locator(".empty-title.is-error").waitFor({ timeout: 15000 }).catch(() => {});
  const ph = await page.locator(".empty-title").innerText().catch(() => "");
  check("bookmarklet with 으낭다 placeholder store -> /import shows Korean error", /으낭다/.test(ph), `${page.url()} ${ph}`);

  // /import error states
  const big = encodeURIComponent(JSON.stringify({ v: 1, pad: "x".repeat(1_100_000) }));
  for (const [what, hash, re] of [["empty hash", "", /가져올 데이터가 없어요/], ["bare #", "#", /가져올 데이터가 없어요/], ["bad JSON", "#" + encodeURIComponent("{nope"), /깨져 있어요/], ["bad percent-encoding", "#%E0%A4%A", /깨져 있어요/], ["wrong shape 400", "#" + encodeURIComponent('{"v":1}'), /캐릭터 데이터가 아니에요/], ["> 1 MB 413", "#" + big, /너무 커요/]]) {
    await page.goto("about:blank"); await page.goto(`${BASE}/import${hash}`);
    const m = page.locator(".empty-title.is-error"); await m.waitFor({ timeout: 20000 }).catch(() => {});
    const t = (await m.count()) ? await m.innerText() : "(no error)";
    const back = page.getByRole("link", { name: "메인 화면으로" });
    check(`/import ${what}: Korean error + 메인 화면으로 link, hash cleared`, re.test(t) && (await back.count()) === 1 && !new URL(page.url()).hash, t);
  }
  await page.screenshot({ path: `${OUT}/import-error-1440.png` });
  await page.setViewportSize({ width: 375, height: 812 }); await page.screenshot({ path: `${OUT}/import-error-375.png` });
  check("/import error at 375: no overflow", (await page.evaluate(() => document.documentElement.scrollWidth)) <= 375);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("link", { name: "메인 화면으로" }).click(); await page.waitForURL(BASE + "/");
  check("메인 화면으로 link goes to /", page.url() === BASE + "/");
  check("no uncaught page errors", errs.length === 0, errs.join(" | "));
  await ctx.close();
} catch (e) { check("run", false, e.stack); }
finally {
  for (const n of made) check(`cleanup ${n}`, (await del(n)) === 204);
  await browser.close(); mock.close();
}
console.log(failures() ? `# ${failures()} failed` : "# all passed");

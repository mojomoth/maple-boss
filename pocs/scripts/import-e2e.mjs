// The maplescouter import flow in the system Chrome, against a server WITHOUT the crawler (as on Vercel), e.g.
//   npm run build && VERCEL=1 MAPLE_DB=/tmp/maple-e2e-pglite npx next start -p 3100
//   BASE_URL=http://localhost:3100 node scripts/import-e2e.mjs [shots dir]
// A mock maplescouter page on another port puts a renamed docs/research/samples/아델.json into
// localStorage['character-store'], the bookmarklet taken from the guide on / runs there, and the character must show
// up on /. Then the paste fallback and the /import error states. Deletes what it imported. Exit 1 on any failure.
import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");
const out = process.argv[2] && path.resolve(process.argv[2]);
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tag = Date.now().toString(36).slice(-5);
const A = `아델e2e${tag}`; // via the bookmarklet
const B = `고딩e2e${tag}`; // via 직접 붙여넣기

const store = (file, name) => {
  const sr = JSON.parse(readFileSync(new URL(`../../docs/research/samples/${file}`, import.meta.url), "utf8"));
  sr.userApiData.info.character_name = name;
  return JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
};

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures++;
  return ok;
};
const shot = async (page, name) => out && (await page.screenshot({ path: path.join(out, name) }), console.log(`     screenshot ${name}`));

// Mock maplescouter: the result page sets the store the way maplescouter's own script does.
const storeA = store("아델.json", A);
const mock = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><title>mock maplescouter</title><p id="s">loading</p>
<script>localStorage.setItem("character-store", ${JSON.stringify(storeA).replace(/</g, "\\u003c")});document.getElementById("s").textContent="ready";</script>`);
});
await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const MOCK = `http://127.0.0.1:${mock.address().port}`;

if (out) mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const imported = [];
try {
  console.log(`# import e2e ${BASE}, mock maplescouter ${MOCK}, characters ${A} ${B}`);
  const health = await (await fetch(`${BASE}/api/health`)).json();
  check("server has no crawler: POST /api/character -> 501", (await fetch(`${BASE}/api/character`, { method: "POST", body: JSON.stringify({ name: A }) })).status === 501);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/");
  const note = page.getByText("임시 저장소를 쓰고 있어요");
  check(`storage notice ${health.persistent ? "hidden" : "shown"} (persistent: ${health.persistent})`, (await note.count()) === (health.persistent ? 0 : 1));

  // 1. nickname -> guide
  await page.fill("#character-name", A);
  await page.click("button:has-text('추가')");
  const guide = page.locator("section.guide");
  await guide.waitFor();
  check("guide opens for the nickname", (await guide.locator("h2").innerText()).includes(A));
  check("guide heading has focus", await page.evaluate(() => document.activeElement?.id === "guide-title"));
  const step1 = guide.getByRole("link", { name: /maplescouter에서 결과 열기/ });
  const href1 = await step1.getAttribute("href");
  check("step 1 opens maplescouter's result page in a new tab", href1 === `https://maplescouter.com/ko/result?name=${encodeURIComponent(A)}` &&
    (await step1.getAttribute("target")) === "_blank" && /noopener/.test(await step1.getAttribute("rel")), href1);
  const bm = guide.getByRole("link", { name: "Maple Boss로 보내기" });
  const js = await bm.getAttribute("href");
  check("step 2 is a javascript: bookmarklet for this origin", js?.startsWith("javascript:") && decodeURIComponent(js).includes(JSON.stringify(BASE)), `${js?.length} chars`);
  await bm.click();
  check("clicking it here only explains to drag it to the bookmarks bar", page.url() === BASE + "/" && (await guide.getByText("북마크바로 끌어다 놓아 주세요").count()) === 1);
  await shot(page, "guide-1440.png");
  await page.setViewportSize({ width: 375, height: 812 });
  await guide.scrollIntoViewIfNeeded();
  await shot(page, "guide-375.png");
  await page.setViewportSize({ width: 1440, height: 900 });

  // 2. the bookmarklet on the (mock) maplescouter page
  const seen = [];
  page.on("framenavigated", (f) => f === page.mainFrame() && seen.push(f.url()));
  await page.goto(`${MOCK}/ko/result?name=${encodeURIComponent(A)}`);
  await page.locator("#s", { hasText: "ready" }).waitFor();
  seen.length = 0;
  await Promise.all([page.waitForURL(BASE + "/", { timeout: 30_000 }), page.evaluate(decodeURIComponent(js.slice("javascript:".length))).catch(() => {})]);
  const landing = seen.find((u) => u.startsWith(`${BASE}/import#`));
  check("bookmarklet -> /import#<payload> -> /", !!landing && seen.at(-1) === BASE + "/", `${seen.map((u) => u.slice(0, 60)).join(" -> ")}`);
  check("payload in the fragment is the trimmed one", !!landing && landing.length < 64_000, `${landing?.length} chars vs ${storeA.length} in the store`);
  const cardA = page.locator(".card-name", { hasText: A });
  await cardA.waitFor({ timeout: 15_000 }).catch(() => {});
  if (check(`card ${A} is on /`, (await cardA.count()) === 1)) imported.push(A);
  check("no hash left in the address bar", !new URL(page.url()).hash);
  await cardA.scrollIntoViewIfNeeded();
  await shot(page, "after-bookmarklet-1440.png");

  // 3. 직접 붙여넣기
  await page.fill("#character-name", B);
  await page.click("button:has-text('추가')");
  await guide.waitFor();
  await guide.locator("summary", { hasText: "직접 붙여넣기" }).click();
  await page.fill("#paste-store", "{nope");
  await guide.getByRole("button", { name: "가져오기", exact: true }).click();
  const pasteMsg = page.locator("#paste-msg");
  await pasteMsg.filter({ hasText: /\S/ }).waitFor();
  check("paste of non-JSON shows the server's Korean message", /JSON 형식이 아니에요/.test(await pasteMsg.innerText()), await pasteMsg.innerText());
  await page.locator("#paste-store").fill(store("고딩.json", B));
  await guide.getByRole("button", { name: "가져오기", exact: true }).click();
  await guide.waitFor({ state: "detached" });
  const cardB = page.locator(".card-name", { hasText: B });
  await cardB.waitFor({ timeout: 15_000 }).catch(() => {});
  if (check(`paste imports ${B}, closes the guide and shows its card`, (await cardB.count()) === 1)) imported.push(B);
  check("…with a confirmation under the field", (await page.locator("#add-msg").innerText()).includes(`‘${B}’ 캐릭터를 가져왔어요.`), await page.locator("#add-msg").innerText());

  // 4. /import error states
  const big = encodeURIComponent(JSON.stringify({ v: 1, pad: "x".repeat(1_100_000) }));
  for (const [what, hash, want] of [
    ["no fragment", "", /가져올 데이터가 없어요/],
    ["broken fragment", "#%E0%A4%A", /데이터가 깨져 있어요/],
    ["not a character (400)", "#" + encodeURIComponent('{"v":1}'), /캐릭터 데이터가 아니에요/],
    ["over 1 MB (413)", "#" + big, /너무 커요/],
  ]) {
    await page.goto("about:blank"); // /import -> /import#x would only scroll, not load the page
    await page.goto(`${BASE}/import${hash}`);
    const msg = page.locator(".empty-title.is-error");
    await msg.waitFor({ timeout: 15_000 }).catch(() => {});
    const text = (await msg.count()) ? await msg.innerText() : "(no error shown)";
    check(`/import ${what}: Korean error, fragment cleared`, want.test(text) && !new URL(page.url()).hash, text);
    if (what.startsWith("over")) await shot(page, "import-error-1440.png");
  }
  // 5. the character PoC on the same server: 501 points at maplescouter and the main screen's guide
  await page.goto(`${BASE}/pocs/character`);
  await page.fill("#character-name", A);
  await page.click("button:has-text('등록')");
  const alert = page.locator("p[role=alert]");
  await alert.waitFor();
  const scouter = page.getByRole("link", { name: "maplescouter에서 결과 열기" });
  check("/pocs/character without crawler: 501 message + maplescouter link", /바로 불러올 수 없어요/.test(await alert.innerText()) &&
    (await scouter.getAttribute("href")) === `https://maplescouter.com/ko/result?name=${encodeURIComponent(A)}`, await alert.innerText());
  check("no uncaught errors in the page", errors.length === 0, errors.join(" | "));
  await ctx.close();
} catch (e) {
  check("e2e run", false, e.stack ?? String(e));
} finally {
  for (const n of [A, B]) {
    const r = await fetch(`${BASE}/api/character/${encodeURIComponent(n)}`, { method: "DELETE" });
    if (imported.includes(n) || r.status === 204) check(`cleanup DELETE ${n}`, r.status === 204, String(r.status));
  }
  await browser.close();
  mock.close();
}
console.log(failures ? `# ${failures} failed` : "# all passed");
process.exit(failures ? 1 : 0);

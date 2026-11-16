// G3 checks that need a server the dev server cannot be: a production build (`next build`, then `next start`)
//   DOWN_URL: DATABASE_URL points at a closed port (the database is down)  -> API-10 error page, API 500/503 JSON
//   TEMP_URL: MAPLE_DB=/tmp/... (per-instance temporary storage, like Vercel without DATABASE_URL) -> the notice
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";

const DOWN = process.env.DOWN_URL ?? "http://localhost:3100";
const TEMP = process.env.TEMP_URL ?? "http://localhost:3190";
const OUT = new URL("../shots/", import.meta.url).pathname;
let fails = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== "" ? `  | ${String(detail).slice(0, 200)}` : ""}`);
  if (!ok) fails++;
};

console.log(`# database down: ${DOWN}`);
for (const [method, path, status] of [["GET", "/api/health", 503], ["GET", "/api/character", 500], ["GET", "/api/party", 500], ["GET", "/api/party/requests", 500], ["GET", "/api/character/rates?name=x", 500], ["DELETE", "/api/character/x", 500], ["POST", "/api/character/import", 500]]) {
  const body = method === "POST" ? JSON.stringify({ v: 1 }) : undefined;
  const r = await fetch(DOWN + path, { method, body, headers: body ? { "content-type": "application/json" } : {} });
  const text = await r.text();
  let j = null;
  try { j = JSON.parse(text); } catch {}
  // POST import with a bad payload is a 400 before the database is touched; any DB call answers 500/503 JSON
  const want = path === "/api/character/import" ? 400 : status;
  check(`${method} ${path} -> ${r.status} { error }`, r.status === want && typeof j?.error === "string" && /[가-힣]/.test(j.error) && !/at \S+:\d+/.test(text), text.slice(0, 120));
}

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR", colorScheme: "dark" });
try {
  for (const path of ["/", "/pocs/party"]) {
    const page = await ctx.newPage();
    const res = await page.goto(DOWN + path, { waitUntil: "networkidle" });
    const h1 = await page.locator("h1#status-title").textContent().catch(() => "(none)");
    const text = await page.locator(".empty").textContent().catch(() => "");
    check(`API-10 ${path} with the database down -> ${res.status()} "${h1}"`, res.status() === 500 && h1 === "화면을 불러오지 못했어요" && !/Application error|Internal Server Error/.test(await page.content()), text);
    const retry = page.getByRole("button", { name: "다시 시도", exact: true });
    const back = page.locator("main").getByRole("link", { name: "메인 화면으로", exact: true });
    check(`API-10 ${path}: 다시 시도 and 메인 화면으로 are there`, (await retry.count()) === 1 && (await back.getAttribute("href")) === "/");
    await retry.click();
    await page.waitForTimeout(1500);
    check(`API-10 ${path}: 다시 시도 with the database still down shows the same page`, (await page.locator("h1#status-title").textContent().catch(() => "")) === "화면을 불러오지 못했어요");
    if (path === "/") await page.screenshot({ path: OUT + "api10-db-down.png", clip: { x: 0, y: 0, width: 1440, height: 520 } });
    else {
      await back.click();
      await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
      check("API-10 /pocs/party: 메인 화면으로 leaves the failing screen", new URL(page.url()).pathname === "/");
    }
    await page.close();
  }

  console.log(`# temporary storage: ${TEMP}`);
  const page = await ctx.newPage();
  await page.goto(TEMP + "/", { waitUntil: "networkidle" });
  const notice = await page.locator("section[aria-labelledby=chars-title] > p.section-help").allTextContents();
  check("temporary storage notice says data can be missing after a reload, not only after a restart", notice.includes("임시 저장소를 쓰고 있어요. 등록한 캐릭터와 파티가 새로고침 뒤에 안 보이거나 사라질 수 있어요."), notice.join(" / "));
  await page.locator("section[aria-labelledby=chars-title]").screenshot({ path: OUT + "temp-storage-notice.png", clip: undefined }).catch(() => {});
  const health = await (await fetch(TEMP + "/api/health")).json();
  check("temporary storage: /api/health persistent false", health.persistent === false, JSON.stringify(health));
} finally {
  await browser.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");
process.exit(fails ? 1 : 0);

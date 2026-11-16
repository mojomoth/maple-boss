// G2 /flow in a real browser (system Chrome via playwright-core): screenshots at 1440x900 and 375x812, a node
// panel open, and checks for page overflow, canvas scroll, keyboard open/close with focus return, and layout shift.
// Usage: node flow-shots.mjs  (dev server on BASE_URL, default http://localhost:3000)
import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = new URL("..", import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
let fails = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== "" ? `  | ${detail}` : ""}`); if (!ok) fails++; };

try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
    await ctx.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
    const res = await page.goto(`${BASE}/flow`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    check(`${w} GET /flow`, res?.status() === 200, res?.status());
    await page.screenshot({ path: `${OUT}flow-${w}.png` });
    await page.screenshot({ path: `${OUT}flow-${w}-full.png`, fullPage: true });

    const m = await page.evaluate(() => {
      const c = document.querySelector(".flow-canvas");
      return { pageW: document.documentElement.scrollWidth, vw: innerWidth, canvasScroll: c.scrollWidth, canvasW: c.clientWidth,
        nodes: document.querySelectorAll("button.flow-node").length, wires: document.querySelectorAll(".flow-wire").length,
        loops: document.querySelectorAll(".flow-wires .flow-wire--loop").length, fails: document.querySelectorAll(".flow-wires .flow-wire--fail").length,
        labels: [...document.querySelectorAll(".flow-wire-label")].map((e) => e.textContent), sync: document.querySelector(".flow-sync")?.textContent };
    });
    check(`${w} page does not scroll sideways`, m.pageW <= m.vw, `scrollWidth ${m.pageW} vs ${m.vw}`);
    check(`${w} canvas ${w < 1000 ? "scrolls" : "fits"} horizontally`, w < 1000 ? m.canvasScroll > m.canvasW : m.canvasScroll <= m.canvasW, `${m.canvasScroll} in ${m.canvasW}`);
    check(`${w} nodes, wires, loop`, m.nodes === 16 && m.loops === 1 && m.fails === 1, `nodes ${m.nodes}, wires ${m.wires}, loop ${m.loops}, fail ${m.fails}, labels ${m.labels.join("/")}`);
    check(`${w} 문서 반영 shown`, /문서 반영/.test(m.sync ?? ""), m.sync);

    // Keyboard: Tab from the page start to the first node; it shows a focus ring; Enter opens the panel.
    await page.keyboard.press("Tab");
    let tabs = 1;
    while (tabs < 30 && !(await page.evaluate(() => document.activeElement?.matches("button.flow-node")))) { await page.keyboard.press("Tab"); tabs++; }
    const focus = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { step: a.dataset.step, outline: `${s.outlineStyle} ${s.outlineWidth}`, visible: a.matches(":focus-visible") }; });
    check(`${w} first node reached by Tab (${tabs} presses) with visible focus`, focus.step === "G0-plan" && focus.visible && focus.outline.startsWith("solid"), JSON.stringify(focus));
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("dialog.flow-panel")?.open);
    const opened = await page.evaluate(() => ({ title: document.querySelector("#flow-panel-title")?.textContent, inside: document.querySelector("dialog.flow-panel").contains(document.activeElement) }));
    check(`${w} Enter opens the panel with focus inside`, opened.title?.length > 0 && opened.inside, JSON.stringify(opened));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog.flow-panel")?.open);
    check(`${w} Esc closes and focus returns to the node`, await page.evaluate(() => document.activeElement?.dataset.step === "G0-plan"));
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.querySelector("dialog.flow-panel")?.open);
    const spaced = await page.evaluate(() => ({ title: document.querySelector("#flow-panel-title")?.textContent, active: document.activeElement?.className }));
    check(`${w} Space opens the next node`, spaced.title === "Next 16, Postgres 저장소, 하네스", JSON.stringify(spaced));
    await page.click(".flow-panel .icon-btn", { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector("dialog.flow-panel")?.open);

    // Click: the failed critic of G1, the panel shows note, agent and evidence links.
    const critic = page.locator('button[data-step="G1-critic"]');
    await critic.scrollIntoViewIfNeeded();
    await critic.click();
    await page.waitForFunction(() => document.querySelector("dialog.flow-panel")?.open);
    const panel = await page.evaluate(() => {
      const d = document.querySelector("dialog.flow-panel"); const r = d.getBoundingClientRect();
      return { text: d.innerText.replace(/\s+/g, " "), links: [...d.querySelectorAll("a")].map((a) => a.href), right: Math.round(r.right), width: Math.round(r.width) };
    });
    check(`${w} click opens G1 critic panel`, /독립 검증 \(UI·흐름\)/.test(panel.text) && /실패/.test(panel.text) && /critic:ui-flows/.test(panel.text) && /P1-1/.test(panel.text), panel.text.slice(0, 160));
    check(`${w} evidence links to GitHub dev-v1`, panel.links.length === 1 && panel.links[0] === "https://github.com/mojomoth/maple-boss/tree/dev-v1/docs/dev-v1/evidence/G1/critic-ui/", panel.links.join(" "));
    check(`${w} panel is a right-side sheet inside the viewport`, panel.right === w && panel.width <= Math.min(448, w - 40), `${panel.width}px wide, right ${panel.right}`);
    await page.screenshot({ path: `${OUT}flow-${w}-panel.png` });
    await page.mouse.click(5, h / 2); // backdrop
    await page.waitForFunction(() => !document.querySelector("dialog.flow-panel")?.open);
    check(`${w} backdrop click closes`, true);
    const cls = await page.evaluate(() => window.__cls);
    check(`${w} no layout shift (CLS)`, cls < 0.01, cls.toFixed(4));
    check(`${w} no page or console errors`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails ? `${fails} failed` : "all ok");
process.exit(fails ? 1 : 0);

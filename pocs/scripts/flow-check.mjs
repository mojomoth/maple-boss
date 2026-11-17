// node scripts/flow-check.mjs [dir]: /flow in the system Chrome (CHROME_PATH) at 1440x900 and 375x812. Checks page
// overflow, canvas scroll, nodes/wires/loops against docs/dev-v1/flow.json, keyboard open/close with focus return,
// the evidence links, the side panel and layout shift. Screenshots go to [dir] only when it is given.
// BASE_URL as in smoke, default http://localhost:3000. Exit 1 on any failure.
// The kept copy of docs/dev-v1/evidence/G2/scripts/flow-shots.mjs (G2's record: 16 nodes, PNGs into evidence/G2),
// with the counts read from flow.json so a new step does not make it fail.
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const out = process.argv[2] && path.resolve(process.argv[2]);
if (out) mkdirSync(out, { recursive: true });
const flow = JSON.parse(readFileSync(new URL("../../docs/dev-v1/flow.json", import.meta.url), "utf8"));

// What Canvas.tsx draws for this flow.json.
const steps = flow.gates.flatMap((g) => g.steps);
const want = {
  nodes: steps.length,
  // a recheck arcs back to the critic (or recheck) before it
  loops: flow.gates.reduce((n, g) => n + g.steps.filter((s, i) => s.kind === "recheck" && g.steps.slice(0, i).some((p) => p.kind === "critic" || p.kind === "recheck")).length, 0),
  // a failed step's outgoing wire: to the next step, or to the next gate's first step
  fails: flow.gates.reduce((n, g, gi) => n + g.steps.filter((s, i) => s.status === "fail" && (i < g.steps.length - 1 || gi < flow.gates.length - 1)).length, 0),
};
const [first, second] = flow.gates[0].steps;
// The first failed critic with evidence: its panel shows the note, agent and a GitHub link.
const failed = steps.find((s) => s.kind === "critic" && s.status === "fail" && s.evidence.length);

let fails = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== "" ? `  | ${detail}` : ""}`);
  if (!ok) fails++;
};
const shot = (page, name, full = false) => out && page.screenshot({ path: path.join(out, name), fullPage: full });

const browser = await chromium.launch({ executablePath: CHROME });
try {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
    await ctx.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(`${m.type()}: ${m.text().slice(0, 200)}`));
    const res = await page.goto(`${BASE}/flow`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    check(`${w} GET /flow`, res?.status() === 200, res?.status());
    await shot(page, `flow-${w}.png`);

    const m = await page.evaluate(() => {
      const c = document.querySelector(".flow-canvas");
      return {
        pageW: document.documentElement.scrollWidth, vw: innerWidth, canvasScroll: c.scrollWidth, canvasW: c.clientWidth, overflowX: getComputedStyle(c).overflowX,
        boardW: Math.round(document.querySelector(".flow-board").getBoundingClientRect().width),
        nodes: document.querySelectorAll("button.flow-node").length, wires: document.querySelectorAll(".flow-wire").length,
        loops: document.querySelectorAll(".flow-wires .flow-wire--loop").length, fails: document.querySelectorAll(".flow-wires .flow-wire--fail").length,
        labels: [...document.querySelectorAll(".flow-wire-label")].map((e) => e.textContent), sync: document.querySelector(".flow-sync")?.textContent,
      };
    });
    check(`${w} page does not scroll sideways`, m.pageW <= m.vw, `scrollWidth ${m.pageW} vs ${m.vw}`);
    // The board grows with the longest gate: it fits, or it scrolls inside the canvas (never the page).
    const fits = m.boardW <= m.canvasW;
    check(`${w} canvas ${fits ? "fits" : "scrolls inside itself"} (board ${m.boardW}px)`, fits ? m.canvasScroll <= m.canvasW : m.canvasScroll > m.canvasW && ["auto", "scroll"].includes(m.overflowX), `${m.canvasScroll} in ${m.canvasW}`);
    check(`${w} nodes, loops, failed wires as in flow.json (${want.nodes}, ${want.loops}, ${want.fails})`, m.nodes === want.nodes && m.loops === want.loops && m.fails === want.fails,
      `nodes ${m.nodes}, wires ${m.wires}, loop ${m.loops}, fail ${m.fails}, labels ${m.labels.join("/")}`);
    check(`${w} 문서 반영 shown`, /문서 반영/.test(m.sync ?? ""), m.sync);

    // Keyboard: Tab from the page start to the first node; it shows a focus ring; Enter opens the panel.
    await page.keyboard.press("Tab");
    let tabs = 1;
    while (tabs < 30 && !(await page.evaluate(() => document.activeElement?.matches("button.flow-node")))) {
      await page.keyboard.press("Tab");
      tabs++;
    }
    const focus = await page.evaluate(() => {
      const a = document.activeElement;
      const s = getComputedStyle(a);
      return { step: a.dataset.step, outline: `${s.outlineStyle} ${s.outlineWidth}`, visible: a.matches(":focus-visible") };
    });
    check(`${w} first node reached by Tab (${tabs} presses) with visible focus`, focus.step === first.id && focus.visible && focus.outline.startsWith("solid"), JSON.stringify(focus));
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("dialog.flow-panel")?.open);
    const opened = await page.evaluate(() => ({ title: document.querySelector("#flow-panel-title")?.textContent, inside: document.querySelector("dialog.flow-panel").contains(document.activeElement) }));
    check(`${w} Enter opens the panel with focus inside`, opened.title === first.title && opened.inside, JSON.stringify(opened));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog.flow-panel")?.open);
    await page.waitForTimeout(100); // the dialog's "close" event, a task, puts focus back on the node once more
    check(`${w} Esc closes and focus returns to the node`, await page.evaluate((id) => document.activeElement?.dataset.step === id, first.id));
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.querySelector("dialog.flow-panel")?.open);
    const spaced = await page.evaluate(() => ({ title: document.querySelector("#flow-panel-title")?.textContent, active: document.activeElement?.className }));
    check(`${w} Space opens the next node`, spaced.title === second.title, JSON.stringify(spaced));
    await page.click(".flow-panel .icon-btn", { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector("dialog.flow-panel")?.open);

    // Click: a failed critic; the panel shows its note, agent and evidence links.
    const node = page.locator(`button[data-step="${failed.id}"]`);
    await node.scrollIntoViewIfNeeded();
    await node.click();
    await page.waitForFunction(() => document.querySelector("dialog.flow-panel")?.open);
    const panel = await page.evaluate(() => {
      const d = document.querySelector("dialog.flow-panel");
      const r = d.getBoundingClientRect();
      return { text: d.innerText.replace(/\s+/g, " "), links: [...d.querySelectorAll("a")].map((a) => a.href), right: Math.round(r.right), width: Math.round(r.width) };
    });
    const flat = (s) => s.replace(/\s+/g, " ");
    check(`${w} click opens ${failed.id} panel`, panel.text.includes(flat(failed.title)) && /실패/.test(panel.text) && panel.text.includes(flat(failed.agent)) && panel.text.includes(flat(failed.note)), panel.text.slice(0, 160));
    const hrefs = failed.evidence.map((p) => `https://github.com/mojomoth/maple-boss/${p.endsWith("/") ? "tree" : "blob"}/dev-v1/${p.split("/").map(encodeURIComponent).join("/")}`);
    check(`${w} evidence links to GitHub dev-v1`, panel.links.join(" ") === hrefs.join(" "), panel.links.join(" "));
    check(`${w} panel is a right-side sheet inside the viewport`, panel.right === w && panel.width <= Math.min(448, w - 40), `${panel.width}px wide, right ${panel.right}`);
    await shot(page, `flow-${w}-panel.png`);
    await page.mouse.click(5, h / 2); // backdrop
    await page.waitForFunction(() => !document.querySelector("dialog.flow-panel")?.open);
    check(`${w} backdrop click closes`, true);
    const cls = await page.evaluate(() => window.__cls);
    check(`${w} no layout shift (CLS)`, cls < 0.01, cls.toFixed(4));
    check(`${w} no page errors or console warnings`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails ? `${fails} failed` : "all ok");
process.exit(fails ? 1 : 0);

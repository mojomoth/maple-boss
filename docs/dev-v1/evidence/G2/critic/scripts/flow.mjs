// G2 critic: /flow structure, wires, details panel (mouse + keyboard), blockers, legend, 375px scroll.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
const require = createRequire("/Users/jeongyounglee/work/repo/maple-boss/pocs/package.json");
const { chromium } = require("playwright-core");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "/tmp/g2critic/shots";
mkdirSync(OUT, { recursive: true });
const flow = JSON.parse(readFileSync(process.env.FLOW_FILE ?? "/Users/jeongyounglee/work/repo/maple-boss/docs/dev-v1/flow.json", "utf8"));
const KIND = { plan: "계획", build: "구현", critic: "검증", fix: "수정", recheck: "재검증", pass: "판정" };
const STATUS = { todo: "대기", running: "진행 중", pass: "통과", fail: "실패", blocked: "막힘" };
let fails = 0;
const log = (ok, msg) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) fails++;
};

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  for (const [w, h] of [
    [1440, 900],
    [375, 812],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", colorScheme: "dark" });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text().slice(0, 200)));
    const res = await page.goto(BASE + "/flow", { waitUntil: "networkidle" });
    log(res.status() === 200, `${w} GET /flow ${res.status()}`);

    // every gate as a lane, every step as a node
    for (const g of flow.gates) {
      const lane = await page.locator(".flow-lane", { has: page.locator(`h3:text-is("${g.id} ${g.title}")`) }).count();
      const laneText = await page.locator(".flow-lane").filter({ hasText: `${g.id} ${g.title}` }).first().locator(".flow-lane-head").innerText().catch(() => "");
      log(lane === 1 || laneText.includes(g.id), `${w} lane ${g.id} ${g.title}: "${laneText.replace(/\s+/g, " ")}" (expects ${STATUS[g.status]})`);
      if (!laneText.includes(STATUS[g.status])) log(false, `${w} lane ${g.id} badge missing ${STATUS[g.status]}`);
      for (const s of g.steps) {
        const node = page.locator(`[data-step="${s.id}"]`);
        const n = await node.count();
        if (n !== 1) {
          log(false, `${w} node ${s.id} count=${n}`);
          continue;
        }
        const t = (await node.innerText()).replace(/\s+/g, " ");
        const icon = await node.locator(".flow-kind-icon svg path").count();
        const ok =
          icon === 1 &&
          t.includes(KIND[s.kind]) &&
          t.includes(STATUS[s.status]) &&
          (await node.locator(".flow-node-title").innerText()) === s.title &&
          (await node.locator(".flow-node-agent").innerText()) === (s.agent || "담당 미정");
        log(ok, `${w} node ${s.id} icon=${icon} "${t}"`);
      }
    }
    const nodeCount = await page.locator("[data-step]").count();
    const stepCount = flow.gates.reduce((a, g) => a + g.steps.length, 0);
    log(nodeCount === stepCount, `${w} nodes ${nodeCount} == steps ${stepCount}`);

    // wires: geometry check, every consecutive pair joined, every gate joined to the next
    const geo = await page.evaluate(() => {
      const board = document.querySelector(".flow-board").getBoundingClientRect();
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { l: r.left - board.left, r: r.right - board.left, t: r.top - board.top, b: r.bottom - board.top };
      };
      const nodes = Object.fromEntries([...document.querySelectorAll("[data-step]")].map((n) => [n.dataset.step, rect(n)]));
      const wires = [...document.querySelectorAll(".flow-wires path.flow-wire")].map((p) => {
        const L = p.getTotalLength();
        const a = p.getPointAtLength(0);
        const b = p.getPointAtLength(L);
        return { cls: p.getAttribute("class"), a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, marker: p.getAttribute("marker-end") };
      });
      const labels = [...document.querySelectorAll(".flow-wire-label")].map((l) => ({ text: l.textContent, cls: l.className }));
      return { nodes, wires, labels };
    });
    const near = (p, x, y) => Math.abs(p.x - x) < 3 && Math.abs(p.y - y) < 3;
    const hits = (p, r) => {
      // which node edge midpoint this point sits on
      const cy = (r.t + r.b) / 2,
        cx = (r.l + r.r) / 2;
      if (near(p, r.r, cy)) return "right";
      if (near(p, r.l, cy)) return "left";
      if (near(p, cx, r.b)) return "bottom";
      return null;
    };
    const ends = geo.wires.map((wi) => {
      const from = Object.entries(geo.nodes).find(([, r]) => hits(wi.a, r));
      const to = Object.entries(geo.nodes).find(([, r]) => hits(wi.b, r));
      return { ...wi, from: from?.[0], fromSide: from && hits(wi.a, from[1]), to: to?.[0], toSide: to && hits(wi.b, to[1]) };
    });
    for (const e of ends) console.log(`  wire ${e.from}(${e.fromSide}) -> ${e.to}(${e.toSide})  ${e.cls}`);
    const has = (a, b) => ends.some((e) => e.from === a && e.to === b);
    const ordered = flow.gates.flatMap((g) => g.steps.map((s) => s.id));
    for (let i = 0; i + 1 < ordered.length; i++) log(has(ordered[i], ordered[i + 1]), `${w} wire ${ordered[i]} -> ${ordered[i + 1]}`);
    log(ends.every((e) => e.from && e.to), `${w} every wire starts and ends on a node`);
    const loop = ends.find((e) => e.cls.includes("flow-wire--loop"));
    log(loop?.from === "G1-recheck" && loop?.to === "G1-critic", `${w} loop wire G1-recheck -> G1-critic (${loop?.from} -> ${loop?.to})`);
    const failWire = ends.find((e) => e.cls.includes("flow-wire--fail"));
    log(failWire?.from === "G1-critic" && failWire?.to === "G1-fix", `${w} fail wire G1-critic -> G1-fix`);
    log(geo.labels.some((l) => l.text === "실패") && geo.labels.some((l) => l.text === "수정 후 다시 검증"), `${w} wire labels: ${geo.labels.map((l) => l.text).join(", ")}`);

    // legend & blockers & sync
    const legend = (await page.locator(".flow-legend").innerText()).replace(/\s+/g, " ");
    log(Object.values(KIND).every((k) => legend.includes(k)) && Object.values(STATUS).every((k) => legend.includes(k)), `${w} legend: "${legend}"`);
    const blockers = (await page.locator(".flow-blockers").innerText()).replace(/\s+/g, " ");
    log(flow.blockers.every((b) => blockers.includes(b.id) && blockers.includes(b.title)), `${w} blockers: "${blockers}"`);
    const sync = (await page.locator(".flow-sync").innerText()).replace(/\s+/g, " ");
    console.log(`  ${w} sync: "${sync}"`);

    // 375: canvas scrolls, page does not
    const sc = await page.evaluate(() => {
      const c = document.querySelector(".flow-canvas");
      return { cw: c.clientWidth, sw: c.scrollWidth, ox: getComputedStyle(c).overflowX, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    log(sc.doc <= 0, `${w} page horizontal overflow ${sc.doc}px`);
    if (w === 375) {
      log(sc.sw > sc.cw && sc.ox === "auto", `${w} canvas scrollable: client ${sc.cw} scroll ${sc.sw} overflow-x ${sc.ox}`);
      await page.locator(".flow-canvas").scrollIntoViewIfNeeded();
      await page.locator(".flow-canvas").evaluate((c) => (c.scrollLeft = 500));
      const sl = await page.locator(".flow-canvas").evaluate((c) => c.scrollLeft);
      log(sl > 0, `${w} canvas scrollLeft after scroll = ${sl}`);
      await page.screenshot({ path: `${OUT}/flow-375-scrolled.png` });
      // wheel / touch-ish horizontal scroll via mouse wheel with shift
      await page.locator(".flow-canvas").evaluate((c) => (c.scrollLeft = 0));
      await page.mouse.move(180, 600);
      await page.mouse.wheel(300, 0);
      await page.waitForTimeout(300);
      const sl2 = await page.locator(".flow-canvas").evaluate((c) => c.scrollLeft);
      const docx = await page.evaluate(() => window.scrollX);
      log(sl2 > 0 && docx === 0, `${w} wheel deltaX: canvas scrollLeft ${sl2}, window.scrollX ${docx}`);
      await page.locator(".flow-canvas").evaluate((c) => (c.scrollLeft = 0));
    }

    // click a node -> panel
    for (const id of ["G1-critic", "G2-build"]) {
      const s = flow.gates.flatMap((g) => g.steps).find((x) => x.id === id);
      const node = page.locator(`[data-step="${id}"]`);
      await node.scrollIntoViewIfNeeded();
      await node.click();
      const dlg = page.locator("dialog.flow-panel");
      await dlg.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
      const open = await dlg.evaluate((d) => d.open);
      const txt = open ? (await dlg.innerText()).replace(/\s+/g, " ") : "";
      const evOk = s.evidence.every((p) => txt.includes(p));
      const ok = open && txt.includes(s.title) && (s.note ? txt.includes(s.note) : txt.includes("아직 메모가 없어요")) && (s.agent ? txt.includes(s.agent) : txt.includes("아직 정해지지")) && evOk;
      log(ok, `${w} click ${id} -> panel open=${open}: "${txt.slice(0, 220)}"`);
      const focusIn = await page.evaluate(() => document.activeElement?.closest("dialog") !== null);
      log(focusIn, `${w} focus moved into the panel`);
      const hrefs = await dlg.locator("a").evaluateAll((as) => as.map((a) => a.href));
      if (hrefs.length) console.log(`  evidence hrefs: ${hrefs.join(" ")}`);
      // panel fits viewport
      const pb = await dlg.boundingBox();
      log(pb && pb.x >= 0 && pb.x + pb.width <= w + 1, `${w} panel box x=${pb?.x} w=${pb?.width}`);
      await page.screenshot({ path: `${OUT}/flow-panel-${id}-${w}.png` });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const closed = !(await dlg.evaluate((d) => d.open));
      const back = await page.evaluate(() => document.activeElement?.dataset?.step);
      log(closed && back === id, `${w} Esc closes (${closed}), focus back on ${back}`);
    }

    // keyboard: Tab to a node, Enter opens; close button; Space opens
    await page.locator('[data-step="G1-fix"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    let open = await page.locator("dialog.flow-panel").evaluate((d) => d.open);
    let txt = open ? (await page.locator("dialog.flow-panel").innerText()).replace(/\s+/g, " ") : "";
    log(open && txt.includes("P1-1 수정"), `${w} Enter on G1-fix opens panel: ${open}`);
    // close with close button via keyboard
    const active = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    console.log(`  focused in panel: ${active}`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    open = await page.locator("dialog.flow-panel").evaluate((d) => d.open);
    let back = await page.evaluate(() => document.activeElement?.dataset?.step);
    log(!open && back === "G1-fix", `${w} Enter on close button closes, focus back on ${back}`);

    await page.locator('[data-step="G0-plan"]').focus();
    await page.keyboard.press(" ");
    await page.waitForTimeout(300);
    open = await page.locator("dialog.flow-panel").evaluate((d) => d.open);
    txt = open ? (await page.locator("dialog.flow-panel").innerText()).replace(/\s+/g, " ") : "";
    log(open && txt.includes("Vercel 프로젝트"), `${w} Space on G0-plan opens panel: ${open}`);
    // backdrop click closes
    await page.mouse.click(5, h / 2);
    await page.waitForTimeout(300);
    open = await page.locator("dialog.flow-panel").evaluate((d) => d.open);
    log(!open, `${w} backdrop click closes panel: ${!open}`);

    // Tab order reaches nodes from the page
    await page.goto(BASE + "/flow", { waitUntil: "networkidle" });
    const seen = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const d = await page.evaluate(() => document.activeElement?.dataset?.step ?? document.activeElement?.tagName);
      seen.push(d);
    }
    console.log(`  ${w} tab order: ${seen.join(" ")}`);
    log(seen.includes("G0-plan") && seen.includes("G3-pass"), `${w} every node reachable by Tab`);
    const vis = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? getComputedStyle(el).outlineStyle : "";
    });

    log(errs.length === 0, `${w} errors: ${errs.join(" | ") || "none"}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails ? `# ${fails} failed` : "# all passed");
process.exit(fails ? 1 : 0);

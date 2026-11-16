// Recheck P1-1: clip-aware. For each element in the dialog, intersect its box with every ancestor that clips
// (overflow != visible) up to the dialog; flag anything whose *visible* part leaks past the dialog, any text element
// that is itself clipped (name/meta cut off), sideways scroll, and a 삭제 button that is not fully hit-testable.
// Also clicks 삭제 at 375px on one temp character to prove the button works.
import { BASE, launch, check, failures, payload, importApi, del } from "../../critic-ui/scripts/lib.mjs";
const OUT = "/Users/jeongyounglee/work/repo/maple-boss/docs/dev-v1/evidence/G1/recheck-1";
const browser = await launch();
const names = ["강은호", "가나다라마바", "abcdefghijkl", "WWWWWWWWWWWW", "검증삭제tmy", "뷁뷁뷁뷁뷁뷁"]; const made = [];
for (const n of names.slice(1)) { const [s, b] = await importApi(payload(n, [["카링", "Extreme", 0.5]])); if (s === 201) made.push(n); else console.log("import", n, s, JSON.stringify(b)); }
try {
  for (const [w, h] of [[320, 640], [375, 812], [390, 844], [1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR" });
    const page = await ctx.newPage(); await page.goto(BASE + "/"); await page.waitForSelector("button.card");
    for (const n of ["강은호", ...made]) {
      const card = page.locator("button.card", { has: page.locator(".card-name", { hasText: new RegExp(`^${n}$`) }) });
      await card.scrollIntoViewIfNeeded(); await card.click();
      await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
      const m = await page.evaluate(() => {
        const d = document.querySelector("dialog.confirm"); const r = d.getBoundingClientRect();
        const visible = (e) => { let b = e.getBoundingClientRect(); let L = b.left, R = b.right, T = b.top, B = b.bottom;
          for (let a = e.parentElement; a && a !== d; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== "visible") { const ab = a.getBoundingClientRect(); L = Math.max(L, ab.left); R = Math.min(R, ab.right); T = Math.max(T, ab.top); B = Math.min(B, ab.bottom); } }
          return { L, R, T, B, w: b.width, h: b.height }; };
        const leak = [], clipped = [];
        for (const e of d.querySelectorAll("*")) { const v = visible(e); if (!v.w) continue;
          if (v.R > v.L && (v.R > r.right - 1 + 0.5 || v.L < r.left - 0.5)) leak.push(`${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${Math.round(v.L)}..${Math.round(v.R)}`);
          if (e.tagName !== "IMG" && e.closest(".preview-text, h2, .confirm-note, .confirm-actions") && (Math.round(v.R - v.L) < Math.round(v.w) - 1)) clipped.push(`${e.tagName.toLowerCase()}.${[...e.classList].join(".")}`); }
        const del = [...d.querySelectorAll(".confirm-actions .btn")].find((b) => b.textContent.includes("삭제")); const db = del.getBoundingClientRect();
        const hits = [[db.left + 2, db.top + db.height / 2], [db.left + db.width / 2, db.top + db.height / 2], [db.right - 2, db.top + db.height / 2]].map(([x, y]) => del.contains(document.elementFromPoint(x, y)));
        const pv = d.querySelector(".preview").getBoundingClientRect(); const st = d.querySelector(".preview-text strong");
        const nameIn = (() => { const sb = st.getBoundingClientRect(); return sb.left >= pv.left - 0.5 && sb.right <= pv.right + 0.5; })();
        const lines = Math.round(st.getBoundingClientRect().height / parseFloat(getComputedStyle(st).lineHeight));
        return { dlg: `${Math.round(r.left)}..${Math.round(r.right)}`, scrollW: d.scrollWidth, clientW: d.clientWidth, docScrollW: document.documentElement.scrollWidth,
          del: `${Math.round(db.left)}..${Math.round(db.right)}`, delHit: hits.every(Boolean), preview: `${Math.round(pv.left)}..${Math.round(pv.right)}`, nameIn, nameLines: lines, leak: leak.slice(0, 6), clipped: clipped.slice(0, 6) };
      });
      check(`${w}px modal for ${n}: visible content inside dialog, no sideways scroll, 삭제 fully hit-testable, name inside tile`,
        m.leak.length === 0 && m.clipped.length === 0 && m.scrollW <= m.clientW && m.docScrollW <= w && m.delHit && m.nameIn, JSON.stringify(m));
      if (w === 375 && ["가나다라마바", "WWWWWWWWWWWW", "강은호"].includes(n)) await page.locator("dialog.confirm").screenshot({ path: `${OUT}/modal-375-${n === "가나다라마바" ? "6char" : n === "강은호" ? "seeded" : "12W"}.png` });
      if (w === 375 && n === "검증삭제tmy") {
        const delBtn = page.locator("dialog.confirm .confirm-actions .btn", { hasText: "삭제" });
        await delBtn.click();
        await page.waitForFunction(() => !document.querySelector("dialog.confirm")?.open, null, { timeout: 8000 }).catch(() => {});
        const t0 = Date.now(); // router.refresh() re-renders the list asynchronously: poll for the card to go
        await page.waitForFunction(() => ![...document.querySelectorAll(".card-name")].some((e) => e.textContent === "검증삭제tmy"), null, { timeout: 8000 }).catch(() => {});
        const gone = await page.locator(".card-name", { hasText: /^검증삭제tmy$/ }).count(); console.log(`     card gone after ~${Date.now() - t0}ms`);
        const api = await (await fetch(`${BASE}/api/character`)).json();
        check("375px: clicking 삭제 closes the dialog and removes the card + API row", gone === 0 && !api.some((c) => c.name === "검증삭제tmy"), `cards=${gone} api=${api.map((c) => c.name).join(",")}`);
        made.splice(made.indexOf(n), 1); continue;
      }
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("dialog.confirm")?.open);
    }
    await ctx.close();
  }
} finally { for (const n of [...made, "검증삭제tmy"]) await del(n); await browser.close(); }
console.log(failures() ? `# ${failures()} failed` : "# all passed");

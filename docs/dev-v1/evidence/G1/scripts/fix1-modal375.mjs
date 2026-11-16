// P1-1 re-check: same flow as critic-ui/scripts/e-modal375.mjs, but the sprite <img> is skipped (it is clipped by
// .sprite { overflow: hidden } by design); the .sprite box itself is still measured. Also screenshots and the 삭제 button.
import { BASE, launch, check, failures, payload, importApi, del } from "../critic-ui/scripts/lib.mjs";
const OUT = "/Users/jeongyounglee/work/repo/maple-boss/docs/dev-v1/evidence/G1";
const browser = await launch();
const names = ["가나다라마바", "abcdefghijkl", "WWWWWWWWWWWW", "검증삭제tmy"]; const made = [];
for (const n of names) { const [s] = await importApi(payload(n, [["카링", "Extreme", 0.5]])); if (s === 201) made.push(n); }
try {
  for (const w of [320, 375, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 1000 ? 812 : 900 }, locale: "ko-KR" });
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    for (const n of ["강은호", ...made]) {
      const card = page.locator("button.card", { has: page.locator(".card-name", { hasText: new RegExp(`^${n}$`) }) });
      await card.scrollIntoViewIfNeeded(); await card.click();
      await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
      const m = await page.evaluate(() => {
        const d = document.querySelector("dialog.confirm"); const r = d.getBoundingClientRect();
        const out = [...d.querySelectorAll("*")].filter((e) => !e.closest(".sprite img")).filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right - 1 || b.left < r.left); })
          .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)}`);
        const p = d.querySelector(".preview").getBoundingClientRect();
        const outPreview = [...d.querySelectorAll(".preview-text, .preview-text *, .preview .sprite")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > p.right + 0.5 || b.left < p.left - 0.5); })
          .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)}`);
        out.push(...outPreview.map((x) => "outside .preview: " + x));
        const del = d.querySelector(".btn--danger").getBoundingClientRect(); const s = d.querySelector(".preview strong");
        const lines = Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight));
        return { dlg: `${Math.round(r.left)}..${Math.round(r.right)}`, scrollW: d.scrollWidth, clientW: d.clientWidth, del: `${Math.round(del.left)}..${Math.round(del.right)}`, preview: `${Math.round(p.left)}..${Math.round(p.right)}`, nameLines: lines, out: out.slice(0, 6) };
      });
      check(`${w}px modal for ${n}: content inside the dialog and preview tile, no sideways scroll`, m.out.length === 0 && m.scrollW <= m.clientW, JSON.stringify(m));
      if (w === 375 && (n === "가나다라마바" || n === "WWWWWWWWWWWW" || n === "강은호"))
        await page.locator("dialog.confirm").screenshot({ path: `${OUT}/fix1-delete-modal-375-${n === "강은호" ? "seeded" : n === "가나다라마바" ? "6char" : "12W"}.png` });
      await page.keyboard.press("Escape");
    }
    await ctx.close();
  }
} finally { for (const n of made) await del(n); await browser.close(); }
console.log(failures() ? `# ${failures()} failed` : "# all passed");

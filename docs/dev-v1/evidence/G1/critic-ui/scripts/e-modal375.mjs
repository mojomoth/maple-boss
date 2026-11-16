import { BASE, OUT, launch, check, failures, payload, importApi, del } from "./lib.mjs";
const browser = await launch();
const names = ["강은호", "가나다라마바", "abcdefghijkl", "WWWWWWWWWWWW", "검증삭제tmy"]; const made = [];
for (const n of names.slice(1)) { const [s] = await importApi(payload(n, [["카링", "Extreme", 0.5]])); if (s === 201) made.push(n); }
try {
  for (const w of [375, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 812 : 900 }, locale: "ko-KR" });
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    for (const n of ["강은호", ...made]) {
      const card = page.locator("button.card", { has: page.locator(".card-name", { hasText: new RegExp(`^${n}$`) }) });
      await card.scrollIntoViewIfNeeded(); await card.click();
      await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
      const m = await page.evaluate(() => {
        const d = document.querySelector("dialog.confirm"); const r = d.getBoundingClientRect();
        const out = [...d.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right - 1 || b.left < r.left); }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)}`);
        const cs = getComputedStyle(d);
        return { dlg: `${Math.round(r.left)}..${Math.round(r.right)}`, scrollW: d.scrollWidth, clientW: d.clientWidth, overflowX: cs.overflowX, out: out.slice(0, 6) };
      });
      check(`${w}px modal for ${n}: content inside the dialog`, m.out.length === 0 && m.scrollW <= m.clientW, JSON.stringify(m));
      if (w === 375 && n === "강은호") await page.screenshot({ path: `${OUT}/delete-modal-375-seeded.png` });
      await page.keyboard.press("Escape");
    }
    await ctx.close();
  }
} finally { for (const n of made) await del(n); await browser.close(); }
console.log(failures() ? `# ${failures()} failed` : "# all passed");

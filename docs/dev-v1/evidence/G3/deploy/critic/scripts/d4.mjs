// D-4 layout sweep on production: 3 viewports x pages; horizontal overflow, clipped text, overlapping elements; screenshots.
import { chromium } from "../../../../../../../pocs/node_modules/playwright-core/index.mjs";
const BASE = "https://maple-boss-livid.vercel.app";
const OUT = process.argv[2];
const VPS = [[1440, 900], [1920, 1080], [375, 812]];
const PAGES = [
  ["home", "/"], ["modal", "/"], ["guide", "/"], ["boss-missing", "/?q=zzz"], ["flow", "/flow"], ["import-error", "/import"], ["import-broken", "/import#%E0%A4%A"],
  ["pocs-character", "/pocs/character"], ["pocs-boss", "/pocs/boss"], ["pocs-boss-q", "/pocs/boss?q=%EA%B2%80%EB%A7%88"], ["pocs-party", "/pocs/party"], ["404", "/no-such-page"],
];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
let issues = 0;
const audit = () => {
  const vw = innerWidth;
  const out = { docW: document.documentElement.scrollWidth, vw, offRight: [], clipped: [], overlaps: [] };
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && r.width > 0 && r.height > 0 && !el.closest(".visually-hidden,[aria-hidden=true] svg"); };
  const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX)) return p; } return null; };
  const name = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.classList.length ? "." + [...el.classList].join(".") : ""}"${(el.innerText || el.getAttribute("aria-label") || el.getAttribute("alt") || "").replace(/\s+/g, " ").trim().slice(0, 30)}"`;
  const all = [...document.querySelectorAll("body *")].filter((el) => !["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "OPTION", "DATALIST"].includes(el.tagName));
  for (const el of all) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !inScroller(el) && getComputedStyle(el).position !== "fixed") out.offRight.push(`${name(el)} ${Math.round(r.left)}..${Math.round(r.right)}`);
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText && (s.overflowX !== "visible" || s.overflow !== "visible") && el.scrollWidth > el.clientWidth + 1 && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
      out.clipped.push(`${name(el)} scroll ${el.scrollWidth} > client ${el.clientWidth} (text-overflow ${s.textOverflow})`);
    if (hasText && s.overflowY !== "visible" && el.scrollHeight > el.clientHeight + 2 && !["TEXTAREA"].includes(el.tagName) && s.overflowY !== "auto" && s.overflowY !== "scroll")
      out.clipped.push(`${name(el)} scrollH ${el.scrollHeight} > clientH ${el.clientHeight}`);
  }
  // overlaps among text/interactive leaves
  const leaves = all.filter((el) => vis(el) && (["A", "BUTTON", "INPUT", "SELECT", "IMG", "H1", "H2", "H3", "LABEL", "SUMMARY", "TEXTAREA"].includes(el.tagName) || ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.querySelector("a,button,input,select,h1,h2,h3"))) && !el.closest("dialog:not([open])"));
  const dlg = document.querySelector("dialog[open]");
  const pool = dlg ? leaves.filter((el) => dlg.contains(el)) : leaves;
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    const a = pool[i], b = pool[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 2 && h > 2) {
      // ignore an element positioned over a scroller's hidden part
      out.overlaps.push(`${name(a)} x ${name(b)} (${Math.round(w)}x${Math.round(h)})`);
    }
  }
  return out;
};
for (const [w, h] of VPS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [key, path] of PAGES) {
    await page.goto("about:blank");
    const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    if (key === "modal") {
      await page.locator("button.card").first().click();
      await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
      await page.waitForTimeout(250);
    }
    if (key === "guide") {
      await page.fill("#character-name", "Wide이름WWWWWWWWWWWW".slice(0, 20));
      await page.click("button:has-text('추가')");
      await page.locator("section.guide").waitFor();
      await page.locator("summary", { hasText: "직접 붙여넣기" }).click();
      await page.waitForTimeout(250);
    }
    if (key.startsWith("import")) await page.locator(".empty-title.is-error").waitFor({ timeout: 15000 }).catch(() => {});
    const a = await page.evaluate(audit);
    const st = res?.status();
    const bad = a.docW > a.vw || a.offRight.length || a.clipped.length || a.overlaps.length;
    if (bad) issues++;
    console.log(`${bad ? "CHECK" : "ok   "} ${w}x${h} ${key} ${path} status ${st} docW ${a.docW}/${a.vw}` +
      (a.offRight.length ? `\n      off-viewport: ${a.offRight.slice(0, 6).join("; ")}` : "") +
      (a.clipped.length ? `\n      clipped: ${a.clipped.slice(0, 6).join("; ")}` : "") +
      (a.overlaps.length ? `\n      overlaps: ${a.overlaps.slice(0, 8).join("; ")}` : ""));
    if (OUT) await page.screenshot({ path: `${OUT}/d4-${key}-${w}.png`, fullPage: key !== "modal" });
    if (key === "modal") await page.keyboard.press("Escape");
  }
  if (errors.length) console.log(`  page errors at ${w}: ${errors.join(" | ").slice(0, 300)}`);
  await ctx.close();
}
await browser.close();
console.log(`# ${issues} page/viewport combos flagged for review`);

// npm run shots [-- <dir>]: screenshots of /, /pocs/character, /pocs/boss and /pocs/party at 1440x900 and 375x812
// with the system Chrome (playwright-core downloads no browser). BASE_URL as in smoke, default http://localhost:3000;
// dir defaults to docs/dev-v1/evidence/shots/. Exits 1 if a page does not answer 200 or throws in the browser.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.resolve(process.argv[2] ?? path.join(repo, "docs/dev-v1/evidence/shots"));
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGES = [
  ["home", "/"],
  ["pocs-character", "/pocs/character"],
  ["pocs-boss", "/pocs/boss"],
  ["pocs-party", "/pocs/party"],
];
const SIZES = [
  [1440, 900],
  [375, 812],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
let failures = 0;
try {
  for (const [width, height] of SIZES) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: "ko-KR", colorScheme: "dark" });
    for (const [name, url] of PAGES) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && console.log(`  console.error ${url} ${width}: ${m.text().slice(0, 200)}`));
      const res = await page.goto(BASE + url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(out, `${name}-${width}.png`);
      await page.screenshot({ path: file });
      const ok = res?.status() === 200 && errors.length === 0;
      if (!ok) failures++;
      console.log(`${ok ? "ok  " : "FAIL"} ${url} ${width}x${height} -> ${path.relative(process.cwd(), file)}  ${res?.status()}${errors.length ? ` pageerror: ${errors.join(" | ")}` : ""}`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);

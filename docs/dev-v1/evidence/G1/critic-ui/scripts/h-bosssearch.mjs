import { BASE, OUT, launch, check, failures } from "./lib.mjs";
const browser = await launch();
const state = async (p) => ({ url: p.url().replace(BASE, ""), badge: await p.locator(".boss-name .badge").innerText(), name: await p.locator(".boss-name h3").innerText(), field: await p.inputValue("#boss-q"), focus: await p.evaluate(() => document.activeElement?.id) });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  const p = await ctx.newPage();
  const navs = []; p.on("request", (r) => r.url().includes("localhost:3000/?") && navs.push(decodeURIComponent(r.url().replace(BASE, ""))));
  for (const [what, act] of [
    ["fill exact label '노말 카링' (auto-submit, no Enter)", async () => { await p.locator("#boss-q").fill("노말 카링"); }],
    ["type '노말 카링' key by key, no Enter", async () => { await p.locator("#boss-q").fill(""); await p.locator("#boss-q").pressSequentially("노말 카링", { delay: 30 }); }],
    ["type '노말 카링' key by key, then Enter", async () => { await p.locator("#boss-q").fill(""); await p.locator("#boss-q").pressSequentially("노말 카링", { delay: 30 }); await p.keyboard.press("Enter"); }],
    ["fill '카링 노말' (not a label) + Enter", async () => { await p.locator("#boss-q").fill("카링 노말"); await p.keyboard.press("Enter"); }],
  ]) {
    await p.goto(BASE + "/"); navs.length = 0;
    await p.locator("#boss-q").click();
    await act();
    await p.waitForTimeout(2500);
    const s = await state(p);
    check(what + " -> 노말 카링 shown, field says 노말 카링", s.badge === "노말" && s.name === "카링" && s.field === "노말 카링", JSON.stringify({ ...s, navs }));
  }
  // miss keeps previous boss
  await p.goto(BASE + "/?boss=normal-kaling");
  await p.locator("#boss-q").fill("없는보스"); await p.keyboard.press("Enter"); await p.waitForTimeout(2000);
  const s = await state(p);
  check("miss keeps previous boss, shows message, field keeps the typed text", s.badge === "노말" && s.field === "없는보스" && /맞는 보스가 없어요/.test(await p.locator("#boss-msg").innerText()) && (await p.getAttribute("#boss-q", "aria-invalid")) === "true", JSON.stringify(s));
  // searching the boss already shown
  await p.goto(BASE + "/"); await p.locator("#boss-q").fill("카링 익스트림"); await p.keyboard.press("Enter"); await p.waitForTimeout(2000);
  const s2 = await state(p);
  console.log("     search for the boss already shown: " + JSON.stringify(s2));
} catch (e) { check("run", false, e.stack); }
finally { await browser.close(); }
console.log(failures() ? `# ${failures()} failed` : "# all passed");

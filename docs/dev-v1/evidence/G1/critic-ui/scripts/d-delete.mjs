import { BASE, OUT, launch, check, failures, payload, importApi, del } from "./lib.mjs";
const T = Date.now().toString(36).slice(-3);
const D = `검증삭제${T}`;
const made = new Set();
const browser = await launch();
const fi = (page) => page.evaluate(() => { const a = document.activeElement; return !a || a === document.body ? "body" : `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""} [${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 16)}] inDialog=${!!a.closest("dialog")}`; });
try {
  const [s] = await importApi(payload(D, [["카링", "Extreme", 0.5]])); if (s === 201) made.add(D);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(BASE + "/");
  const card = page.locator("button.card", { hasText: D });
  const dlg = page.locator("dialog.confirm");
  // keyboard open
  await card.focus(); await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
  check("Enter on card opens modal; focus on 취소", (await fi(page)).includes("취소"), await fi(page));
  const t = await dlg.innerText();
  check("modal shows title, name, Lv/job, note", /캐릭터를 삭제할까요\?/.test(t) && t.includes(D) && /Lv\.298/.test(t) && /추천 파티가 다시 계산돼요/.test(t), t.replace(/\n/g, " "));
  const role = await dlg.evaluate((d) => ({ modal: d.matches(":modal"), label: d.getAttribute("aria-labelledby") }));
  check("dialog is modal and labelled", role.modal && role.label === "confirm-title");
  const ring = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); ring.push(await fi(page)); }
  console.log("     tab inside modal:\n       " + ring.join("\n       "));
  check("Tab stays inside the modal (or browser chrome), never on page content", ring.every((r) => r.includes("inDialog=true") || r === "body"), "");
  await page.screenshot({ path: `${OUT}/delete-modal-1440.png` });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog.confirm")?.open);
  check("Esc closes; focus back on the opener card", (await fi(page)).includes(D), await fi(page));
  // backdrop click closes
  await card.click(); await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
  await page.mouse.click(10, 10);
  check("backdrop click closes", !(await dlg.evaluate((d) => d.open)));
  // X button
  await card.click(); await page.getByRole("button", { name: "닫기", exact: true }).click();
  check("X closes", !(await dlg.evaluate((d) => d.open)));
  // server error keeps the modal with a Korean alert
  await page.route("**/api/character/*", (r) => r.request().method() === "DELETE" ? r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "캐릭터를 삭제하지 못했어요." }) }) : r.continue());
  await card.click(); await dlg.getByRole("button", { name: "삭제" }).click();
  const alert = dlg.locator("[role=alert]"); await alert.waitFor({ timeout: 10000 }).catch(() => {});
  check("DELETE 500 -> modal stays open with Korean alert, focus still in modal", (await dlg.evaluate((d) => d.open)) && /삭제하지 못했어요/.test(await alert.innerText().catch(() => "")) && (await fi(page)).includes("inDialog=true"), `${await alert.innerText().catch(() => "")} / ${await fi(page)}`);
  await page.unroute("**/api/character/*");
  // network failure (offline)
  await page.route("**/api/character/*", (r) => r.request().method() === "DELETE" ? r.abort("internetdisconnected") : r.continue());
  await dlg.getByRole("button", { name: "삭제" }).click(); await page.waitForTimeout(800);
  const off = await alert.innerText().catch(() => "");
  check("DELETE network failure -> Korean message (not 'Failed to fetch')", /[가-힣]/.test(off) && !/Failed to fetch/i.test(off), off);
  await page.unroute("**/api/character/*");
  await page.keyboard.press("Escape");
  // 375 modal
  await page.setViewportSize({ width: 375, height: 812 });
  await card.scrollIntoViewIfNeeded(); await card.click(); await page.waitForFunction(() => document.querySelector("dialog.confirm")?.open);
  const box = await dlg.boundingBox();
  check("modal fits 375 width", box && box.x >= 0 && box.x + box.width <= 375, JSON.stringify(box));
  await page.screenshot({ path: `${OUT}/delete-modal-375.png` });
  await page.setViewportSize({ width: 1440, height: 900 });
  // real delete with keyboard
  const before = await page.locator("#chars-title + .count").innerText().catch(() => page.locator(".section-head .count").first().innerText());
  await dlg.getByRole("button", { name: "취소" }).focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector("dialog.confirm")?.open, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const gone = (await card.count()) === 0;
  const after = await page.locator(".section-head .count").first().innerText();
  if (gone) made.delete(D);
  check("Tab->삭제, Enter deletes: modal closes, card gone, count decremented, focus on 내 캐릭터 heading", gone && Number(after) === Number(before) - 1 && (await fi(page)).includes("#chars-title"), `before=${before} after=${after} focus=${await fi(page)}`);
  check("server confirms deletion (404 on second DELETE)", (await del(D)) === 404);
  check("no page errors", errs.length === 0, errs.join(" | "));
  await ctx.close();
} catch (e) { check("run", false, e.stack); }
finally { for (const n of made) check(`cleanup ${n}`, (await del(n)) === 204); await browser.close(); }
console.log(failures() ? `# ${failures()} failed` : "# all passed");

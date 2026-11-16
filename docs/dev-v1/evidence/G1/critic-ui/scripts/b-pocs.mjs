import { BASE, OUT, launch, check, failures, payload, importApi, del } from "./lib.mjs";
const T = Date.now().toString(36).slice(-3);
const N = { exact: `검증정확${T}`, under: `검증미달${T}`, seven: `검증칠${T}`, four: `검증사${T}`, short: `검증부족${T}` };
const rates = { exact: 1.1, under: 1.0999, seven: 0.7, four: 0.4, short: 0.3996 };
const made = [], partyIds = [];
const browser = await launch();
try {
  for (const [k, n] of Object.entries(N)) { const [s] = await importApi(payload(n, [["카링", "Extreme", rates[k]]])); if (check(`import ${n} (${rates[k]}) -> 201`, s === 201, s)) made.push(n); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));

  // F4 main page boundary: exactly 110% solo is a party, 109.99% solo is not
  await page.goto(`${BASE}/?boss=extreme-kaling`);
  const parties = page.locator("ol.parties > li");
  const first = await parties.first().innerText();
  check("F4 / extreme-kaling: 1순위 is the exact-110% solo party", first.includes(N.exact) && /110\.0%/.test(first) && /1인 파티/.test(first), first.replace(/\n/g, " "));
  const all = await page.locator("ol.parties").innerText();
  check("F4: 109.99% solo is not offered as a 1인 party", !(await parties.filter({ hasText: N.under }).filter({ hasText: "1인 파티" }).count()), "");
  await page.locator("#party-title").scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/f4-boundary-1440.png` });

  // /pocs/character: detail with rates
  await page.goto(`${BASE}/pocs/character`);
  await page.getByRole("button", { name: /강은호/ }).click();
  await page.getByText(/보스 배율 \(60\)/).waitFor({ timeout: 10000 }).catch(() => {});
  const head = await page.locator("h2", { hasText: "보스 배율" }).innerText().catch(() => "");
  const rs = page.locator("section", { has: page.locator("h2", { hasText: "보스 배율" }) }).locator("ul li"); const rows = await rs.count();
  const firstRate = await rs.first().innerText().catch(() => "");
  const detail = await page.locator("section dl").innerText().catch(() => "");
  check("/pocs/character: click 강은호 -> detail (Lv, 직업, 월드, 전투력, 환산)", /Lv\.299/.test(detail) && /칼리/.test(detail) && /스카니아/.test(detail) && /보스300 환산/.test(detail), detail.replace(/\n/g, " "));
  check("/pocs/character: 60 rates with labels, hardest first", /\(60\)/.test(head) && rows === 60 && /익스트림 카링/.test(firstRate), `${head} rows=${rows} first=${firstRate.replace(/\n/g, " ")}`);
  await page.screenshot({ path: `${OUT}/pocs-character-detail-1440.png`, fullPage: false });
  // keyboard: Tab to a list button and press Enter
  await page.goto(`${BASE}/pocs/character`);
  await page.locator("button", { hasText: N.exact }).focus(); await page.keyboard.press("Enter");
  await page.getByText(/보스 배율 \(1\)/).waitFor({ timeout: 10000 }).catch(() => {});
  const one = await page.locator("section ul li").first().innerText().catch(() => "");
  check("/pocs/character: keyboard Enter opens imported char, rate 110.0%", /익스트림 카링/.test(one) && /110\.0%/.test(one), one.replace(/\n/g, " "));
  // 501 path (intercepted so the local crawler is not spawned)
  await page.route("**/api/character", (r) => r.request().method() === "POST" ? r.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ error: "이 서버에서는 닉네임으로 바로 불러올 수 없어요. maplescouter 결과 페이지에서 가져와 주세요.", importUrl: "https://maplescouter.com/ko/result?name=x" }) }) : r.continue());
  await page.fill("#character-name", "x"); await page.keyboard.press("Enter");
  await page.locator("p[role=alert]").waitFor();
  check("/pocs/character 501: alert + maplescouter link", (await page.getByRole("link", { name: "maplescouter에서 결과 열기" }).count()) === 1, await page.locator("p[role=alert]").innerText());
  await page.unroute("**/api/character");

  // /pocs/boss
  for (const [q, want] of [["카링", (g, r) => g.length === 1 && g[0] === "카링" && r >= 4], ["노말 카링", (g, r) => g.length === 1 && r === 1], ["카링 노말", (g, r) => g.length === 1 && r === 1], ["검은마법사", (g, r) => g.length === 1 && g[0].includes("검은 마법사")], ["가엔슬", (g, r) => g.length >= 1], ["extreme-black", (g, r) => r === 1]]) {
    await page.goto(`${BASE}/pocs/boss`);
    await page.fill("input[name=q]", q); await Promise.all([page.waitForURL(/q=/), page.keyboard.press("Enter")]);
    const g = await page.locator("section h2").allInnerTexts();
    const r = await page.locator("tbody tr").count();
    const diffs = await page.locator("tbody tr td:first-child").allInnerTexts();
    check(`/pocs/boss q="${q}"`, want(g, r), `groups=${g.join(",")} rows=${r} ${diffs.join(",")}`);
  }
  await page.goto(`${BASE}/pocs/boss?q=${encodeURIComponent("없는보스")}`);
  check("/pocs/boss no match message", (await page.getByText("‘없는보스’에 해당하는 보스가 없습니다.").count()) === 1);
  await page.goto(`${BASE}/pocs/boss?q=${encodeURIComponent("노말 카링")}`);
  const row = await page.locator("tbody tr").first().innerText(); const img = await page.locator("section img").first().evaluate((i) => i.complete && i.naturalWidth > 0);
  check("/pocs/boss row has image, Lv, HP, 방어율, 포스, 최대 인원", img && /\d/.test(row) && /%/.test(row) && /어센틱|아케인/.test(row) && /인/.test(row), row.replace(/\s+/g, " "));
  await page.screenshot({ path: `${OUT}/pocs-boss-search-1440.png` });

  // /pocs/party
  const reg = async (name, size) => {
    await page.goto(`${BASE}/pocs/party`);
    const f = page.locator("form").first();
    await f.locator("select[name=characterName]").selectOption(name);
    await f.locator("select[name=bossId]").selectOption("extreme-kaling");
    await f.locator("select[name=partySize]").selectOption(String(size));
    await f.getByRole("button", { name: "구직 등록" }).click();
    await f.locator("p").filter({ hasText: /구직 등록 완료|[가-힣]/ }).waitFor({ timeout: 10000 }).catch(() => {});
    return f.locator("p").innerText().catch(() => "");
  };
  for (const k of ["seven", "short", "four"]) { const m = await reg(N[k], 2); check(`/pocs/party 구직 등록 ${N[k]} 2인`, /구직 등록 완료/.test(m), m); }
  await page.goto(`${BASE}/pocs/party`);
  const b = page.locator("section", { hasText: "보스별 구직 현황" });
  await b.locator("select[name=builderBossId]").selectOption("extreme-kaling");
  const opt = await b.locator("select[name=builderBossId] option:checked").innerText();
  check("builder boss option shows 구직 3명", /구직 3명/.test(opt), opt);
  await b.locator("select[name=builderSize]").selectOption("2");
  await b.getByLabel(`${N.seven} 선택`).check(); await b.getByLabel(`${N.short} 선택`).check();
  let line = await b.locator("p", { hasText: "합계" }).innerText();
  check("builder 0.7+0.3996: 109.9% 공략 불가 (0.1% 부족)", /합계 109\.9%/.test(line) && /공략 불가 \(0\.1% 부족\)/.test(line), line);
  check("third checkbox disabled at size 2", await b.getByLabel(`${N.four} 선택`).isDisabled());
  await b.getByLabel(`${N.short} 선택`).uncheck(); await b.getByLabel(`${N.four} 선택`).check();
  line = await b.locator("p", { hasText: "합계" }).innerText();
  check("builder 0.7+0.4 (float 1.0999999999999999): 110.0% 공략 가능", /합계 110\.0%/.test(line) && /공략 가능/.test(line), line);
  await page.screenshot({ path: `${OUT}/pocs-party-110-1440.png` });
  await b.getByRole("button", { name: "파티 편성" }).click();
  const msg = b.locator("p", { hasText: "편성 완료" }); await msg.waitFor({ timeout: 10000 }).catch(() => {});
  const mt = await msg.innerText().catch(() => "(none)");
  check("파티 편성 -> message with 110.0% 공략 가능", /110\.0% · 공략 가능/.test(mt), mt);
  const id = Number(mt.match(/#(\d+)/)?.[1]); if (id) partyIds.push(id);
  await page.waitForTimeout(800);
  const saved = page.locator("section", { hasText: "편성된 파티" }).locator("li").first();
  const st = await saved.innerText();
  check("saved list top: 익스트림 카링 합계 110.0% 공략 가능 + members", /익스트림 카링/.test(st) && /합계 110\.0%/.test(st) && /공략 가능/.test(st) && st.includes(N.seven) && st.includes(N.four), st.replace(/\n/g, " "));
  // unclearable party saved
  await page.reload(); 
  await b.locator("select[name=builderBossId]").selectOption("extreme-kaling");
  const left = await b.locator("tbody tr").count();
  check("formed members' requests closed (only 1 seeker left)", left === 1, left);
  await b.locator("select[name=builderSize]").selectOption("2");
  await b.getByLabel(`${N.short} 선택`).check(); await b.getByRole("button", { name: "파티 편성" }).click();
  const m2 = b.locator("p", { hasText: "편성 완료" }); await m2.waitFor({ timeout: 10000 }).catch(() => {});
  const mt2 = await m2.innerText().catch(() => "(none)"); const id2 = Number(mt2.match(/#(\d+)/)?.[1]); if (id2) partyIds.push(id2);
  check("unclearable party saved with 39.9% 공략 불가", /39\.9% · 공략 불가/.test(mt2), mt2);
  await page.waitForTimeout(800);
  const st2 = await page.locator("section", { hasText: "편성된 파티" }).locator("li").first().innerText();
  check("saved list shows 공략 불가 verdict", /공략 불가/.test(st2), st2.replace(/\n/g, " "));
  await page.screenshot({ path: `${OUT}/pocs-party-saved-1440.png`, fullPage: true });
  // invalid request: API error message surfaces
  check("no page errors", errs.length === 0, errs.join(" | "));
  await ctx.close();
} catch (e) { check("run", false, e.stack); }
finally {
  for (const id of partyIds) check(`cleanup party ${id}`, (await fetch(`${BASE}/api/party/${id}`, { method: "DELETE" })).status === 204);
  for (const n of made) check(`cleanup ${n}`, (await del(n)) === 204);
  await browser.close();
}
console.log(failures() ? `# ${failures()} failed` : "# all passed");

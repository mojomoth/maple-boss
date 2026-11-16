import { BASE, OUT, launch, check, failures, payload, importApi, del } from "./lib.mjs";
const T = Date.now().toString(36).slice(-3);
const A = `검증더블${T}`; const made = []; const parties = [];
const [s] = await importApi(payload(A, [["카링", "Extreme", 1.2]])); if (s === 201) made.push(A);
await fetch(`${BASE}/api/party/requests`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ characterName: A, bossId: "extreme-kaling", partySize: 1 }) });
const browser = await launch();
try {
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(`${BASE}/pocs/party`);
  const b = p.locator("section", { hasText: "보스별 구직 현황" });
  await b.locator("select[name=builderBossId]").selectOption("extreme-kaling");
  await b.locator("select[name=builderSize]").selectOption("1");
  await b.getByLabel(`${A} 선택`).check();
  const posts = []; p.on("response", (r) => r.url().endsWith("/api/party") && r.request().method() === "POST" && posts.push(r.status()));
  await b.getByRole("button", { name: "파티 편성" }).dblclick();
  await p.waitForTimeout(2500);
  const msg = await b.locator("p.text-sm.text-neutral-400").last().innerText().catch(() => "");
  const list = await (await fetch(`${BASE}/api/party`)).json();
  for (const x of list.filter((x) => x.members.some((m) => m.name === A))) parties.push(x.id);
  console.log(`     POST /api/party statuses: ${posts.join(",")}; parties saved for ${A}: ${parties.length}; message: ${msg}`);
  check("double-click 파티 편성: one party, success message kept", parties.length === 1 && /편성 완료/.test(msg), msg);
} finally {
  for (const id of parties) await fetch(`${BASE}/api/party/${id}`, { method: "DELETE" });
  for (const n of made) await del(n); await browser.close();
}
console.log(failures() ? `# ${failures()} failed` : "# all passed");

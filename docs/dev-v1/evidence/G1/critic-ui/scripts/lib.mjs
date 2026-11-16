import { chromium } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/node_modules/playwright-core/index.mjs";
import { readFileSync } from "node:fs";
export const BASE = "http://localhost:3000";
export const OUT = "/Users/jeongyounglee/work/repo/maple-boss/docs/dev-v1/evidence/G1/critic-ui";
export const SAMPLES = "/Users/jeongyounglee/work/repo/maple-boss/docs/research/samples";
export const launch = () => chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
let fails = 0;
export const check = (label, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== "" ? "  | " + String(detail).slice(0, 300) : ""}`); if (!ok) fails++; return ok; };
export const failures = () => fails;
export const sample = (file) => JSON.parse(readFileSync(`${SAMPLES}/${file}`, "utf8"));
// trimmed v1 payload with given name and only the given cuts
export const payload = (name, cuts) => {
  const sr = sample("아델.json"); const i = sr.userApiData.info; const c = sr.calculatedData;
  return { v: 1, info: { character_name: name, world_name: i.world_name, character_class: i.character_class, character_level: i.character_level, character_image: i.character_image },
    calc: { combatPower: c.combatPower, boss300_stat: c.boss300_stat, boss380_stat: c.boss380_stat, bossCuts: cuts.map(([boss, difficulty, clearRate]) => ({ boss, difficulty, clearRate, analytics: "검증", bossStat: 100 })) } };
};
export const importApi = async (body) => { const r = await fetch(`${BASE}/api/character/import`, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }); return [r.status, await r.json().catch(() => null)]; };
export const del = async (name) => (await fetch(`${BASE}/api/character/${encodeURIComponent(name)}`, { method: "DELETE" })).status;

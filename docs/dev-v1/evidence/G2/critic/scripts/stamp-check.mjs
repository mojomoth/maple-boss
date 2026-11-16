import { readFileSync } from "node:fs";
import { parseFlow, flowHash, readStamp, stampLine } from "/Users/jeongyounglee/work/repo/maple-boss/pocs/app/flow/flow.mjs";
const base = JSON.parse(readFileSync("/tmp/g2critic/docs-real/flow.json", "utf8"));
for (const u of ["2026-11-17 02:00", "Nov 17 2026 02:00", "2026-11-17T02:00:00+09:00", "2026-11-17", "2026/11/17", "17 November 2026 --> x"]) {
  const f = { ...base, updatedAt: u };
  let ok = true, msg = "";
  try { parseFlow(JSON.stringify(f)); } catch (e) { ok = false; msg = e.message.split("\n").slice(-1)[0]; }
  const st = ok ? readStamp(stampLine(f)) : null;
  console.log(JSON.stringify(u), ok ? `accepted; stamp parsed back=${!!st} hashMatch=${st?.hash === flowHash(f)}` : `rejected ${msg}`);
}

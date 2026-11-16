# Maple Boss PoC — Orchestration Plan

A single Next.js 15 app lives at `pocs/`. SQLite runs on Node 26's built-in `node:sqlite` (`pocs/lib/db.ts`, DB file at `pocs/data/maple.db`).

## Folder ownership (each agent edits only its own area)

| PoC | Logic | Routes | Owner |
|---|---|---|---|
| 1. Character | `pocs/character/`, `pocs/crawler/` | `pocs/app/character/`, `pocs/app/api/character/` | character agent |
| 2. Boss | `pocs/boss/`, `pocs/public/bosses/` | `pocs/app/boss/`, `pocs/app/api/boss/` | boss agent |
| 3. Party | `pocs/party/` | `pocs/app/party/`, `pocs/app/api/party/` | party agent |
| Shared | `pocs/lib/types.ts`, `pocs/lib/db.ts`, `pocs/app/page.tsx`, `layout.tsx` | | orchestrator |

Contract: the party PoC imports only `listCharacters/getCharacter` from `@/character` and `listBosses/getBoss` from `@/boss`. Types live in `pocs/lib/types.ts`.

## Data source facts (from the orchestrator's recon on 2026-11-16)

- maplescouter.com is a Next.js SPA behind Cloudflare. Character data comes from `https://api.maplescouter.com/api/id?name=<name>&preset=00000&region=kms`, and that API is gated by a **Cloudflare Turnstile human check** ("사람 확인이 필요해요"). After a human passes the check, the rest of that browser session works for about 10 minutes.
- Once the page loads, the whole payload sits in `localStorage['character-store']` → `state.searchResult`. Schema sample: `docs/research/character-store.json`. That sample is the **default placeholder** (name `으낭다`, image `/images/monster.png`, `bossCuts: []`), not real data.
  - `userApiData.info`: `character_name, world_name, character_class, character_level, character_image, ...`
  - `calculatedData`: `combatPower, boss300_stat, boss380_stat, boss300_hexaStat, boss380_hexaStat, class, bossCuts[]`
- The boss-cut box (the selector in the user's spec) renders from `calculatedData.bossCuts`. With the real payload, each boss gets a `% multiplier` (the `cursor-help` text).
- **Policy:** no automatic CAPTCHA or Turnstile solving (no `solve_cloudflare` or similar flags). The crawler opens a visible browser with a persistent profile, and **a human (the HIL operator) clicks the check**.

## Party rule (confirmed by the operator on 2026-11-16, after the live crawl)

- A live crawl of 강은호 is saved at `docs/research/samples/강은호.json`. `calculatedData.bossCuts` has 60 entries: `{boss, difficulty, bossStat, clearRate, bossPower, analytics, isPartyBoss, isPartyLimit, bossNewbie}`.
- `clearRate` is a **damage ratio** and is not linear in 환산. For example, 익스트림 카링 is 0.935 and 노말 스우 is 17832.
- Party rule: `sum(clearRate of members) >= 1.10` means clearable. The old `환산/cut` rule and the `cut` field are removed.
- The boss list follows maplescouter's 60 entries. Difficulties are Easy, Normal, Hard, Chaos, Extreme, Destiny and Champion. Bosses: 가엔슬, 검은 마법사, 대적자, 더스크, 데미안, 듄켈, 루시드, 림보, 발드릭스, 벨로나, 세렌, 스우, 윌, 유피테르, 진 힐라, 카링, 칼로스, 흉성.
- Characters without crawled bossCuts (fixtures) have no clearRate and are excluded from party matching. Real test characters are crawled after the operator supplies nicknames.
- Party save policy: a party under 110% is still saved and marked 공략 불가, and ratios are snapshotted when the party is formed.

## Tools

- Ponytail (`.claude/skills/ponytail/SKILL.md`): smallest code that works, with tests only for risky logic.
- Hallmark (`.claude/skills/hallmark/SKILL.md`): final design pass that strips AI-slop tells. The functional agents keep their UI plain and do no design work.

## Dev server

One shared `next dev` runs on http://localhost:3000, started by the orchestrator. Agents must **not** start another `next dev` in `pocs/`, because a second one corrupts `.next`. Test with `curl localhost:3000/...` and `npx tsc --noEmit`.

## HIL checkpoints (operator)

1. After phase 1: open `/character`, `/boss` and `/party` with fixture data and check the flows.
2. Live crawl: run the crawler, then click the Turnstile check in the browser window that opens.
3. After the real `bossCuts` capture: confirm the multiplier formula and the boss cut values.
4. After the hallmark pass: review the design.

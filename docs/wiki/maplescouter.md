# maplescouter 데이터 출처

캐릭터 정보와 보스별 `clearRate`는 모두 maplescouter.com에서 온다. API가 사람 확인(Cloudflare Turnstile) 뒤에 있어서 사람이 직접 통과해야 한다.

## 요청 경로

- 원래 요구사항은 maplescouter를 참고하고 크롤링해도 된다고 했다 ([CONTEXT][ctx]).
- maplescouter.com은 Cloudflare 뒤의 Next.js SPA다. 캐릭터 데이터는 `https://api.maplescouter.com/api/id?name=<이름>&preset=00000&region=kms`에서 온다 ([POC_PLAN][poc]).
- 이 API는 Turnstile 사람 확인("사람 확인이 필요해요") 뒤에 있다. 한 번 통과하면 그 브라우저 세션은 약 10분 동안 계속 쓸 수 있다 ([POC_PLAN][poc]).

## 정책: 자동 우회 금지

- CAPTCHA·Turnstile을 자동으로 풀지 않는다 (`solve_cloudflare` 같은 옵션 금지). 크롤러는 보이는 브라우저를 영구 프로필로 열고 사람이 체크를 누른다 ([POC_PLAN][poc], [crawl.py][py]).
- 서버(Vercel)에는 체크를 누를 사람이 없으므로 v1은 사용자가 결과 페이지를 직접 열고 북마클릿이나 붙여넣기로 데이터를 넘긴다 ([DECISIONS D2][dec]). 흐름은 [deployment](deployment.md)에 있다.

## character-store 구조

페이지가 뜨면 전체 데이터가 `localStorage['character-store']` → `state.searchResult`에 들어 있다 ([POC_PLAN][poc]).

| 경로 | 쓰는 필드 |
|---|---|
| `userApiData.info` | `character_name`, `world_name`, `character_class`, `character_level`, `character_image` 등 |
| `calculatedData` | `combatPower`, `boss300_stat`, `boss380_stat`, `boss300_hexaStat`, `boss380_hexaStat`, `class`, `bossCuts[]` |
| `calculatedData.bossCuts[]` | `boss`, `difficulty`, `bossStat`, `clearRate`, `bossPower`, `analytics`, `isPartyBoss`, `isPartyLimit`, `bossNewbie` |

(표 출처: [POC_PLAN][poc])

- `bossCuts`는 실측 데이터에서 60개다. 각 항목이 보스 × 난이도 하나다 ([POC_PLAN][poc]). 값의 뜻은 [clear-rate](clear-rate.md).
- [character-store.json][store]은 store 전체(`{ state: { searchResult, isLoading, error }, version }`)지만 값은 기본 자리표시자다. 이름 `으낭다`, 그림 `/images/monster.png`, `bossCuts: []` ([POC_PLAN][poc]).
- 실측 샘플은 [samples/][samples]의 강은호·아델·고딩 3명이고 2026-11-16에 크롤했다 ([POC_PLAN][poc]). 이 파일들은 store 전체가 아니라 `searchResult` 객체만 담는다 ([강은호.json][kang]).
- [bossbox.json][bb1]과 [bossbox2.json][bb2]는 결과 페이지의 보스컷 상자 DOM 정찰 결과다. 기본값 페이지라 카드가 0개이고, 섹션 안내 문구만 남아 있다.

## 가져오기와 크롤러

- `POST /api/character/import`는 store 전체, `state`, `searchResult`, 또는 북마클릿이 줄인 payload를 받아 `Character` 201 또는 400을 돌려준다 ([PLAN][plan]).
- v1에서는 매핑을 TS 한 곳(`character/parse.ts`)에서 하고 크롤러는 원본 `searchResult`만 출력한다 ([DECISIONS D2][dec]). 2026-11-17 기준 이 파일은 아직 없고, [crawl.py][py]가 Python에서 매핑까지 해서 `{"character", "raw"}`를 출력한다.
- 로컬 크롤러 사용법: `crawl.py <이름>`(보이는 브라우저, 180초 대기). 원본 `searchResult`만 출력하고, 매핑은 `pocs/character/parse.ts`가 한다. 종료 코드 2는 캐릭터 없음 ([crawl.py][py]). 2026-11-17에 `--from-file`을 없앴다.
- 서버 래퍼는 종료 코드 2를 404, 시간 초과를 504, 그 밖의 실패를 502로 바꾼다 ([crawl.ts][ts]).

[ctx]: ../MAPLE_BOSS_CONTEXT.md
[poc]: ../POC_PLAN.md
[plan]: ../dev-v1/PLAN.md
[dec]: ../dev-v1/DECISIONS.md
[store]: ../research/character-store.json
[samples]: ../research/samples/
[kang]: ../research/samples/강은호.json
[bb1]: ../research/bossbox.json
[bb2]: ../research/bossbox2.json
[py]: ../../pocs/crawler/crawl.py
[ts]: ../../pocs/character/crawl.ts

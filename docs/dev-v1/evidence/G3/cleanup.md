# G3 정리(ponytail) 결과

2026-11-17. `pocs/` 전체에서 안 쓰는 것을 지우고, 과한 코드를 동작이 같은 범위에서만 줄였다. 하네스·테스트·시드·크롤러·근거 파일은 건드리지 않았다. 키 노출 검사는 [`secrets-scan.txt`](secrets-scan.txt)에 있다.

찾은 방법(스크립트는 `scripts/cleanup/`, 정리 뒤 출력은 `cleanup-logs/`):

| 스크립트 | 찾는 것 |
|---|---|
| `exports.mjs pocs` | export마다 자기 파일 밖에서 이름을 쓰는 파일 수 |
| `css.mjs pocs` | CSS 클래스 선택자 가운데 `app/` 소스 어디에도 없는 것 |
| `tokens.mjs pocs` | 선언했지만 `var(--x)`로 읽는 곳이 없는 사용자 정의 속성 |
| `classnames.mjs pocs` | TSX가 쓰는 클래스 가운데 우리 CSS에 없는 것(Tailwind 유틸리티 사용 여부) |
| `pages.mjs <폴더>`, `pxdiff.mjs a b` | 7개 화면 전체 페이지 + 삭제 모달 + /flow 단계 패널, 1440·375 캡처와 픽셀 비교 |

정리 전 출력(이 작업 기록에서 옮김): `css.mjs`는 동적 클래스(`flow-*--${status}`, `sprite--${size}`) 말고 `.container`, `.figure`, `.keep-motion`을 냈다. `tokens.mjs`는 토큰 23개를 냈다(아래 9번). `exports.mjs`가 낸 "외부 사용 0"은 Next 규칙 export(page, layout, proxy)와 `OFFLINE`, `BossCut`, `StatBasis`, `Difficulty`였다. `classnames.mjs`는 `foot` 하나 말고는 식의 조각(`noto.variable`의 `variable` 등)만 냈다. 즉 TSX에 Tailwind 유틸리티 클래스는 0개다.

## 지운 것

| # | 무엇 | 파일 | 안 쓰인다는 근거 |
|---|---|---|---|
| 1 | create-next-app 템플릿 README를 실제 README로 바꿈(하는 일, Node 24 로컬 실행, 크롤러 준비, 하네스 명령, 배포, 문서 링크) | `pocs/README.md` | 템플릿 문구였다. Geist 폰트(앱은 `Noto_Sans_KR`), `app/page.tsx` 편집 안내, Vercel 홍보 링크. |
| 2 | 기본 Vercel 삼각형 favicon을 프로젝트 마스코트로 바꿈. 원본은 `assets/maple-boss-logo.webp`이고 591×591로 자른 뒤 48px ICO로 만들었다(sips). | `pocs/app/favicon.ico` | 74c11ae부터 있던 create-next-app 기본 아이콘(sha1 `9ecfcc8f…`)이다. 파일 이름이 같아 Next가 그대로 서빙한다. `GET /favicon.ico`는 200 `image/x-icon`이고 `<link rel="icon" … sizes="48x48">`가 붙는다. |
| 3 | `.container` 규칙 | `app/base.css` | TSX에 `container` 클래스가 없다(`css.mjs`). Hallmark 스캐폴드에서 남은 것이다. 페이지 틀은 `.shell`이 한다. |
| 4 | `.figure`, `td.num` 선택자(`.num`만 남김) | `app/base.css` | `figure` 클래스는 없다. `td.num`은 `.num`이 이미 덮는다. |
| 5 | `[data-slot]` 규칙 3개 | `app/base.css` | `data-slot`, `data-keep` 속성을 쓰는 곳이 없다(grep 0, base.css에만 있음). |
| 6 | `img, video`에서 `video` | `app/base.css` | `<video>`가 없다. |
| 7 | 모션 줄이기 규칙의 `:not(.keep-motion)` 예외 | `app/base.css` | `keep-motion` 클래스가 없다. 이 선언들은 `!important`라 선택자 구체도가 낮아져도 결과가 같다. 다른 `!important` 애니메이션·트랜지션 선언은 없다. |
| 8 | 반응형 `:root`의 `--section-gap-s/-/-l`, `--gap-columns` 재정의 | `app/base.css` | 읽는 곳이 없다(`tokens.mjs`). `--gutter` 재정의는 `.shell`이 읽으므로 남겼다. |
| 9 | 토큰 23개: `--space-4xl`, `--text-display-s`, `--text-display`, `--text-section`, `--text-title`, `--text-lead`, `--ease-in`, `--ease-in-out`, `--dur-short`, `--dur-long`, `--gap-columns`, `--section-gap-s`, `--section-gap`, `--section-gap-l`, `--z-raised`, `--z-dropdown`, `--z-sticky`, `--z-sticky-nav`, `--z-toast`, `--z-tooltip`, `--color-success`, `--font-outlier`, `--shadow-card` | `app/tokens.css` | `var(--x)`로 읽는 CSS·TSX가 없다(`tokens.mjs`, 정리 뒤 출력은 `.btn--x` 선택자 오탐 3개뿐). Hallmark sloplint가 읽는 토큰(`--color-paper`, `--color-accent(-ink)`, `--font-display`, `--font-body`)은 남겼다. sloplint 결과는 정리 전후가 같다. |
| 10 | `.msg.is-ok` | `app/pocs/pocs.css` | `msg` 요소에 `is-ok`가 붙는 곳이 없다. `is-ok`는 `.sum-bar`에만 쓴다. |
| 11 | `.field:disabled`, `.icon-btn:disabled` | `app/home.css` | `disabled`가 되는 `.field`나 `.icon-btn`이 없다. 닉네임 칸은 `readOnly`를 쓴다. 비활성은 `.btn`(규칙 있음)과 체크박스뿐이다. |
| 12 | `<footer className="foot">`의 클래스 | `app/page.tsx`, `app/flow/page.tsx` | `.foot` 규칙이 없다(`.foot-row`, `.foot-nav`만 있다). 근거 스크립트(G2·G3 `scripts/`)도 이 선택자를 쓰지 않는다. |
| 13 | `bosses.length === 0` 분기 2개와 문구 "보스 데이터가 없어요." | `app/pocs/party/page.tsx` | `listBosses()`는 고정 배열 `BOSSES`를 돌려준다. 60개이고 `boss.test.ts`가 60을 확인한다. 그래서 이 분기에는 갈 수 없다. `RequestForm`은 원래 `bosses[0]`을 가정한다. |
| 14 | `export const runtime = "nodejs"` 5개 | `app/api/character/route.ts`, `…/[name]`, `…/import`, `…/rates`, `app/api/health/route.ts` | Next 16 기본값이 `nodejs`다. Next 문서(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`)도 export를 지우라고 한다. 같은 DB를 쓰는 파티 라우트 3개에는 원래 없었다. 빌드 라우트 표는 `copy-p2/build.txt`와 같다. |
| 15 | `OFFLINE`의 `export`(모듈 안 상수로) | `app/messages.ts` | 다른 파일에서 import하지 않는다. 화면은 `errorText`로 이 문구를 쓴다. |
| 16 | 낡은 주석 | 아래 | 지금 동작과 맞지 않는다. |

16번 주석:

- `character/index.ts`: `// last one wins, like INSERT OR REPLACE did`는 SQLite 시절 구문이라 "two cuts for one boss: the last one wins"로 바꿨다. 머리말 "Public interface of the character PoC. Party PoC imports …"는 PoC 1차 에이전트 분담 때 말이라 이 모듈이 하는 일로 바꿨다.
- `boss/index.ts`: `Owner: boss agent.`를 지웠다. 그 에이전트 분담은 이제 없다.
- `boss/data.ts`: "Type-only imports so `node --test` can load this file without the `@/` alias"를 지웠다. `resolve-hooks.mjs`가 `@/`를 푼다(DECISIONS D10).
- `boss/search.ts`: 같은 이유("so `node --test` can load")를 지웠다. 대신 지금도 맞는 이유를 적었다. 타입 전용 import라야 보스 표(`data.ts`)가 클라이언트 번들에 들어가지 않는다.
- `party/ratio.ts`: "(no imports, so `node --test` can load this file)"를 지웠다.
- `app/globals.css`: "the PoC pages' Tailwind utilities still win over them"을 고쳤다. PoC 화면은 G3 디자인 패스에서 `pocs.css`로 바뀌었고 유틸리티 클래스는 0개다. Tailwind는 이제 리셋(preflight)만 맡는다고 적었다.
- 지시에 나온 다른 예시도 찾았다. `pocs/` 코드에서 sqlite, seed 라우트, `--from-file`을 grep하면 위의 `INSERT OR REPLACE` 하나만 나왔다. seed 라우트는 62727d2에서, `--from-file`은 G1에서 이미 지워졌다.

## 단순하게 바꾼 것 (동작 같음)

| 무엇 | 전 | 후 | 같은 이유 |
|---|---|---|---|
| 포스 이름표 중복 | `app/page.tsx`의 `FORCE`와 `app/pocs/boss/page.tsx`의 `FORCE_LABEL`이 같은 객체 | `boss/search.ts`의 `FORCE_LABEL` 하나. `DIFFICULTY_LABEL` 옆에 둠 | 값이 같다. 두 화면 캡처가 정리 전과 바이트 단위로 같다. |
| 타입 꼬기 | `new Map<string, Payload["calc"]["bossCuts"][number]>()` | `new Map<string, BossCut>()` | `parse.ts`가 이미 export하던 같은 타입이다. `tsc` 통과. |
| 크롤러 가용성 이중 검사 | `crawlCharacter`가 `crawlerAvailable()`를 다시 보고, 같은 501 문구 사본으로 reject | 검사와 문구 사본을 지우고 주석에 호출자가 검사한다고 적음 | 유일한 호출자 `POST /api/character`가 먼저 검사하고 같은 501을 낸다. 달라지는 경우는 두 호출 사이(마이크로초)에 venv가 사라질 때뿐이다(501 대신 502). 크롤러 없는 프로덕션 서버에서 smoke를 돌려 501 경로를 확인했다. |
| 도달 불가 분기 | 위 13번 | | |

## 살펴보고 남긴 것

| 무엇 | 남긴 이유 |
|---|---|
| `tailwindcss`, `@tailwindcss/postcss`, `postcss.config.mjs` | 유틸리티는 안 쓰지만 preflight가 모든 화면의 기본값을 깐다(margin 0, `list-style: none`, `border: 0 solid`, 버튼 배경 등). 빼려면 리셋을 `base.css`로 옮기고 전 화면 회귀를 봐야 한다. 지울 수 있는 의존성이 아니라 바꿔 끼우는 일이다. 빌드 CSS의 utilities 층에는 소스 낱말에서 생긴 9개(`.table`, `.grid`, `.hidden` 등)만 있다. 그중 화면 요소에 붙는 것은 `<table class="table">`의 `display: table` 하나이고 기본값과 같다. |
| `lib/types.ts`의 `StatBasis`, `Difficulty` export | 다른 파일에서 import하지 않지만 타입 전용이라 빌드에서 사라진다. 이 파일은 공유 계약 파일이다. |
| `FormedParty`, `Seeker` 등 계약 타입 export | `PLAN.md` API 계약 표가 이 이름을 쓴다. |
| 로고 링크 마크업 5벌(`page.tsx`, `StatusScreen`, `pocs/layout`, `flow/page`, `import/page`) | 감싸는 태그가 `h1`과 `div`로 다르다. 합치면 제목 구조가 바뀐다. 마크업 중복이지 과한 코드는 아니다. |
| `.flow-top`과 `.pocs-top`(같은 규칙 두 벌) | 서로 다른 화면 CSS에 있다. 합치려면 `home.css`로 옮기고 클래스 이름을 바꿔야 해서 이득이 작다. |
| `/import` 화면과 `StatusScreen` 틀 중복 | `StatusScreen`을 쓰면 로고 `h1`과 제목 `h2`가 바뀐다. 동작이 같지 않다. |
| `BossRow`(`pocs/boss/page.tsx`), `groupBosses`(`party/labels.ts`) | 한 번만 쓰지만 래퍼가 아니라 표 행 마크업과 정렬 로직 단위다. |
| `dynamic = "force-dynamic"`(`/pocs/party`), `"force-static"`(`/flow`) | 앞의 것이 없으면 빌드 때 DB를 읽어 화면이 굳는다. 뒤의 것은 빌드 때 한 번 읽는다는 의도를 지킨다. |
| `PartyBuilder`의 `sending` ref와 `busy` state | P2-3(더블클릭 두 번 전송) 수정이다. ref는 바로 막고 state는 버튼을 비활성화한다. |
| `/import`의 클라이언트 JSON 검사, 붙여넣기의 빈 값 검사 | 서버도 검사하지만 문구가 다르다. 깨진 북마클릿 데이터와 붙여넣기 안내가 따로 있다. 지우면 사용자에게 보이는 문구가 바뀐다. |
| `pocs/data/maple.db*`(SQLite 시절 로컬 DB, 약 5MB) | git과 Vercel 모두 무시하고 코드가 읽지 않는다. 사용자 로컬 데이터라 지우지 않았다. 필요 없으면 직접 지우면 된다. |
| `node_modules`의 extraneous 2개(`@img/sharp-wasm32`, `@emnapi/runtime`) | lockfile에 있는 다른 플랫폼용 선택 의존성이다. `package.json`과 앱 코드와는 관계없다. |
| `docs/POC_PLAN.md`, `docs/MAPLE_BOSS_CONTEXT.md`의 SQLite·Next 15 | 원본(요구사항) 문서다. 위키 로그와 `deployment.md`가 D1·D6로 바뀌었다고 이미 적어 두었다. |
| `pocs/AGENTS.md`, `.vercel/`, `.hallmark/` | `next dev`가 다시 만들거나 도구가 쓰는 파일이다. 앞의 둘은 git이 무시한다. |
| 하네스, 테스트, `seed/`, `crawler/`, 근거 | 지시대로 그대로 두었다. |

## 검증

| 명령 | 결과 | 기록 |
|---|---|---|
| `npm test` | 40/40 통과 | `cleanup-logs/npm-test.txt` |
| `npx tsc --noEmit` | 오류 없음 | `cleanup-logs/tsc.txt` |
| `npm run lint` | 오류 없음 | `cleanup-logs/lint.txt` |
| `npm run build` | 성공. 라우트 18개와 Proxy | `cleanup-logs/build.txt` |
| `npm run smoke` (dev, 크롤러 있음) | 67/67 | `cleanup-logs/smoke.txt` |
| `npm run smoke` (`VERCEL=1 next start -p 3100`, 크롤러 없음) | 67/67. 501 + `importUrl` 경로 포함 | `cleanup-logs/smoke-prod-no-crawler.txt` |
| `node scripts/import-e2e.mjs` (같은 서버) | 22개 ok, 실패 0 | `cleanup-logs/import-e2e.txt` |
| `npm run shots docs/dev-v1/evidence/G3/after-cleanup/` | 8/8 ok | `after-cleanup/*.png`, `cleanup-logs/shots.txt` |
| 정리 전후 캡처 비교 | `npm run shots` 8장 모두 바이트 동일. 전체 페이지 18장은 모두 정리 뒤 실행 중 한 번 이상 바이트 동일. 다른 경우는 같은 코드에서도 오가는 이미지 리샘플·모서리 안티에일리어싱 몇 px | `cleanup-logs/pixel-compare.txt` |
| Hallmark sloplint (`app`, modern-minimal) | 정리 전후 모두 FAIL 0, WARN 0. 줄 번호만 바뀜 | `cleanup-logs/sloplint-before.txt`, `sloplint-after.txt` |
| 정리 뒤 분석 스크립트 | 남은 "안 쓰임"은 위 "남긴 것"과 동적 클래스, 오탐뿐 | `cleanup-logs/unused-*.txt`, `undefined-classes-after.txt` |

dev 서버는 처음부터 떠 있던 `next dev` 하나(:3000)만 썼다. 크롤러 없는 확인용 `next start`(:3100)는 확인이 끝나고 내렸다.

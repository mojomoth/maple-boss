# G3 P2 백로그 처리 결과

2026-11-17. `STATUS.md`의 "P2 백로그 (G1 Critic)" 표를 한 줄씩 처리한 결과다. 근거 파일은 모두 `evidence/G3/copy-p2/` 아래에 있다.

결과: 18줄 가운데 17줄을 고쳤다. SPIKE는 인프라 항목이라 이번 범위에서 뺐다.

| ID | 결과 | 무엇을 했나 | 근거 |
|---|---|---|---|
| API-1, P2-5 | 고침 | `character/parse.ts`가 이름 `.`과 `..`을 공백을 잘라낸 뒤 400으로 거절한다. 메시지는 "‘..’은 캐릭터 이름으로 쓸 수 없어요."다. URL이 경로에서 `.`과 `..`을 지우기 때문에 이런 캐릭터는 `DELETE /api/character/..`로 지울 수 없었다(`%2e%2e`, `--path-as-is`로도 308). `a.b`처럼 이름 안에 점이 있는 경우는 그대로 받는다. | `character/parse.test.ts`, `api-probe-after.txt`, `smoke.txt` |
| API-2 | 고침 | clearRate 상한을 1,000,000(100,000,000%)으로 정했다. 실제 최대치인 노말 스우 17,832는 받는다. 6명을 더해도 합계가 유한해서 `sum: null`이 나오지 않는다. 1e308과 2e6은 400이다. | `parse.test.ts` ("clearRate 1e308", "accepts the edges"), `api-probe-after.txt` |
| API-3 | 고침 | 저장하는 모든 문자열에서 NUL과 짝 없는 서로게이트를 400으로 거절한다("`<경로>` 값에 쓸 수 없는 문자가 있어요."). 대상은 이름, 월드, 직업, analytics, 이미지 URL이다. 같은 검사(`storable`)를 이름 조회에도 썼다. 그래서 `GET rates?name=%00`과 `DELETE /api/character/%00`은 500이 아니라 404를 낸다. `POST /api/character`는 크롤러를 부르기 전에 400을 낸다. 없는 보스로 구직을 조회하면 SQL까지 가지 않고 `[]`를 돌려준다. | `parse.test.ts`, `lib/db.test.ts`, `api-probe-after.txt` |
| API-4, P2-7 | 고침 | 파티 API 오류를 합쇼체에서 해요체로 바꿨다. 같은 조건의 문구는 하나로 맞췄다. 예를 들어 "등록되지 않은 캐릭터예요."와 "없는 보스예요."는 이제 모든 API가 같은 문구를 쓴다. `/pocs/*` 화면 문구도 해요체로 바꿨다. 모든 화면 `<title>`에 화면 이름이 들어간다(`캐릭터 가져오기 · Maple Boss` 등). 문구 전체 목록은 `copy-review.md`에 있다. | `copy-review.md`, `ui-pass.txt` (title 7줄), `lib/db.test.ts` |
| API-5 | 고침 | `formParty` 이중 편성 테스트가 이제 "누가 이기는지"가 아니라 "하나만 이기는지"를 본다. 하나는 성공하고 하나는 `X 캐릭터는 이미 다른 파티에 편성됐어요.`로 실패해야 한다. 이긴 팀의 파티 하나만 저장되고, 진 팀의 다른 멤버는 구직 중으로 남아야 한다. `pg`는 연결 풀에서 두 트랜잭션을 동시에 돌리므로 어느 쪽이 이길지 정해져 있지 않다(G1 `critic-api/pg-race.txt`). 실제 PostgreSQL 18.6에서 새 DB로 8번 돌려 8번 모두 통과했다. | `pg-path.txt`, `npm-test.txt` |
| API-7 | 고침 | 이제 프레임워크 기본 응답 대신 `{ error }`를 낸다. (1) 라우트에 없는 메서드는 `lib/http.ts`의 `notAllowed`가 405 JSON과 `Allow` 헤더로 답한다. 전에는 빈 405였다. (2) 없는 `/api/*` 주소는 `app/api/[[...path]]`가 404 JSON으로 답한다. 전에는 HTML 404였다. (3) `%E0%A4%A`처럼 깨진 % 인코딩은 Next가 라우팅 전에 HTML 400으로 답하던 것을 `proxy.ts`(matcher `/api/:path*`)가 400 JSON으로 바꾼다. 잘못된 JSON 본문은 원래 모든 POST에서 400 JSON이었고 다시 확인했다. 못 고친 것: `TRACE`는 Next가 Request 객체를 만들 때(proxy보다 먼저) undici가 TypeError를 던져 500 HTML이 된다. `FOO` 같은 비표준 메서드는 Node HTTP 파서가 빈 400으로 끊는다. 둘 다 앱 코드가 끼어들 수 없다. | `api-probe-after.txt` (405 10줄, 404 4줄, 인코딩 1줄), `smoke.txt` |
| API-8 | 고침 | `boss/search.ts`에 두 가지를 더했다. 첫째는 별칭 `검마`(검은 마법사)다. 둘째는 난이도 첫 글자를 이름 앞에 붙인 줄임말이다. 이·노·하·카·익 + 이름 일부로 하스우, 익스우, 노스우, 하진힐, 익카링, 카더스크, 노칼, 카엔슬, 하세렌, 익검마를 찾는다. `진힐라`는 원래 됐다(공백 무시). `카링`과 `카오스`처럼 난이도 글자로 시작하는 이름은 여전히 이름으로 찾는다. | `boss/boss.test.ts` ("search: shorthand players use"), `ui-pass.txt` (API-8 4줄) |
| API-9 | 고침 | `createRequest`가 JSON 값을 그대로 받아 정수 number만 통과시킨다. 라우트는 `Number(...)` 변환을 뺐다. `"2"`, `true`, `[2]`, `null`, `2.5`, `{}`는 모두 400이다. `/api/party`의 members도 문자열 배열만 받는다. 전에는 `[object Object]`가 오류 문구에 그대로 나왔다. | `lib/db.test.ts`, `api-probe-after.txt`, `smoke.txt` |
| API-10 | 고침 | `app/error.tsx`를 추가했다. 렌더 중에 던진 페이지는 Next 기본 화면 대신 이 화면을 보여 준다(상태는 500). 제목은 "화면을 불러오지 못했어요"이고 "다시 시도" 버튼(`retry`)과 "메인 화면으로" 링크가 있다. 프로덕션 빌드에서 `DATABASE_URL`을 닫힌 포트로 두고 `/`와 `/pocs/party`를 확인했다. 같은 상태에서 API 6개는 500/503 `{ error }`로 답했다. | `prod-pass.txt`, `shots/api10-db-down.png`, `build.txt` |
| P2-1 | 고침 | `app/messages.ts`의 `errorText`가 `fetch` TypeError("Failed to fetch")를 "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요."로 바꾼다. 삭제 모달, 캐릭터 추가, 붙여넣기, `/pocs/character`, `/pocs/party`의 구직 등록과 파티 편성이 이 함수를 쓴다. `/pocs/party`는 응답이 JSON이 아닐 때 영어 파싱 오류가 보이던 것도 고쳤다. | `ui-pass.txt` (P2-1 2줄), `shots/p2-1-delete-offline.png` |
| P2-2 | 고침 | 닉네임 칸(메인 화면과 `/pocs/character`)을 uncontrolled 입력으로 바꿨다. 제출할 때 DOM 값을 읽으므로 하이드레이션 전에 친 글자가 남고, ‘추가’도 그 값을 쓴다. 보스 검색 칸이 첫 렌더에 서버 값을 다시 써서 친 글자를 지우던 것도 막았다. JS 청크를 붙잡아 둔 채 두 칸에 입력한 뒤 풀어서 확인했다. | `ui-pass.txt` (P2-2 4줄) |
| P2-3 | 고침 | 파티 편성 버튼에 ref 가드를 달고, 보내는 동안 `disabled`와 `aria-busy`, "편성 중…"을 보여 준다. 더블클릭해도 POST는 1번, 파티도 1개만 생기고 성공 문구가 남는다. | `ui-pass.txt` (P2-3), `shots/p2-3-6-builder.png` |
| P2-4 | 고침 | 붙여넣기로 가져오면 안내가 닫히고 포커스가 닉네임 칸으로 간다. 그 칸의 상태 줄(`aria-describedby`, `role=status`)이 "‘X’ 캐릭터를 가져왔어요."를 읽어 준다. 안내의 닫기 버튼과 같은 자리다. | `ui-pass.txt` (P2-4 3줄), `shots/p2-4-paste-focus.png` |
| P2-6 | 고침 | 반올림과 내림이 섞이지 않게 규칙을 하나로 정했다. 모든 배율과 합계는 0.1% 아래를 버린다(`character/format.ts` `pct`). 그래서 보이는 멤버 배율을 더해도 보이는 합계를 넘지 않는다. 표시 합계와 `isClearable`도 늘 일치한다(109.96%는 109.9%로 공략 불가, 1.0999999999999999는 110.0%로 공략 가능). 부족분은 `shortfall`이 계산하므로 "109.9% + 0.1% 부족 = 110.0%"가 맞아떨어진다. `shownSum`은 필요 없어져서 지웠다. 0.57×1000 = 569.999… 같은 부동소수 오차도 `pct`가 흡수한다. 전에는 57.0%가 56.9%로 보일 수 있었다. | `party/ratio.test.ts` (고정 시드 2000건 포함), `ui-pass.txt` (P2-6 3줄), `shots/p2-6-saved.png` |
| P2-8 | 고침 | 보스 검색이 `useSearchParams()`로 새 검색을 알아챈다. 이미 보이는 보스를 다시 검색해도 쿼리가 바뀌므로 입력값이 정식 이름("익스트림 카링")으로 돌아가고 URL은 `/?boss=<id>`가 된다. 같은 검색을 두 번 연달아 해도 같다. 주소 정리용 `replaceState`는 새 검색으로 치지 않는다. 포커스는 검색 칸에 남는다. | `ui-pass.txt` (P2-8 2줄), `shots/p2-8-boss-search.png` |
| G2-P2-1 | 고침 | `flow.json`의 `updatedAt`은 `2026-11-17T03:30:00+09:00` 형식(ISO 8601 날짜·시간, 공백 없음, 오프셋 필수)만 받는다. STATUS.md 도장은 공백 없는 한 토큰이라, 공백이 든 값은 다시 읽히지 않고 /flow에 계속 '반영 안 됨'으로 남았다. 날짜만 쓴 값, 오프셋이 없는 값, 앞뒤 공백도 거절한다. 받은 값은 도장으로 다시 읽어 같은지 확인한다. | `scripts/flow-sync.test.ts` (새 테스트), `npm-test.txt` |
| G2-P2-2 | 고침 | `app/not-found.tsx`를 추가했다. `/pocs`처럼 페이지가 없는 주소는 `/import`와 같은 틀의 한국어 404를 보여 준다. 제목은 "없는 페이지예요"이고 "메인 화면으로" 링크가 있으며 상태는 404다. 화면 틀은 `app/StatusScreen.tsx`로 오류 화면과 같이 쓴다. | `ui-pass.txt` (G2-P2-2 2줄), `smoke.txt` (`/pocs` 등 4줄), `shots/g2p2-2-not-found.png` |
| G2-P2-4 | 고침 | `/pocs/*` 상단 nav(`PocsNav`)가 현재 화면 링크에 `aria-current="page"`와 밑줄을 단다. G3 디자인 패스에서 넣은 것이고, 여기서는 확인하고 링크 이름만 "메인 화면"으로 맞췄다. 메인 화면과 `/flow`의 푸터 nav는 처음부터 현재 화면을 목록에 넣지 않아서 표시할 링크가 없다. 세 화면 모두 aria-current가 하나씩만 있다. | `ui-pass.txt` (G2-P2-4 3줄), `shots/g2p2-4-pocs-nav.png`, `nav-walk.txt` |
| SPIKE | 범위 밖 | `/tmp` PGlite 콜드 스타트 6~9초와 함수 리전(iad1)은 배포 설정 문제다. Neon 연결(B1) 때 리전을 맞추면서 다룬다. 이번 작업(코드·문구)과 지시에서 제외됐고 배포도 하지 않았다. 대신 임시 저장소 안내 문구를 실제 동작에 맞췄다. "서버가 다시 시작되면 지워져요"를 "새로고침 뒤에 안 보이거나 사라질 수 있어요"로 바꿨다. | `prod-pass.txt` (temporary storage 2줄), `shots/temp-storage-notice.png` |

## 함께 바뀐 것

- `app/messages.ts`: 여러 화면이 같이 쓰는 문구(`OFFLINE`, `CRAWLING`)와 `errorText`.
- `proxy.ts`: `/api/*`에서만 돈다. dev 로그 기준 요청당 1~2ms가 든다.
- `scripts/smoke.mjs`: 확인 8개를 더했다(405·404·400 JSON, `..`·NUL 이름, partySize `"2"`). 옛 경로 404 확인은 한국어 404 화면과 돌아가는 링크까지 보도록 바꾸고 `/pocs`를 더했다.
- `scripts/import-e2e.mjs`: 501 문구가 바뀌어 정규식 하나를 고쳤다.
- G2의 `nav-walk.mjs`는 링크 이름("메인 화면", "Maple Boss 메인 화면")이 바뀌어 G3 사본(`copy-p2/scripts/nav-walk.mjs`)으로 돌렸다. G2 근거 파일은 그대로 두었다.
- 개발 DB 정리: 처음 프로브(`api-probe-before.txt`)가 만든 `.`과 `..` 캐릭터는 API로 지울 수 없었다(위 API-1). 그래서 dev 서버를 잠시 멈추고 `data/pglite`에서 두 행만 지운 뒤, 지정된 명령으로 다시 띄웠다.

## 검증 기록 (`evidence/G3/copy-p2/`)

| 파일 | 내용 |
|---|---|
| `npm-test.txt` | `npm test` 40개 통과 |
| `tsc.txt`, `lint.txt` | `npx tsc --noEmit`, `npm run lint` 오류 없음 |
| `smoke.txt` | `npm run smoke` (dev 서버) 67개 모두 통과 |
| `api-probe-before.txt`, `api-probe-after.txt` | P2 API 프로브의 수정 전과 수정 후. 수정 후 42개 모두 통과 |
| `ui-pass.txt` | 브라우저(Chrome)로 각 UI 항목과 화면 제목 32개 확인, 콘솔 오류 없음 |
| `nav-walk.txt` | 화면 이동 21홉, 북마클릿, 막다른 화면 없음 (1440, 375) |
| `import-e2e.txt` | 크롤러 없는 프로덕션 서버에서 가져오기 흐름 전체 |
| `prod-pass.txt` | 프로덕션 빌드에서 DB가 죽었을 때와 임시 저장소일 때 |
| `pg-path.txt` | `pg` 경로로 `lib/db.test.ts` 8회 |
| `build.txt` | `next build` 성공 (라우트 표에 `/api/[[...path]]`, Proxy 포함) |
| `shots/*.png` | 위 항목의 화면 조각 |
| `scripts/` | 위 기록을 만든 스크립트 (`api-probe.mjs`, `ui-pass.mjs`, `prod-pass.mjs`, `nav-walk.mjs`) |

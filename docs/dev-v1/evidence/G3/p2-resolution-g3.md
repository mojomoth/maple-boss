# G3b P2 정리 결과 (G3 로컬 Critic P2 14건)

2026-11-17. `STATUS.md`의 "G3 로컬 Critic P2 14건" 표를 한 줄씩 처리한 결과다. 결함의 원문(재현 방법, 기대, 실제)은 G3 critic 두 명의 판정 출력에 있고, 그 근거 파일은 `evidence/G3/critic-design/`, `evidence/G3/critic-function/`에 있다. G3b의 근거는 모두 `evidence/G3/sweep/` 아래에 있다. 배포는 하지 않았고 커밋도 하지 않았다. 바꾼 파일은 `pocs/**`뿐이다(`pocs/lib/db.ts`는 건드리지 않음).

결과: 14줄 가운데 12줄을 고쳤다. D7은 `/pocs` 부분만 고쳤고, `/flow` 부분은 `flow.json` 데이터라 고칠 문구를 아래에 적어 넘긴다. FN-9는 G3b 전에 이미 해결된 줄이다.

| ID | 결과 | 무엇을 했나 | 근거 (`sweep/`) |
|---|---|---|---|
| D3 | 고침 | 961~1280px(`60rem < width <= 80rem`)에서는 로고와 두 검색 칸이 한 줄에 들어가지 않는다. 그동안은 로고 열이 줄어들어 961px에서 0px까지 잘렸다. 이제 이 구간에서는 두 검색 칸이 로고 아래 둘째 줄 오른쪽으로 내려간다. 로고는 언제나 272x77이고, 보스 칸 폭은 1440px일 때와 같다(내용 198px). 이 구간의 상단 바 높이는 134px이고, 1281px부터는 전처럼 한 줄 80px이다. 로고만 있는 바(`/import`, 404, 오류 화면)는 `.topbar-row:has(.search)`라서 80px 그대로다. 검색 칸 아래 메시지는 전처럼 바 아래에 걸린다. | `ui-sweep.txt` (`# D3 band` 11줄, 각 너비 D3 줄), `shots/d3-header-{961,1024,1100,1440,375}.png`. 전: `critic-design/shots/header-squeeze.png`, `recheck-1/logs/logo-band.log` |
| D4 | 고침 | ×는 D2 수정 때 이미 숨겼고, 이번에 Chrome의 datalist ▾(`::-webkit-calendar-picker-indicator`)도 숨겼다. 칸 안에는 시안처럼 돋보기만 남는다. CSS로 표시만 숨겼으므로 datalist 60개는 그대로 연결돼 있다. 입력하면 목록이 뜨는 것과 ↓로 목록을 여는 것, Esc로 type=search 칸을 비우는 것은 Chrome 기본 동작으로 남는다. 입력 후 Enter로 검색하는 것은 직접 확인했다. 확인 방법: hover와 focus 상태에서 글자와 돋보기 사이 56px 띠에 밝은 픽셀이 0개인지 본다. 한계: Chrome이 그리는 목록 팝업은 페이지 밖에 있어 헤드리스 스크린샷에 잡히지 않는다. 그래서 팝업은 datalist 연결(id, 옵션 60개)로만 확인했다. | `ui-sweep.txt` (각 너비 D4 4줄), `shots/d4-field-focus-*.png`. 전: `critic-design/shots/field-states.png` |
| D5 | 고침 | `base.css`에 `p a:not([class])` 규칙을 추가했다. 문장 안 링크는 민트색(`--color-mint`)에 밑줄을 긋고, hover하면 ink 색이 된다. 색에만 기대지 않으므로 WCAG 1.4.1을 지킨다. 대상은 `/pocs/character`의 501 안내 줄(링크 2개)과 `/pocs/party`의 "먼저 캐릭터 등록에서…" 줄이다. 클래스가 있는 링크(버튼), nav, footer 링크는 문장(`p`) 밖이라 바뀌지 않는다. | `ui-sweep.txt` (각 너비 D5 2줄), `shots/d5-pchar-links-*.png`. 전: `critic-design/shots/pchar-links.png` |
| D6 | 고침 | 삭제 모달의 보조 문구를 19.2px에서 21.6px(`calc(var(--text-lg) * 1.125)`)로 키웠다. 1448x1086에서 글자 폭은 365px에서 411px이 됐고 시안은 414px, 글자 높이는 18px에서 20px이 됐고 시안은 20px이다. 비평에 같이 적힌 가운뎃점 간격은 `.meta`의 여백을 0.4em에서 0.3em으로 줄였다. 모달은 14/14에서 12/12가 돼 시안 12/12와 같고, 카드는 11/12에서 10/10이 됐다(시안 9/9). 색은 ink-2로 두었다. 시안 프롬프트가 본문 글자를 "muted gray"로 정했고, PNG의 색(약 #d6d9da)은 ink-2(#b5c0bc)와 ink(#eef3f1)의 중간이라 어느 쪽 토큰도 정확히 맞지 않는다. 375px에서는 두 줄이 되고 모달은 화면 안에 들어간다. | `d6-measure.txt`, `ui-sweep.txt` (각 너비 D6 줄), `shots/d6-modal-*.png` |
| D7 | 일부 고침 | `/pocs` 부분: `/pocs/party`의 h1을 "파티 구직·편성"에서 "파티 편성"으로 바꿔 `<title>`, nav와 맞췄다. `/pocs/boss`의 placeholder는 375px에서 "…노말 카링, 히"까지만 보였는데, "보스 이름 (예: 카링, 하스우)"로 줄여 375px에서도 다 보인다(182px, 칸은 218px). `/flow` 부분은 고치지 않았다. 'PASS' 노드 제목과 B1의 "…사라질 수 있음"은 `docs/dev-v1/flow.json` 데이터다. 이 파일과 `npm run flow:sync`(STATUS.md 다시 쓰기)는 오케스트레이터가 관리하고, 지금 배포 담당이 G3 단계를 갱신하고 있어 내가 고치면 충돌한다. 고칠 문구는 아래 "flow.json에 넘기는 수정"에 적었다. | `ui-sweep.txt` (D7 줄), `shots/d7-pocs-boss-*.png` |
| FN-3 | 고침 (라우팅) | `/api/character/import`와 `/api/character/rates`는 `[name]`과 같은 위치의 정적 경로라서 URL을 먼저 가져간다. 두 경로가 이제 DELETE를 받아 자기 이름의 캐릭터를 지운다(`export const DELETE = () => removeCharacter("import")`). 삭제 코드는 `app/api/character/remove.ts` 하나를 `[name]`과 같이 쓴다. 405의 `Allow`도 `POST, DELETE`와 `GET, DELETE`로 고쳤다. 계약 `DELETE /api/character/<이름>`과 화면 코드는 그대로이고 모든 이름이 지워진다. 이름을 막지 않은 이유: `import`와 `rates`는 메이플 닉네임 규칙(영문 4~12자)에 맞는 실제 이름이 될 수 있다. 막으면 그런 캐릭터는 가져올 수조차 없다. 쿼리 방식(`DELETE /api/character?name=`)으로 바꾸지 않은 이유: PLAN.md 계약과 화면을 바꿔야 해서 변경이 더 크다. 다른 충돌은 없다. 정적 형제 경로는 이 둘뿐이고, `.`과 `..`은 가져오기에서 이미 거절한다(API-1). 앞으로 형제 경로를 추가하면 같은 한 줄이 필요하다(`remove.ts` 주석). | `smoke-3000.txt` ('import'/'rates' 왕복 각 4줄), `ui-sweep.txt` (FN-3: 'import' 카드를 모달로 삭제, 'rates' 204 다음 404), `api-probe-after.txt`. 전: `before-probe.txt` (405), `critic-function/hostile-3100.log` |
| FN-4 | 고침 | `/pocs/boss`는 `q`가 배열이면 첫 값을 쓴다. 전에는 `?q=a&q=b`에서 `b.trim is not a function`으로 500이 났다. | `api-probe-after.txt`, `smoke-3000.txt` (`page /pocs/boss?q=a&q=b`), `ui-sweep.txt` (FN-4: `?q=하스우&q=b`면 200, 스우, 칸 값 하스우). 전: `before-probe.txt` (500) |
| FN-5 | 고침 | `/pocs/character`가 목록이나 배율을 불러오지 못하면 그렇게 알린다. 전에는 빈 목록인 것처럼 보였다. 목록이 실패하면 API의 `{ error }`("캐릭터 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.")를, 서버에 닿지 못하면 공통 오프라인 문구를 `role="alert"`로 보여 준다. 이때 "0" 개수 배지는 숨기고 "다시 시도" 버튼을 둔다. 배율이 실패하면 "배율 데이터가 없어요." 대신 오류를 보여 준다. 응답이 JSON 목록이 아닐 때도 실패로 본다. | `ui-sweep.txt` (각 너비 FN-5 4줄), `shots/fn5-list-error-*.png`. 전: `critic-function/dbdown-character.png` |
| FN-6 | 고침 | `/pocs/party`의 구직 등록과 파티 편성에서 오류는 `.msg.is-error`(오류 색)에 `role="alert"`를 단다. 성공은 전처럼 `role="status"`다. 두 경우는 key가 달라 서로 다른 요소로 그려진다. 그래서 성공에서 오류로 바뀌면 오류로 읽힌다. | `ui-sweep.txt` (각 너비 FN-6 3줄: 400 오류, 성공, 오프라인 편성), `shots/fn6-*.png` |
| FN-7 | 고침 | (1) `crawler/crawl.py`의 `sample_path`는 이름에서 글자(한글 포함), 숫자, `_`, `-`만 남기고 나머지를 `_`로 바꾼다. `/`, `\`, `.`가 남지 않으므로 파일은 늘 `docs/research/samples/` 안에 생긴다. 실제 닉네임은 이름이 바뀌지 않는다. (2) `proxy.ts`(matcher `/api/:path*`)는 다른 사이트에서 시작된 POST, PUT, PATCH, DELETE를 핸들러 전에 403 `{ error: "다른 사이트에서 보낸 요청은 받지 않아요." }`로 막는다. 판단 순서: `Sec-Fetch-Site`가 있으면 `same-origin`이나 `none`만 통과한다. 없으면 `Origin`의 host가 요청 host(`x-forwarded-host`, 없으면 `host`)와 같아야 한다. 둘 다 없는 요청은 브라우저 페이지가 보낸 게 아니므로(curl, smoke) 통과한다. GET, HEAD, OPTIONS는 막지 않는다. 북마클릿은 maplescouter에서 `/import`로 이동만 하고(GET), 저장은 `/import` 페이지가 같은 출처에서 보내므로 그대로 된다. | `crawl-sample-path.txt`, `api-probe-after.txt`, `smoke-3000.txt` (403 6줄, 같은 출처/헤더 없음 400 2줄), `ui-sweep.txt` (`# FN-7`: 다른 출처 페이지의 no-cors fetch와 text/plain 폼 공격은 저장 안 됨. 같은 폼을 앱 출처에서 보내면 저장됨(대조군). 다른 출처에서 시작한 북마클릿은 `/import`를 거쳐 저장됨), `nav-walk.txt` (북마클릿 단계). 전: `before-probe.txt` |
| FN-8 | 고침 | 지금 기준으로 도는 회귀 스크립트를 `pocs/scripts/`에 두고 `pocs/README.md` 하네스 표에 올렸다. `nav-walk.mjs`는 G3 링크 이름을 쓴다("메인 화면", "Maple Boss 메인 화면", h1 "파티 편성"). `/pocs` 로고 링크 단계도 넣었고 경로는 상대 경로다. `flow-check.mjs`는 노드, 수정 루프, 실패 연결선 수를 `flow.json`에서 계산한다. 보드는 캔버스에 들어가거나 캔버스 안에서만 스크롤하면 통과다. 대화상자의 close 작업이 포커스를 되돌린 뒤 다음 키를 누른다. 스크린샷은 폴더를 줄 때만 남긴다. `evidence/G2/scripts/`의 원본은 G2 기록이라 그대로 두었다(README에 명시). | `nav-walk.txt` (all ok), `flow-check.txt` (all ok). 전: `critic-function/navwalk-3000.log`, `critic-function/flowshots-3000.log` |
| FN-9 | 이미 해결 | B3 기록은 G3b 전에 오케스트레이터가 `STATUS.md`와 `DECISIONS.md`에서 고쳤다("해결"). G3b에서 할 일은 없었다. | `STATUS.md` 차단 B3 |
| FN-10 | 고침 | 카드에서 이름 한 줄과 "Lv · 직업" 한 줄이 넘치면 말줄임(…)으로 끝난다(`.card-body` 열 `minmax(0, 1fr)`). 'Lv.298'은 줄어들지 않고 직업만 줄어든다. 그래서 줄바꿈된 줄이 '·'로 시작하지 않는다. 전체 이름과 직업은 카드의 접근 가능한 이름과 삭제 모달에 그대로 있다. 같은 이름이 추천 파티 줄에서 멤버 칸(7.5rem) 밖으로 나가던 것(375px에서 6개 요소)도 고쳤다. 이제 칸 안에서 줄바꿈된다(`overflow-wrap: anywhere`). `/pocs/character` 목록 줄도 넘치지 않는 것을 확인했다. | `ui-sweep.txt` (각 너비 FN-10 5줄), `shots/fn10-card-*.png`, `shots/fn10-party-*.png`. 전: `critic-function/card-12w-name-clip-1440.png` |
| FN-11 | 고침 | 로고 `<Image>` 5곳(`page.tsx`, `StatusScreen.tsx`, `import/page.tsx`, `flow/page.tsx`, `pocs/layout.tsx`)에 실제로 그려지는 크기인 `width={272} height={77}`을 적었다. CSS가 272x77로 자르는데 속성은 272x91이어서 next/image 개발 모드 검사가 경고를 냈다. 이제 7개 화면 x 3개 너비에서 경고가 0개다. `/tmp/maple-dev.log`의 경고 수는 수정 전 462줄에서 늘지 않았다(마지막 경고는 2537번째 줄로 수정 전이고, 그 뒤 스윕 4번 동안 0줄). | `ui-sweep.txt` (각 너비 FN-11 줄, 마지막 줄의 dev log 수) |

## flow.json에 넘기는 수정 (D7의 /flow 부분, 오케스트레이터)

- `gates[*].steps[kind=pass].title`: `"PASS"`를 `"판정"`으로 바꾼다. 노드 배지가 이미 "통과/대기"를 말하고, 범례의 종류 이름도 "판정"이다.
- `blockers[B1].title`: `"Neon 약관 동의 필요 (사용자). 그 전까지 배포 저장소는 요청 사이에도 데이터가 사라질 수 있음"`을 `"Neon 약관 동의가 필요해요(사용자). 그 전까지 배포 저장소의 데이터는 요청 사이에도 사라질 수 있어요"`로 바꾼다. B3의 `".env 확인됨 (…)"`은 명사형 목록 항목이라 그대로 두어도 된다.
- 같이 볼 것: `G3-critic-local`의 근거 경로 `docs/dev-v1/evidence/G3/critic-design-copy/`와 `critic-function-security/`는 없는 폴더다. 실제 폴더는 `critic-design/`, `critic-function/`이다. 그래서 `/flow` 패널과 STATUS.md 표의 링크가 깨져 있다.
- 고친 뒤 `npm run flow:sync`를 실행한다.

## 관찰 (P2 표 밖)

- `/flow`는 G3 레인이 8단계가 되면서 보드가 2028px이다. 1440px에서는 캔버스 안에서 가로 스크롤한다(페이지는 스크롤하지 않음). `flow-check.mjs`는 이 동작을 정상으로 본다.
- `recheck-1`의 R1-P2-1(`/pocs/party` 삭제 실패 뒤 포커스가 body로 감)과 R1-P2-3(`api/party/[id]/route.ts` 주석이 낡음)은 이 14줄에 없어서 손대지 않았다.
- `npm run build`와 `scripts/import-e2e.mjs`(크롤러 없는 프로덕션 서버)는 돌리지 않았다. 작업 지시의 검증 목록에 없다. 또 `:3101~3103`, `:3200`에서 01:44와 23:54에 뜬 `next-server`가 아직 `pocs/.next`를 쓰고 있다(내가 띄운 것이 아니다). 빌드하면 그 파일이 바뀐다. 북마클릿 흐름은 대신 dev에서 두 가지로 확인했다. 하나는 앱 출처에서 실제 북마클릿 코드를 실행한 `nav-walk.txt`, 다른 하나는 다른 출처에서 실행한 `ui-sweep.txt`다. 배포 단계에서 빌드와 배포 URL의 `npm run smoke`가 FN-7의 Host/Origin 비교를 Vercel에서 확인한다(smoke의 "Origin of this server -> 400" 줄).

## 검증 (모두 `sweep/`, dev 서버 http://localhost:3000, Node 24)

| 명령 | 결과 | 파일 |
|---|---|---|
| `npm test` | 40/40 통과 | `npm-test.txt` |
| `npx tsc --noEmit` | exit 0 | `tsc.txt` |
| `npm run lint` | exit 0, 경고 0 | `lint.txt` |
| `npm run smoke` | # all passed (FN-3, FN-4, FN-7 줄 추가) | `smoke-3000.txt` |
| `node scripts/nav-walk.mjs` | all ok (1440, 375) | `nav-walk.txt` |
| `node scripts/flow-check.mjs` | all ok (1440, 375) | `flow-check.txt` |
| `sweep/scripts/ui-sweep.mjs` | 101개 확인 통과(1440, 1100, 375, 961~1366 구간, 다른 출처 공격) | `ui-sweep.txt`, `shots/` (32장) |
| curl 전후 비교 | FN-3 405→404/204, FN-4 500→200, FN-7 400→403 | `before-probe.txt`, `api-probe-after.txt` |
| `crawl.py` `sample_path` | 경로 9개 모두 samples 안 | `crawl-sample-path.txt` |
| 시안 대비 측정 | 보조 문구 폭 365→411(시안 414), 점 간격 14→12(시안 12) | `d6-measure.txt` |

데이터: 스크립트가 만든 캐릭터(WWWWWWWWWWWW, import, rates, 스윕·csrf·same·formok·북마클릿·smoke 임시 이름)는 모두 지웠다(각 cleanup 줄이 204). 기존 캐릭터 3명과 파티는 건드리지 않았다.

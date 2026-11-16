# Maple Boss

메이플스토리 캐릭터를 maplescouter 보스 배율과 함께 등록하고, 보스를 고르면 등록한 캐릭터로 배율 합 110% 이상인 파티를 추천·저장하는 Next.js 16 앱이다. 이 폴더(`pocs/`)가 앱 루트다.

| 화면 | 내용 |
|---|---|
| `/` | 내 캐릭터 카드(눌러서 삭제), 보스 정보, 추천 파티 |
| `/import` | "Maple Boss로 보내기" 북마클릿이 캐릭터를 넘기는 곳 |
| `/pocs/character`, `/pocs/boss`, `/pocs/party` | 캐릭터 등록, 보스 조회, 구직·파티 편성 |
| `/flow` | 개발 게이트 진행(`docs/dev-v1/flow.json`, 빌드 때 읽음) |

API 계약은 [`docs/dev-v1/PLAN.md`](../docs/dev-v1/PLAN.md)의 "최소 API 계약"에 있다. 오류는 모두 `{ error }`(한국어)다.

## 로컬 실행

Node 24가 필요하다(`node --test`의 타입 제거, `module.registerHooks`). Homebrew Node라면 `export PATH=/opt/homebrew/bin:$PATH`.

```sh
npm install
npm run dev   # http://localhost:3000
```

- 저장소: `DATABASE_URL`이 없으면 PGlite를 `data/pglite`에 만든다. 처음 쓸 때 `seed/*.json`의 3명을 넣는다. `DATABASE_URL`(Postgres, 예: Neon)이 있으면 `pg`로 붙는다. `MAPLE_DB=memory` 또는 `MAPLE_DB=<폴더>`로 PGlite 위치를 바꾼다.
- 닉네임으로 바로 불러오기(선택): `crawler/.venv`가 있으면 `POST /api/character`가 `crawler/crawl.py`를 띄운다. 브라우저 창이 열리고 사람 확인은 직접 누른다. 없으면 501과 maplescouter 가져오기 안내를 돌려준다.

  ```sh
  uv venv crawler/.venv --python 3.13
  uv pip install --python crawler/.venv "scrapling[fetchers]"
  crawler/.venv/bin/scrapling install
  ```

## 하네스

| 명령 | 하는 일 |
|---|---|
| `npm test` | 단위·DB 테스트(메모리 PGlite). `TEST_DATABASE_URL=<빈 Postgres>`면 같은 테스트를 `pg`로 |
| `npx tsc --noEmit` | 타입 검사 |
| `npm run lint` | ESLint |
| `npm run build` | 프로덕션 빌드 |
| `npm run smoke` | 실행 중인 서버(`BASE_URL`, 기본 `http://localhost:3000`)에 API 계약과 오류 경로를 확인하고, 만든 데이터는 지운다 |
| `npm run shots [폴더]` | 시스템 Chrome(`CHROME_PATH`)으로 `/`, `/pocs/*`를 1440·375px로 찍는다 |
| `npm run flow:sync` | `flow.json`을 검사하고 `STATUS.md` 게이트 표와 `PLAN.md` TODO를 다시 쓴다 |
| `node scripts/import-e2e.mjs [폴더]` | 크롤러 없는 서버에서 북마클릿·붙여넣기 가져오기 전체. 서버 띄우는 법은 파일 머리말 |

## 배포

- Vercel 프로젝트 `maple-boss`, Root Directory는 `pocs`다. `vercel deploy`는 저장소 루트에서 실행한다. 루트의 `.vercelignore`가 `.env*`, 근거·시안 문서, 로컬 DB, 크롤러 venv를 올리지 않는다.
- 환경 변수는 서버 전용 `DATABASE_URL` 하나다. `NEXT_PUBLIC_` 변수는 없다.
- `DATABASE_URL`이 없으면 `/tmp`의 PGlite를 쓴다. 인스턴스마다 따로라 저장한 내용이 다음 요청에서 안 보이거나 사라질 수 있다. 이때 `/api/health`는 `persistent: false`이고 메인 화면에 임시 저장소 안내가 뜬다. Neon 연결은 차단 B1([`DECISIONS.md`](../docs/dev-v1/DECISIONS.md)).
- Vercel에는 크롤러가 없다. 캐릭터는 북마클릿이나 붙여넣기로 가져온다(DECISIONS D2).

## 문서

- [`docs/dev-v1/`](../docs/dev-v1/): 계획(`PLAN.md`), 결정(`DECISIONS.md`), 현재 상태와 백로그(`STATUS.md`), 게이트 흐름(`flow.json`), 근거(`evidence/`)
- [`docs/wiki/`](../docs/wiki/index.md): maplescouter, 배율 110% 규칙, 보스 목록, 파티 추천, 배포를 정리한 위키
- [`boss/SOURCES.md`](boss/SOURCES.md): 보스 수치·그림 출처

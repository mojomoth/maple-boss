# 배포와 저장소

v1은 `pocs/` Next.js 앱 하나를 Vercel에 배포하고, 저장소는 Postgres SQL 하나로 맞춘다. 2026-11-17 기준 결정과 막힌 항목이다.

## 앱

- `pocs/`가 앱 루트다(Vercel Root Directory = `pocs`). v1 화면은 `/`, PoC 화면은 `/pocs/*`, 게이트 진행 화면은 `/flow`다 ([DECISIONS D5][dec], [PLAN][plan]).
- Next.js 16(`next@16.4.6`)을 쓴다 ([DECISIONS D6][dec]). PoC 단계는 Next.js 15였다 ([POC_PLAN][poc]).
- `dev-v1` 브랜치에서 게이트마다 커밋하고, G3 통과 뒤 `main`에 fast-forward한다 ([DECISIONS D8][dec]).

## D1 저장소: Postgres

- PoC는 Node 24 내장 `node:sqlite` 파일 DB(`pocs/data/maple.db`)를 썼다 ([POC_PLAN][poc]). 처음 요구 스택도 SQLite였다 ([CONTEXT][ctx]).
- v1은 Postgres로 바꾼다. `DATABASE_URL`이 있으면 `pg` Pool(Neon), 없으면 PGlite(로컬 `pocs/data/pglite`, 테스트는 메모리) ([DECISIONS D1][dec]).
- 이유: Vercel 함수는 `/tmp`에만 쓸 수 있고 인스턴스마다 사라진다. PGlite는 Postgres와 같은 방언이라 코드 경로가 하나다 ([DECISIONS D1][dec]).
- Neon이 막혀 있는 동안은 PGlite를 `/tmp`에 두고 샘플 캐릭터로 시드한다. `/api/health`가 `persistent: false`를 돌려주고 화면에 "임시 저장소" 안내를 띄운다 ([DECISIONS D1][dec], [PLAN][plan]).
- Upstash Redis는 무료 플랜이 없어 사용자 승인 없이 과금 계정을 만들지 않는다 ([DECISIONS D1][dec]).

## D2 캐릭터 등록: 사용자가 직접 가져오기

- 서버는 maplescouter를 크롤하지 않는다. 사용자가 결과 페이지를 열어 사람 확인을 통과하고 북마클릿("Maple Boss로 보내기")으로 보낸다. 북마클릿이 막히는 브라우저는 붙여넣기를 쓴다 ([DECISIONS D2][dec]).
- 로컬에서는 기존 크롤러(`POST /api/character`)를 그대로 쓴다. 크롤러가 없는 환경은 501과 가져오기 안내를 돌려준다 ([DECISIONS D2][dec], [PLAN][plan]).
- 붙여넣은 값은 위조할 수 있다. v1은 길드·지인용 신뢰 기반 도구로 보고 서버에서 형식·범위만 검사한다(P2로 기록) ([DECISIONS D2][dec]).
- 데이터 구조와 Turnstile 정책은 [maplescouter](maplescouter.md).

## 차단 항목 (2026-11-17 모두 열림)

| ID | 내용 | 그동안 |
|---|---|---|
| B1 | Neon 무료 플랜 생성에 사용자의 Vercel 마켓플레이스 약관 동의가 필요하다 | 임시 저장소(`/tmp` PGlite)로 배포 |
| B2 | Codex(GPT) 사용량 한도, 2026-11-20 18:31까지 | Builder·Critic 모두 Claude. 교차 Critic은 한도가 풀린 뒤 다시 돌린다 |
| B3 | 저장소에 `.env`가 없다 | v1 핵심 기능은 키가 필요 없다. 그림 재생성 때만 필요 |

(표 출처: [DECISIONS 차단 목록, D1, D3, D4][dec]. 해결 절차는 원본에 있다.)

[ctx]: ../MAPLE_BOSS_CONTEXT.md
[poc]: ../POC_PLAN.md
[plan]: ../dev-v1/PLAN.md
[dec]: ../dev-v1/DECISIONS.md

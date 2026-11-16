# 결정 기록

각 항목은 결정, 근거, 확인 방법 순서로 적는다. 날짜는 2026-11-17 기준.

## D1 저장소: Postgres SQL 하나로 통일 (배포 Neon, 로컬·테스트 PGlite)

- 결정: `node:sqlite` 파일 DB를 Postgres로 바꾼다. `DATABASE_URL`이 있으면 `pg` Pool(Neon), 없으면 PGlite(로컬 `pocs/data/pglite`, 테스트는 메모리).
- 근거: Vercel 함수 파일시스템은 `/tmp`만 쓸 수 있고 인스턴스마다 사라진다. SQLite SQL은 Postgres로 거의 그대로 옮겨진다. PGlite는 같은 방언이라 코드 경로가 하나다.
- 차단: Neon 무료 플랜(`free_v3`)은 Vercel 마켓플레이스 약관에 사용자가 직접 동의해야 생성된다 (B1). Upstash Redis는 무료 플랜이 없어(`paid`만 있음) 사용자 승인 없이 과금 계정을 만들지 않는다.
- 차단 중 배포: PGlite를 `/tmp`에 두고 샘플 캐릭터로 시드한다. `/api/health`가 `persistent: false`를 돌려주고 화면에 "임시 저장소" 안내를 띄운다.
- 확인: `curl /api/health`, `npm test`(PGlite 메모리), pg 경로 테스트.

## D2 캐릭터 등록: 사용자가 직접 maplescouter를 열고 가져오기

- 결정: 서버 크롤링 대신, 사용자가 maplescouter 결과 페이지를 열어 사람 확인을 통과한 뒤 북마클릿("Maple Boss로 보내기")으로 데이터를 넘긴다. 북마클릿이 막히는 브라우저용으로 붙여넣기 입력도 둔다. 로컬에서는 기존 크롤러(`POST /api/character`)를 그대로 쓴다.
- 근거: maplescouter API는 Cloudflare Turnstile 뒤에 있고, 자동 우회는 금지 정책이다. 서버(Vercel)에서는 사람이 체크박스를 누를 브라우저가 없다.
- 위험: 붙여넣은 값은 위조할 수 있다. v1은 길드·지인용 신뢰 기반 도구로 보고, 서버에서 형식·범위만 검사한다 (P2 기록).
- 매핑은 TS 한 곳(`character/parse.ts`)에서 한다. 크롤러는 원본 `searchResult`만 출력한다.

## D3 AI 분석·이미지 생성

- AI 분석: 파티 판정은 배율 합 규칙(결정적 계산)이라 필요한 기능이 없다. 넣지 않는다.
- 이미지: 로고와 보스 이미지는 이미 있다 (`docs/logo-generation-prompt.txt`, `pocs/public/bosses`). `.env`가 저장소에 없어 OpenAI 키를 확인할 수 없다 (B3). 새 이미지가 필요해지면 그때 쓴다.

## D4 멀티 에이전트 모델

- Codex CLI 0.167(`gpt-6.1-sol` 기본, `gpt-6-astra`)은 설치되어 있지만 2026-11-20 18:31까지 사용량 한도다 (B2). 그동안 Builder·Critic은 Claude Opus 5.5 workflow agent로 돌리고, Critic은 구현 설명 없이 새 컨텍스트에서 실행 결과만 보고 판정한다.

## D5 앱 위치

- `pocs/`를 그대로 앱 루트로 쓴다(Vercel Root Directory = `pocs`). PoC 화면은 `/pocs/*` 경로로 옮기고, v1 메인 화면은 `/`이다. 폴더를 옮기면 바뀌는 것 없이 diff만 커진다.

## D6 Next.js 16

- 요구사항이 최신 안정판이다. 2026-11-17 기준 `next@16.4.6`.

## D7 테스트 범위

- CLAUDE.md의 테스트 목록은 발표 연습 서비스 템플릿에서 온 항목이 섞여 있다. 이 서비스에 해당하는 항목만 검증하고 나머지는 PLAN.md에 해당 없음으로 남긴다.

## D8 Git

- `dev-v1` 브랜치에서 게이트마다 커밋하고 push한다. G3 PASS 뒤 `main`에 fast-forward한다.

## D9 저장한 파티 삭제 API

- 결정: `DELETE /api/party/[id]`(204/404)를 계약에 넣는다.
- 근거: 파티는 캐릭터를 지워도 스냅샷으로 남는다. 이 API가 없으면 smoke를 돌릴 때마다 테스트 파티가 쌓이고, 사용자도 잘못 만든 파티를 지울 방법이 없다.

## D10 테스트 러너

- 결정: 의존성을 추가하지 않고 Node 24 `node --test`를 쓴다. `--conditions=react-server`로 `server-only`를 빈 모듈로 해석하고, `resolve-hooks.mjs`로 `@/` 별칭을 푼다.
- 확인: `npm test` 32/32 통과(2026-11-17). pg 경로는 임시 PostgreSQL 18.6에서 8/8 통과(`evidence/G0/pg-path.txt`).

## 차단 목록

| ID | 내용 | 해결 방법 | 상태 |
|---|---|---|---|
| B1 | Neon 약관 동의 필요 | 사용자가 https://vercel.com/mojomoths-projects/~/integrations/accept-terms/neon?source=cli 에서 동의 → `vercel integration add neon --name maple-boss-db --billing-plan free_v3` | 열림 |
| B2 | Codex(GPT) 사용량 한도 | 2026-11-20 18:31 이후 교차 Critic 재실행 | 열림 |
| B3 | `.env` 없음 (OPENAI 등 키) | v1 핵심 기능은 키가 필요 없음. 이미지 재생성 때만 필요 | 열림 |

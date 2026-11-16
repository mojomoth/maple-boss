# Maple Boss v1 — 실행 계획

목표: 캐릭터를 등록하고, 보스를 고르면 등록된 캐릭터로 잡을 수 있는 파티(배율 합 110% 이상)를 보여 주고 저장하는 서비스. Vercel에 배포해 실제로 쓸 수 있는 v1을 만든다.

- 앱: `pocs/` Next.js 앱 하나 (v1 화면 `/`, PoC 화면 `/pocs/*`, 워크플로우 시각화 `/flow`)
- 상태·결정·근거: 이 폴더 (`STATUS.md`, `DECISIONS.md`, `flow.json`)
- 출처 정리: `docs/wiki/`

## 게이트

모든 게이트는 Plan → Build → Independent Critic → Fix → Recheck → PASS 순서로 진행한다. Critic은 직접 실행한 결과(테스트, curl, 스크린샷)를 보고 판정한다.

| 게이트 | 통과 조건 (이 프로젝트 기준) |
|---|---|
| G0 준비 | 기존 파일 확인, CLI 확인(claude 가능 / codex 사용량 한도), Vercel 프로젝트 연결, 개발 서버 실행, 최소 API 계약(아래), 하네스(`npm test`, `npm run smoke`) |
| G1 PoC | 캐릭터·보스·파티 PoC가 `/pocs/character`, `/pocs/boss`, `/pocs/party`에서 실제로 동작. 입출력을 `FEATURES` 절에 기능으로 정의. 최소 API만 남김 |
| G2 통합 | `/` ↔ `/pocs/*` ↔ `/flow` 화면 이동. `/flow`는 n8n처럼 노드와 연결선으로 게이트 진행을 보여 준다. `flow.json` → `STATUS.md` 동기화 스크립트 |
| G3 완성·배포 | 원본 시안(`docs/drafts/maple-boss-main-dark-v2.png`, 삭제 모달)과 실제 화면 비교, 데스크톱·375px 화면, 핵심 인터랙션, 불필요 코드 제거, 빌드·테스트, 키 노출 검사, Vercel 배포, 배포 URL에서 핵심 시나리오 재검증 |

## 최소 API 계약

| 메서드 | 경로 | 입력 | 출력 |
|---|---|---|---|
| GET | `/api/health` | | `{ ok, db: "postgres" \| "pglite", persistent }` |
| GET | `/api/character` | | `Character[]` |
| POST | `/api/character/import` | maplescouter `character-store` (전체, `state`, `searchResult`, 또는 북마클릿이 줄인 payload) | `Character` 201 / 400 |
| POST | `/api/character` | `{ name }` | 로컬 크롤러가 있을 때만. 없으면 501 + 가져오기 안내 |
| DELETE | `/api/character/[name]` | | 204 / 404 |
| GET | `/api/character/rates?name=` | | `ClearRate[]` (+label) / 400 이름 없음 / 404 |
| GET | `/api/boss?q=` / `/api/boss/[id]` | | `Boss[]` / `Boss` |
| GET/POST | `/api/party/requests` | `{ characterName, bossId, partySize }` | `Seeker[]` / 201 |
| GET/POST | `/api/party` | `{ bossId, members[] }` | `FormedParty[]` / `{ id, sum, clearable }` 201 |
| DELETE | `/api/party/[id]` | | 204 / 404 (저장한 파티 삭제, smoke 정리에도 씀) |

오류 응답은 모두 `{ error: string }`(한국어) + 4xx/5xx.

## 기능 정의 (PoC 입출력 기준)

- F1 캐릭터 등록: 닉네임 → maplescouter 결과(사람 확인은 사용자가 직접) → 캐릭터(직업·레벨·전투력·환산)와 보스 60종 `clearRate` 저장.
- F2 보스 검색: 보스 이름(별칭, 난이도 포함) → 보스 그림·레벨·HP·방어율·포스·최대 인원.
- F3 파티 편성: 보스 + 캐릭터들 → 배율 합, 110% 이상이면 공략 가능. 구직(희망 인원) 등록, 파티 저장·목록.
- F4 추천: 보스를 고르면 등록된 캐릭터로 가능한 최소 인원 파티 3개(`rankParties`), 없으면 최선의 조합.

## 역할

| 역할 | 모델 | 범위 |
|---|---|---|
| Orchestrator | Claude Opus 5.5 (메인 세션) | 계획, 결정, 게이트 판정, 커밋 |
| Builder | Claude Opus 5.5 (workflow agent) | 맡은 파일만 수정 |
| Critic | Claude Opus 5.5 (새 컨텍스트, 구현 설명 없이 코드·실행만) | 독립 검증, P0/P1/P2 판정 |
| Critic (교차) | GPT-6 Astra / GPT-6.1 Sol via Codex CLI | 사용량 한도로 2026-11-20까지 사용 불가 → B2 |

## 테스트 범위

공통 템플릿의 테스트 항목 중 이 서비스에 해당하는 것만 검증한다 (근거: DECISIONS D7).

- 해당: 결과 저장 및 목록 조회(파티·구직), 모바일 화면(375px), 서버 API 오류 처리, 캐릭터 가져오기 성공·실패·크기 제한(PDF 업로드 항목에 대응)
- 해당 없음: PDF 업로드, 카메라·마이크 권한, STT·TTS, 슬라이드 전환, 발표·심사 타이머, 페르소나 질문, 문서 출처 연결

## TODO

- [x] G0 기존 파일·CLI 확인, Vercel 프로젝트 `maple-boss` 연결, 기준 커밋(`dev-v1` 브랜치)
- [x] G0 Next 16, Postgres(PGlite/Neon) 저장소 전환, 하네스, 개발 서버
- [x] G1 `/pocs/*` 이동, 가져오기(북마클릿·붙여넣기), 최소 API, Critic
- [ ] G2 `/flow` 시각화, 문서 동기화, 화면 이동, Critic
- [ ] G3 디자인 비교·수정, 문구 검토, 정리, 배포, 배포 URL 재검증

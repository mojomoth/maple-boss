# 작업 로그

날짜순, 추가만 한다. 형식은 [conventions](conventions.md)의 "로그" 절. 최근 항목 보기: `grep "^## \[" docs/wiki/log.md | tail -5`

## [2026-11-16] commit | 초기 스냅샷 `74c11ae`

- 요구사항 문서([MAPLE_BOSS_CONTEXT](../MAPLE_BOSS_CONTEXT.md)), ponytail·hallmark 스킬, 에이전트 세션을 담은 첫 커밋.
- PoC 3종: 닉네임으로 캐릭터 등록, 보스 검색, 파티 편성. 약속 시간 잡기는 보류.

## [2026-11-16] ingest | maplescouter 정찰

- API 경로, Turnstile 사람 확인, `character-store` 구조를 확인하고 자동 우회 금지 정책을 정했다 ([POC_PLAN](../POC_PLAN.md), [research/](../research/)). → [maplescouter](maplescouter.md)

## [2026-11-16] ingest | 실측 크롤 3명

- 강은호·아델·고딩을 사람 확인을 거쳐 크롤했다. 보스 60행과 `clearRate`를 얻었고 픽스처는 지웠다 ([POC_PLAN](../POC_PLAN.md), [samples/](../research/samples/)).

## [2026-11-16] decision | 110% 규칙 확정

- 운영자 확인: 배율 합 110% 규칙 유지, `analytics` 문구는 참고만, 110% 미만 파티도 저장 ([POC_PLAN](../POC_PLAN.md)). → [clear-rate](clear-rate.md)

## [2026-11-16] ingest | 보스 60행 출처 정리

- maplestorywiki·orangemushroom 기준 수치, 검증·추정 구분, 그림 18개 ([SOURCES](../../pocs/boss/SOURCES.md)). → [boss-catalogue](boss-catalogue.md)

## [2026-11-17] commit | PoC 2차 + 메인 화면 디자인 `62727d2` (v1 기준)

- 메인 화면 `/`는 시안 [maple-boss-main-dark-v2.png](../drafts/maple-boss-main-dark-v2.png)를 실제 데이터로 따랐다. 삭제 모달, `rankParties`, `DELETE /api/character/[name]` 추가. 디자인은 운영자 검토 대기 ([POC_PLAN](../POC_PLAN.md)). → [party-suggestion](party-suggestion.md)

## [2026-11-17] decision | v1 계획과 결정 D1–D8

- 게이트 G0–G3, 최소 API 계약, 기능 F1–F4 ([PLAN](../dev-v1/PLAN.md)).
- Postgres 전환, 북마클릿 가져오기, Next.js 16, 차단 B1–B3 ([DECISIONS](../dev-v1/DECISIONS.md)). → [deployment](deployment.md)

## [2026-11-17] ingest | 위키 생성

- Karpathy LLM Wiki 방식으로 `docs/wiki/` 8쪽을 만들었다. 코드 근거는 커밋 `62727d2` 기준.
- 원본끼리 어긋난 곳: CONTEXT·POC_PLAN의 SQLite와 Next.js 15는 DECISIONS D1·D6로 바뀌었다. PLAN이 말하는 `STATUS.md`와 D2의 `character/parse.ts`는 아직 없다.

## [2026-11-17] lint | G3 정리와 키 노출 검사

- 안 쓰는 CSS·토큰·분기·설정, 낡은 주석, 템플릿 README·favicon을 지웠고, 키 노출은 없었다([cleanup](../dev-v1/evidence/G3/cleanup.md), [secrets-scan](../dev-v1/evidence/G3/secrets-scan.txt)).

## [2026-11-17] update | 배포와 영구 DB 차단

- 운영 배포: https://maple-boss-livid.vercel.app (Root Directory `pocs`, Node 24.x). 운영 smoke 86/86, 보안 헤더 확인([final](../dev-v1/evidence/G3/deploy/final/)).
- 영구 DB는 아직 없다. Neon은 약관 동의 전이고, Render 무료 자리는 다른 프로젝트가 쓰고 있다. 운영 `/tmp` PGlite는 인스턴스마다 따로라 가져온 캐릭터와 구직이 화면에 거의 나오지 않는다([db](../dev-v1/evidence/G3/deploy/db.txt), [deploy-1](../dev-v1/evidence/G3/deploy/deploy-1.txt)). G3 판정은 B1 해결 때까지 보류([DECISIONS](../dev-v1/DECISIONS.md)).

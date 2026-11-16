# 현재 상태

게이트 표는 `flow.json`에서 만든다 (G2에서 `npm run flow:sync`로 자동화). 그 아래는 사람이 관리한다.

<!-- flow:start -->
<!-- flow:sync updatedAt=2026-11-17T03:30:00+09:00 hash=c5c8e79a05ed -->
`flow.json` 2026-11-17T03:30:00+09:00 기준. 이 블록은 `npm run flow:sync`가 다시 쓰므로 `flow.json`을 고친 뒤 실행한다.

| 게이트 | 상태 | 단계 | 근거 |
|---|---|---|---|
| G0 준비 | 통과 | 계획 → 구현 → 검증 → 판정 | [`PLAN.md`](PLAN.md), [`DECISIONS.md`](DECISIONS.md), [`evidence/G0/foundation.txt`](evidence/G0/foundation.txt), [`evidence/G0/tests.txt`](evidence/G0/tests.txt), [`evidence/G0/pg-path.txt`](evidence/G0/pg-path.txt), [`evidence/G0/build.txt`](evidence/G0/build.txt), [`evidence/G1/critic-api/`](evidence/G1/critic-api/) |
| G1 PoC | 통과 | 구현 → 검증 실패 → 수정 → 재검증 → 판정 · 수정 루프 1회 | [`evidence/G1/`](evidence/G1/), [`evidence/G1/critic-ui/`](evidence/G1/critic-ui/), [`evidence/G1/fix-round-1.txt`](evidence/G1/fix-round-1.txt), [`evidence/G1/recheck-1/`](evidence/G1/recheck-1/), [`STATUS.md`](STATUS.md) |
| G2 통합 | 통과 | 구현 → 검증 → 판정 | [`evidence/G2/flow-shots.txt`](evidence/G2/flow-shots.txt), [`evidence/G2/nav-walk.txt`](evidence/G2/nav-walk.txt), [`evidence/G2/flow-sync.txt`](evidence/G2/flow-sync.txt), [`evidence/G2/critic/`](evidence/G2/critic/), [`STATUS.md`](STATUS.md) |
| G3 완성·배포 | 진행 중 | 구현 → 구현 대기 → 구현 대기 → 검증 대기 → 판정 대기 | [`evidence/G3/spike.txt`](evidence/G3/spike.txt) |

차단

- B1 Neon 약관 동의 필요 (사용자). 그 전까지 배포 저장소는 요청 사이에도 데이터가 사라질 수 있음 · 열림
- B2 Codex(GPT) 사용량 한도, 2026-11-20 18:31까지 · 열림
- B3 .env 없음 (OpenAI 등 키) · 열림
<!-- flow:end -->

## P2 백로그 (G1 Critic, 2026-11-17)

기능에는 영향이 없어 기록하고 넘어간 항목. G3 정리 단계에서 처리하거나 사유를 남긴다.

| ID | 내용 | 파일 |
|---|---|---|
| API-1, P2-5 | 이름이 `.`/`..`인 캐릭터는 가져올 수 있지만 지울 수 없다 | `character/parse.ts`, `app/api/character/[name]` |
| API-2 | clearRate 상한이 없어 합계가 Infinity → `sum: null` | `character/parse.ts` |
| API-3 | NUL 문자·짝 없는 서로게이트가 400이 아니라 500 | `character/parse.ts` |
| API-4, P2-7 | 파티 오류·PoC 화면 문구가 합쇼체, 같은 조건에 문구 두 가지. `/import` 제목이 'Maple Boss PoC' | `party/index.ts`, `app/pocs/*`, `app/import`, `app/layout.tsx` |
| API-5 | pg 경로 이중 편성 테스트가 순서에 따라 흔들린다 | `lib/db.test.ts` |
| API-7 | 일부 오류 응답이 `{ error }`가 아니다(프레임워크 기본값) | `app/api` |
| API-8 | 흔한 보스 별칭 일부를 못 찾는다 | `boss/data.ts`, `boss/search.ts` |
| API-9 | partySize를 느슨하게 변환한다 | `app/api/party/requests` |
| API-10 | DB가 죽으면 `/`, `/pocs/party`가 기본 500 화면 | `app/page.tsx`, `app/pocs/party/page.tsx` |
| P2-1 | 삭제 모달이 서버에 못 닿으면 영어 'Failed to fetch' | `app/CharacterGrid.tsx` |
| P2-2 | 하이드레이션 전에 친 글자가 사라진다 | `app/BossSearch.tsx`, `app/AddCharacter.tsx` |
| P2-3 | 파티 편성 버튼 두 번 클릭 시 저장 후 오류 표시 | `app/pocs/party/PartyClient.tsx` |
| P2-4 | 붙여넣기 가져오기 성공 뒤 포커스가 body로 간다 | `app/AddCharacter.tsx` |
| P2-6 | 반올림한 멤버 배율과 내림한 합계가 어긋날 수 있다 | `app/pocs/party/*` |
| P2-8 | 이미 보이는 보스를 검색하면 `?q=`와 입력값이 남는다 | `app/BossSearch.tsx` |
| G2-P2-1 | `updatedAt`에 공백이 있으면 검사는 통과하지만 /flow가 계속 '반영 안 됨' | `app/flow/flow.mjs` |
| G2-P2-2 | 앱 404 페이지가 없어 `/pocs` 등 잘못된 주소에서 영어 기본 404, 돌아갈 링크 없음 | `app/not-found.tsx` |
| G2-P2-4 | 화면 전환 내비에 현재 페이지 표시가 없다 | `app/pocs/layout.tsx` |
| SPIKE | `/tmp` PGlite 콜드 스타트 6~9초, 함수 리전 iad1 (Neon 연결 시 리전 맞춤) | 배포 설정 |

## 알려진 제약

- 가져오기는 데스크톱 전용에 가깝다. 모바일 브라우저는 북마크바 드래그가 안 되고, 붙여넣기에는 개발자 도구가 필요하다.
- 배포 저장소: Neon(B1) 전까지 `/tmp` PGlite. 인스턴스마다 따로라 저장한 내용이 다음 요청에서 안 보일 수 있다 (`evidence/G3/spike.txt`).
- 차단 B1~B3: `DECISIONS.md` 참고.

# 현재 상태

게이트 표는 `flow.json`에서 만든다 (G2에서 `npm run flow:sync`로 자동화). 그 아래는 사람이 관리한다.

<!-- flow:start -->
| 게이트 | 상태 | 근거 |
|---|---|---|
| G0 준비 | PASS | `evidence/G0/` |
| G1 PoC | PASS (P1 1건 수정 후) | `evidence/G1/` |
| G2 통합 | 진행 중 | |
| G3 완성·배포 | 대기 | |
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

## 알려진 제약

- 가져오기는 데스크톱 전용에 가깝다. 모바일 브라우저는 북마크바 드래그가 안 되고, 붙여넣기에는 개발자 도구가 필요하다.
- 차단 B1~B3: `DECISIONS.md` 참고.

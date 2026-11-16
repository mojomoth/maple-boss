# 현재 상태

게이트 표는 `flow.json`에서 만든다 (G2에서 `npm run flow:sync`로 자동화). 그 아래는 사람이 관리한다.

<!-- flow:start -->
<!-- flow:sync updatedAt=2026-11-17T07:00:00+09:00 hash=358d22d56194 -->
`flow.json` 2026-11-17T07:00:00+09:00 기준. 이 블록은 `npm run flow:sync`가 다시 쓰므로 `flow.json`을 고친 뒤 실행한다.

| 게이트 | 상태 | 단계 | 근거 |
|---|---|---|---|
| G0 준비 | 통과 | 계획 → 구현 → 검증 → 판정 | [`PLAN.md`](PLAN.md), [`DECISIONS.md`](DECISIONS.md), [`evidence/G0/foundation.txt`](evidence/G0/foundation.txt), [`evidence/G0/tests.txt`](evidence/G0/tests.txt), [`evidence/G0/pg-path.txt`](evidence/G0/pg-path.txt), [`evidence/G0/build.txt`](evidence/G0/build.txt), [`evidence/G1/critic-api/`](evidence/G1/critic-api/) |
| G1 PoC | 통과 | 구현 → 검증 실패 → 수정 → 재검증 → 판정 · 수정 루프 1회 | [`evidence/G1/`](evidence/G1/), [`evidence/G1/critic-ui/`](evidence/G1/critic-ui/), [`evidence/G1/fix-round-1.txt`](evidence/G1/fix-round-1.txt), [`evidence/G1/recheck-1/`](evidence/G1/recheck-1/), [`STATUS.md`](STATUS.md) |
| G2 통합 | 통과 | 구현 → 검증 → 판정 | [`evidence/G2/flow-shots.txt`](evidence/G2/flow-shots.txt), [`evidence/G2/nav-walk.txt`](evidence/G2/nav-walk.txt), [`evidence/G2/flow-sync.txt`](evidence/G2/flow-sync.txt), [`evidence/G2/critic/`](evidence/G2/critic/), [`STATUS.md`](STATUS.md) |
| G3 완성·배포 | 진행 중 | 구현 → 구현 → 검증 실패 → 수정 → 재검증 → 구현 진행 중 → 검증 대기 → 판정 대기 · 수정 루프 1회 | [`evidence/G3/spike.txt`](evidence/G3/spike.txt), [`evidence/G3/design-diff.md`](evidence/G3/design-diff.md), [`evidence/G3/copy-review.md`](evidence/G3/copy-review.md), [`evidence/G3/p2-resolution.md`](evidence/G3/p2-resolution.md), [`evidence/G3/cleanup.md`](evidence/G3/cleanup.md), [`evidence/G3/secrets-scan.txt`](evidence/G3/secrets-scan.txt), [`evidence/G3/critic-design-copy/`](evidence/G3/critic-design-copy/), [`evidence/G3/critic-function-security/`](evidence/G3/critic-function-security/), [`evidence/G3/fix-round-1.txt`](evidence/G3/fix-round-1.txt), [`evidence/G3/recheck-1/`](evidence/G3/recheck-1/) |

차단

- B1 Neon 약관 동의 필요 (사용자). 그 전까지 배포 저장소는 요청 사이에도 데이터가 사라질 수 있음 · 열림
- B2 Codex(GPT) 사용량 한도, 2026-11-20 18:31까지 · 열림
- B3 .env 확인됨 (2026-11-17 00:49, 키 7개: JEV/GOOGLE/OPENAI/CLAUDE/VERCEL/RENDER/OPENROUTER) · 해결
<!-- flow:end -->

## P2 백로그

- G1·G2 Critic P2 18건: 17건 처리, 1건(SPIKE)은 배포 설정에서 다룬다 → [`evidence/G3/p2-resolution.md`](evidence/G3/p2-resolution.md)
- G3 로컬 Critic P2 14건 (G3b에서 정리):

| ID | 내용 |
|---|---|
| D3 | 961~1225px에서 상단 로고가 좁아진다 |
| D4 | 보스 검색 칸에 Chrome 기본 ×·▾ 표시가 보인다 |
| D5 | 본문 안 링크가 주변 글자와 구분되지 않는다 |
| D6 | 삭제 모달 보조 문구가 시안보다 작다 |
| D7 | /flow, /pocs 문구 다듬기 |
| FN-3 | 이름이 `import`, `rates`인 캐릭터는 가져올 수 있지만 지울 수 없다 |
| FN-4 | /pocs/boss에 q가 두 번 오면 오류 화면 |
| FN-5 | /pocs/character가 불러오기 실패를 숨긴다 |
| FN-6 | /pocs/party 오류 문구가 성공 문구처럼 보이고 읽힌다 |
| FN-7 | 로컬 크롤러가 이름을 정리하지 않고 samples 파일을 쓴다. POST /api/character를 다른 사이트에서 부를 수 있다 |
| FN-8 | 하네스 목록의 G2 회귀 스크립트가 낡았다 |
| FN-9 | B3 기록이 낡았다 → 해결 |
| FN-10 | 넓은 영문 12자 닉네임이 카드에서 말줄임 없이 잘린다 |
| FN-11 | 개발 콘솔 로고 경고 |

## 알려진 제약

- 가져오기는 데스크톱 전용에 가깝다. 모바일 브라우저는 북마크바 드래그가 안 되고, 붙여넣기에는 개발자 도구가 필요하다.
- 배포 저장소: Neon(B1) 전까지 `/tmp` PGlite. 인스턴스마다 따로라 저장한 내용이 다음 요청에서 안 보일 수 있다 (`evidence/G3/spike.txt`).
- 차단 B1~B3: `DECISIONS.md` 참고.

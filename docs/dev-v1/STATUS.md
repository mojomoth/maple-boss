# 현재 상태

게이트 표는 `flow.json`에서 만든다 (G2에서 `npm run flow:sync`로 자동화). 그 아래는 사람이 관리한다.

<!-- flow:start -->
<!-- flow:sync updatedAt=2026-11-17T22:00:00+09:00 hash=7d86e0a2aede -->
`flow.json` 2026-11-17T22:00:00+09:00 기준. 이 블록은 `npm run flow:sync`가 다시 쓰므로 `flow.json`을 고친 뒤 실행한다.

| 게이트 | 상태 | 단계 | 근거 |
|---|---|---|---|
| G0 준비 | 통과 | 계획 → 구현 → 검증 → 판정 | [`PLAN.md`](PLAN.md), [`DECISIONS.md`](DECISIONS.md), [`evidence/G0/foundation.txt`](evidence/G0/foundation.txt), [`evidence/G0/tests.txt`](evidence/G0/tests.txt), [`evidence/G0/pg-path.txt`](evidence/G0/pg-path.txt), [`evidence/G0/build.txt`](evidence/G0/build.txt), [`evidence/G1/critic-api/`](evidence/G1/critic-api/) |
| G1 PoC | 통과 | 구현 → 검증 실패 → 수정 → 재검증 → 판정 · 수정 루프 1회 | [`evidence/G1/`](evidence/G1/), [`evidence/G1/critic-ui/`](evidence/G1/critic-ui/), [`evidence/G1/fix-round-1.txt`](evidence/G1/fix-round-1.txt), [`evidence/G1/recheck-1/`](evidence/G1/recheck-1/), [`STATUS.md`](STATUS.md) |
| G2 통합 | 통과 | 구현 → 검증 → 판정 | [`evidence/G2/flow-shots.txt`](evidence/G2/flow-shots.txt), [`evidence/G2/nav-walk.txt`](evidence/G2/nav-walk.txt), [`evidence/G2/flow-sync.txt`](evidence/G2/flow-sync.txt), [`evidence/G2/critic/`](evidence/G2/critic/), [`STATUS.md`](STATUS.md) |
| G3 완성·배포 | 막힘 | 구현 → 구현 → 검증 실패 → 수정 → 재검증 → 구현 → 구현 → 검증 실패 → 수정 → 재검증 → 판정 막힘 · 수정 루프 2회 | [`evidence/G3/spike.txt`](evidence/G3/spike.txt), [`evidence/G3/design-diff.md`](evidence/G3/design-diff.md), [`evidence/G3/copy-review.md`](evidence/G3/copy-review.md), [`evidence/G3/p2-resolution.md`](evidence/G3/p2-resolution.md), [`evidence/G3/cleanup.md`](evidence/G3/cleanup.md), [`evidence/G3/secrets-scan.txt`](evidence/G3/secrets-scan.txt), [`evidence/G3/critic-design/`](evidence/G3/critic-design/), [`evidence/G3/critic-function/`](evidence/G3/critic-function/), [`evidence/G3/fix-round-1.txt`](evidence/G3/fix-round-1.txt), [`evidence/G3/recheck-1/`](evidence/G3/recheck-1/), [`evidence/G3/p2-resolution-g3.md`](evidence/G3/p2-resolution-g3.md), [`evidence/G3/deploy/db.txt`](evidence/G3/deploy/db.txt), [`evidence/G3/deploy/deploy-1.txt`](evidence/G3/deploy/deploy-1.txt), [`evidence/G3/deploy/critic/critic-deployed.txt`](evidence/G3/deploy/critic/critic-deployed.txt), [`evidence/G3/deploy/fix-round-1.txt`](evidence/G3/deploy/fix-round-1.txt), [`evidence/G3/deploy/recheck-1/`](evidence/G3/deploy/recheck-1/), [`STATUS.md`](STATUS.md) |

차단

- B1 영구 DB가 필요해요. Neon 약관 동의(무료, 권장) 또는 유료 DB 승인을 기다려요. 그 전까지 운영 저장소는 요청마다 달라질 수 있어요 · 열림
- B2 Codex(GPT) 사용량 한도, 2026-11-20 18:31까지 · 열림
- B3 .env 확인됨 (2026-11-17, 키 7개) · 해결
<!-- flow:end -->

## P2 백로그

- G1·G2 Critic P2 18건: 17건 처리, 1건(SPIKE)은 배포 설정에서 다룬다 → [`evidence/G3/p2-resolution.md`](evidence/G3/p2-resolution.md)
- G3 로컬 Critic P2 14건: 모두 처리 → [`evidence/G3/p2-resolution-g3.md`](evidence/G3/p2-resolution-g3.md)
- G3 배포 Critic P2 4건(375px 가져오기 안내·/flow 차단 목록 넘침, 보안 헤더, 파티 API 본문 크기): 오케스트레이터가 처리 (DECISIONS D11)

## 최종 운영 확인 (2026-11-17 07:27Z, 커밋 48a38db 배포)

- `BASE_URL=https://maple-boss-livid.vercel.app npm run smoke`: 86 ok, 실패 0 ([`final/smoke-prod.txt`](evidence/G3/deploy/final/smoke-prod.txt))
- 375px 가져오기 안내(18자 닉네임)와 /flow 차단 목록: 가로 넘침 없음
- 헤더: `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `x-powered-by` 없음, `/.env` 404 ([`final/headers.txt`](evidence/G3/deploy/final/headers.txt))
- `/api/health`: `pglite`, `persistent: false` (B1)

## 남은 일 (B1 해결 뒤)

1. 사용자가 Neon 약관에 동의 → `evidence/G3/deploy/db.txt`의 A 단계 실행 (Neon `sin1`, 함수 리전 `sin1`, `DATABASE_URL`은 Production·Preview만)
2. 재배포 → `/api/health`가 `postgres`, `persistent: true`인지 확인 → 운영에서 시나리오 B(가져오기)·C(파티) 재검증
3. G3 판정 PASS → `flow.json` 갱신, `npm run flow:sync`, `main`에 fast-forward
4. 2026-11-20 18:31 뒤 Codex(GPT-6 Astra / 6.1 Sol) 교차 Critic 한 번 (B2)

## 알려진 제약

- 가져오기는 데스크톱 전용에 가깝다. 모바일 브라우저는 북마크바 드래그가 안 되고, 붙여넣기에는 개발자 도구가 필요하다.
- 배포 저장소: 영구 DB(B1) 전까지 `/tmp` PGlite. 페이지와 API가 다른 인스턴스에서 돌 수 있어, 운영에서 가져온 캐릭터와 구직은 화면에 거의 나오지 않는다 (`evidence/G3/deploy/deploy-1.txt`). 화면마다 이 사실을 안내한다.
- 운영 수치(2026-11-17): 엣지 icn1, 함수 iad1, 콜드 스타트 6.5~9초, 웜 0.26~0.63초, 본문 한도 앱 1MB / 플랫폼 4.5MB, 함수 최대 300초.
- 차단 B1~B3: `DECISIONS.md` 참고.

# 파티 추천

보스를 고르면 등록된 캐릭터로 110%를 넘는 가장 작은 파티를 찾는다(PLAN F4). 계산은 외부 의존이 없는 [ratio.ts][ratio] 한 파일에 있다. 판정 기준은 [clear-rate](clear-rate.md).

## rankParties: 메인 화면 추천

- 배율 상위 16명만 본다. 1명부터 `maxSize`명까지 모든 조합 중 110% 이상인 것을 모아 인원이 적은 순, 같으면 합이 큰 순으로 정렬하고 앞의 `limit`(기본 3)개를 돌려준다. 멤버는 배율이 큰 순이다 ([ratio.ts][ratio]).
- 16명 제한은 조합 수를 최대 2^16(약 6.5만)으로 묶으려는 것이다. 후보가 더 많아지면 가지치기나 인원별 탐색이 필요하다고 코드 주석에 적혀 있다 ([ratio.ts][ratio]).
- 메인 화면(`/`)은 고른 보스에 배율이 있는 캐릭터만 후보로 넣고, `maxSize`는 그 보스의 최대 인원이다 ([page.tsx][page]).
- 예: 익스트림 카링(강은호 0.935, 아델 0.832, 고딩 0.793)이면 2인 파티 3개가 합이 큰 순으로 나온다. 강은호+아델, 강은호+고딩, 아델+고딩 ([ratio.test.ts][test]).
- PLAN F4는 "가능한 최소 인원 파티 3개"를 요구한다 ([PLAN][plan]).

## suggestParty: 가능한 파티가 없을 때

- 배율이 큰 순으로 한 명씩 넣다가 110%에 닿거나 인원 한도에 차면 멈춘다. 상위 k명의 합이 k명 조합 중 가장 크므로 처음 110%에 닿는 k가 최소 인원이다 ([ratio.ts][ratio]).
- 한도 안에서 110%에 못 닿으면 상위 `size`명, 곧 가능한 최선 조합을 돌려준다 ([ratio.ts][ratio], [ratio.test.ts][test]).
- 메인 화면은 `rankParties` 결과가 0개일 때만 이 조합을 "가장 센 N인 조합도 합계 …"로 보여 주고 110%까지 모자란 값을 함께 적는다 ([page.tsx][page], [PLAN F4][plan]).
- `/party` 화면의 추천 버튼도 이 함수를 쓴다. 후보는 배율이 있고 희망 인원이 현재 파티 크기 이상인 구직자다 ([PartyClient.tsx][client]).

## 공통

- 두 함수 모두 입력 배열을 바꾸지 않는다 ([ratio.test.ts][test]).
- 기준 커밋 `62727d2` 시점의 코드다. 화면 경로는 v1 G1에서 `/pocs/*`로 옮겨질 예정이다 ([PLAN][plan]).

[plan]: ../dev-v1/PLAN.md
[ratio]: ../../pocs/party/ratio.ts
[test]: ../../pocs/party/ratio.test.ts
[page]: ../../pocs/app/page.tsx
[client]: ../../pocs/app/party/PartyClient.tsx

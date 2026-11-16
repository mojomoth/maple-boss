# clearRate와 110% 규칙

`clearRate`는 maplescouter가 캐릭터 × 보스마다 계산한 배율이다. 파티 멤버의 `clearRate` 합이 110% 이상이면 공략 가능으로 본다.

## clearRate

- 캐릭터마다 보스 60행의 `clearRate`가 `calculatedData.bossCuts`에 있고, 앱은 이를 `clear_rates` 표에 저장한다 ([POC_PLAN][poc]).
- 피해 비율이며 환산 주스탯과 선형 관계가 아니다. 예: 강은호의 익스트림 카링은 0.935, 노말 스우는 17832 ([POC_PLAN][poc], [강은호.json][kang]).
- maplescouter 안내 문구 기준으로 보스컷은 제한시간 기준(하드 루시드만 3페이즈 기준)이고, 5명 안팎의 숙련 유저와 논의해 갱신한다 ([bossbox2.json][bb2]).
- `analytics`는 maplescouter의 판정 문구다. 강은호 샘플에는 `솔플 가능`, `솔플 여유컷`, `솔플 최소컷`, `2인 최소컷`이 나온다 ([강은호.json][kang]).

## 110% 규칙

- 요구사항: 캐릭터마다 보스 배율을 합산해 110% 이상이면 공략 가능 보스로 구분한다 ([CONTEXT][ctx]).
- 구현: `sum(멤버 clearRate) >= 1.10`. 상수는 `CLEAR_THRESHOLD = 1.1` ([POC_PLAN][poc], [types.ts][types]).
- 예전 `환산/cut` 규칙과 `cut` 필드는 지웠다 ([POC_PLAN][poc]).
- 부동소수 오차 때문에 `1e-9` 여유를 둔다. 0.7 + 0.4 = 1.0999…도 공략 가능이다 ([ratio.ts][ratio]).
- 공략 불가 합계는 0.1% 단위로 내림해 보여 준다. 109.96%가 "110.0% · 공략 불가"로 보이지 않게 하려는 것이다 ([ratio.ts][ratio], [ratio.test.ts][test]).
- 판정은 결정적 계산이라 AI 분석을 넣지 않는다 ([DECISIONS D3][dec]).

## 운영자 결정 (2026-11-16, 실측 크롤 뒤)

- maplescouter `analytics` 문구와 어긋나도 110% 합 규칙을 유지한다. 파티 전용 보스는 `N인 최소컷`으로 나오고 maplescouter는 솔로 최소컷을 약 90%로 본다. 문구는 배율 옆에 참고로만 보여 준다 ([POC_PLAN][poc]).
  - 예: 강은호의 익스트림 카링 0.935는 maplescouter에서 `솔플 최소컷`이지만 이 서비스에서는 혼자 공략 불가다 ([강은호.json][kang], [ratio.test.ts][test]).
- 110% 미만 파티도 저장하고 공략 불가로 표시한다. 배율은 파티를 만들 때 값으로 고정한다 ([POC_PLAN][poc], [party/index.ts][party]).
- 그 보스 배율이 없는 구직자는 "배율 없음"으로 보이고 고를 수 없다. 희망 인원은 그 캐릭터가 들어갈 최대 파티 크기다 ([POC_PLAN][poc]).
- 파티 합계는 실제 합이다. 반올림한 멤버 배율을 더한 값과 0.1% 차이가 날 수 있다 ([POC_PLAN][poc]).

관련: [party-suggestion](party-suggestion.md), [boss-catalogue](boss-catalogue.md)

[ctx]: ../MAPLE_BOSS_CONTEXT.md
[poc]: ../POC_PLAN.md
[dec]: ../dev-v1/DECISIONS.md
[kang]: ../research/samples/강은호.json
[bb2]: ../research/bossbox2.json
[types]: ../../pocs/lib/types.ts
[ratio]: ../../pocs/party/ratio.ts
[test]: ../../pocs/party/ratio.test.ts
[party]: ../../pocs/party/index.ts

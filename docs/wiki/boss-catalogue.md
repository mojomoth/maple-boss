# 보스 목록

보스 데이터는 maplescouter `bossCuts`와 같은 60행(보스 18종 × 난이도)이다. 시드는 [data.ts][data], 출처 정리는 [SOURCES.md][src]에 있다.

## 구성

- 행 집합은 강은호 샘플의 `calculatedData.bossCuts` 60개와 정확히 같다 ([SOURCES][src]).
- 보스 18종: 가엔슬, 검은 마법사, 대적자, 더스크, 데미안, 듄켈, 루시드, 림보, 발드릭스, 벨로나, 세렌, 스우, 윌, 유피테르, 진 힐라, 카링, 칼로스, 흉성 ([POC_PLAN][poc]).
- 난이도는 이지, 노말, 하드, 카오스, 익스트림, 데스티니, 챔피언 ([POC_PLAN][poc], [search.ts][search]).
- 난이도별 행 수: 노말 17, 하드 15, 익스트림 8, 이지 6, 데스티니 6, 챔피언 5, 카오스 3 (2026-11-17에 [data.ts][data]에서 집계).
- 60행 = 원래 파티 모드 44 + 벨로나 3 + 유피테르 2 + 데스티니 6 + 챔피언 5 ([SOURCES][src]).
- id는 `<난이도>-<slug>`(예: `extreme-kaling`). `scouterName`은 maplescouter 약칭이고 `resolveScouterBoss(이름, 난이도)`가 이를 id로 바꾼다 ([data.ts][data], [boss/index.ts][idx]).
- 검색은 공백으로 나눈 단어가 모두 "난이도 + 이름 + 약칭 + id"에 들어 있으면 맞는다. 공백과 대소문자는 무시한다. "노말 카링", "검은마법사", "가엔슬" 모두 찾는다 ([search.ts][search]).

## 수치와 신뢰도

- 최대 인원(`maxParty`)은 모든 행에서 샘플 `isPartyLimit`과 같고 테스트로 확인했다 ([SOURCES][src]).
- 원래 44행의 레벨·방어율·포스는 위키 값이고 난이도마다 가장 높은 페이즈 값을 쓴다. `statBasis`는 방어율 380 이상이면 `"380"`, 아니면 `"300"`이다 ([SOURCES][src]).
- HP는 페이즈별 HP 바 하나씩의 합이고 GMS 위키 값이라 KMS와 교차 확인하지 않았다. KMS 1.2.416(2026-07)에서 대부분 보스 HP가 약 32–33% 줄었다 ([SOURCES][src]).
- 추정값: 유피테르 하드 HP, 데스티니 세렌(HP를 하드와 같다고 가정해 약 5배 낮을 수 있음), 챔피언 칼로스(기반 난이도를 노말로 추정) ([SOURCES][src]).
- 데스티니·챔피언은 기존 모드의 솔로 버전이고 최대 인원은 1이다. 피해 보정은 maplescouter `clearRate`에 이미 들어 있다 ([SOURCES][src]).
- HP는 화면 표시용이다. 파티 계산은 `clearRate`만 쓴다 ([SOURCES][src], [clear-rate](clear-rate.md)).
- 수치 출처는 maplestorywiki.net과 orangemushroom.net(KMS 패치 노트)이다. 나무위키는 403으로 막혔다. 단위는 `t` = 1e12(조), `Q` = 1e15(천조) ([SOURCES][src]).

## 그림

- 18종 모두 실제 그림이고 자리표시자는 없다. `https://media.maplestorywiki.net/yetidb/<파일>`에서 한 번 내려받아 `pocs/public/bosses/<slug>.png`에 두었고 핫링크하지 않는다 ([SOURCES][src]).
- 데스티니·챔피언 행은 기반 보스 그림을 다시 쓴다 ([SOURCES][src]).
- 새 그림 생성은 하지 않는다. 필요해지면 OpenAI 키가 있어야 하는데 `.env`가 없다(B3) ([DECISIONS D3][dec]).

[poc]: ../POC_PLAN.md
[dec]: ../dev-v1/DECISIONS.md
[src]: ../../pocs/boss/SOURCES.md
[data]: ../../pocs/boss/data.ts
[idx]: ../../pocs/boss/index.ts
[search]: ../../pocs/boss/search.ts

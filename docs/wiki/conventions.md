# 위키 규칙

Karpathy의 [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 방식을 따른다. 사람이 원본을 고르고, LLM이 요약·연결 페이지를 쓰고 고친다.

## 세 층

| 층 | 위치 | 고치는 쪽 |
|---|---|---|
| 원본 | 아래 원본 목록 | 사람·작업 에이전트. 위키 작업 중에는 읽기만 한다 |
| 위키 | `docs/wiki/` | LLM |
| 규칙 | 이 페이지 | 사람과 LLM이 함께 |

## 원본 목록

| 원본 | 내용 |
|---|---|
| [MAPLE_BOSS_CONTEXT.md](../MAPLE_BOSS_CONTEXT.md) | 최초 요구사항, PoC 3종 정의 |
| [POC_PLAN.md](../POC_PLAN.md) | PoC 구조, maplescouter 정찰, 파티 규칙 확정 기록 |
| [research/](../research/) | maplescouter `character-store` 기본값, 보스컷 상자 정찰, 실측 샘플 3명 |
| [drafts/](../drafts/) | UI 원본 시안(메인, 삭제 모달)과 생성 프롬프트 |
| [pocs/boss/SOURCES.md](../../pocs/boss/SOURCES.md) | 보스 수치·그림 출처, 검증·추정 구분 |
| [dev-v1/PLAN.md](../dev-v1/PLAN.md) | v1 게이트 G0–G3, API 계약, 기능 F1–F4 |
| [dev-v1/DECISIONS.md](../dev-v1/DECISIONS.md) | 결정 D1–D8, 차단 B1–B3 |

동작을 설명할 때는 코드 파일(예: [pocs/party/ratio.ts](../../pocs/party/ratio.ts))도 근거로 링크한다. 코드는 바뀌므로 어느 커밋 기준인지 [log](log.md)에 남긴다.

## 페이지 이름과 형식

- 파일명은 영어 소문자 kebab-case `.md`, 한 주제에 한 페이지. `index.md`, `log.md`, `conventions.md`는 고정이다.
- 본문은 한국어 한다체로 짧게 쓴다. 제목 다음 첫 문단은 한두 문장 요약.
- 사실 문장마다 출처를 상대 링크로 붙인다. 링크가 길면 페이지 끝에 참조 정의(`[poc]: ../POC_PLAN.md`)를 둔다.
- 원본을 길게 복사하지 않는다. 표나 수치가 필요하면 원본 위치를 링크한다.
- 원본끼리 어긋나면 둘 다 링크하고 어느 쪽이 최신인지 적는다. `DECISIONS.md`가 그 전 계획 문서보다 우선한다.
- 위키 페이지끼리는 `[clear-rate](clear-rate.md)`처럼 잇는다. 새 페이지는 `index.md`에 한 줄로 등록한다.

## 원본 추가 (ingest)

1. 원본 파일을 `docs/` 아래 알맞은 곳에 둔다. 위키 폴더에는 두지 않는다.
2. 위 원본 목록 표에 한 줄 추가한다.
3. 관련 페이지를 고치거나 새 페이지를 만들고, 새 페이지는 `index.md`에 추가한다.
4. `log.md` 끝에 `ingest` 항목을 쓴다.

## 로그

- 항목 머리: `## [YYYY-MM-DD] 종류 | 제목`. 다음 줄부터 짧은 설명과 링크.
- 종류: `ingest`(원본 반영), `decision`(결정 기록), `commit`(기준 커밋), `query`(답을 페이지로 남김), `lint`(점검).
- 추가만 한다. 지난 항목을 바로잡을 때도 새 항목을 쓴다.
- 최근 다섯 항목: `grep "^## \[" docs/wiki/log.md | tail -5`

## 점검 (lint)

- 깨진 링크, 원본과 다른 내용, `index.md`에 없는 페이지, 출처 없는 문장을 찾는다.
- 코드 링크는 파일이 옮겨지면 깨진다. 점검 때 새 위치로 고친다.
- 결과는 `lint` 항목으로 log에 남긴다.

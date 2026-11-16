# Maple Boss

메이플 캐릭터를 검색해서 보스 몬스터를 잡는 계산 서비스 

## 개발 스택
- Next.JS
- Sqlite

## 필요 도구
- https://github.com/dietrichgebert/ponytail 개발 코드를 간략하게 구현
- https://github.com/nutlope/hallmark AI Slop 제거 

## Poc

pocs 폴더에 아래 PoC들을 구현한다. 구현된 내용은 간단하게 web 으로 확인하도록 해야한다.

- 닉네임 입력해서 캐릭터 등록하기
- 해당 캐릭터로 가고싶은 파티보스 및 인원 선택하기 (ex 노말 카링 2인, 익스트림 검은마법사 4인)
- 보스별로 파티 구직을 원하는 캐릭터 리스트 확인 및 파티 편성하기
- 이번주 보스 약속시간 잡기 (보류)

### Reference 

https://maplescouter.com 의 기능을 참고한다.

### 1. 닉네임 입력해서 캐릭터 등록하고 그리기 
- pocs/character 에 구현한다. 
- input: 캐릭터 이름, output: 캐리터 모습, 스탯
- https://maplescouter.com/ko/info?name=%EA%B0%95%EC%9D%80%ED%98%B8 을 참고한다. 해당 서비스를 크롤링 해도 된다.

### 2. 보스 이름 이력해서 보스 보여주기
- pocs/boss 에 구현한다.
- input: 보스 이름, output: 보스 그림, 스탯
- https://maplescouter.com/ko/result?name=%EA%B0%95%EC%9D%80%ED%98%B8 를 참고한다. 
  - #content-container > div.contents > div > div.flex.flex-1.flex-col.gap-3 > div.bg-surface-gray-surface-0.outline-outline-gray-med.inline-flex.w-full.flex-col.justify-start.gap-6.rounded-2xl.px-4.pt-4.pb-6.outline-1.outline-offset-\[-1px\] > div.relative > div 보스가 보여지는 박스

### 3. 보스 공략 파티 설정하기
- Input: 캐릭터 이름들/보스 이름 Output: 
- 캐릭터 마다 해당 보스 배율을 합산한다. 110% 이상 되면 공략 가능 보스로 구분한다. 
- https://maplescouter.com/ko/result?name=%EA%B0%95%EC%9D%80%ED%98%B8 예시
  - #content-container > div.contents > div > div.flex.flex-1.flex-col.gap-3 > div.bg-surface-gray-surface-0.outline-outline-gray-med.inline-flex.w-full.flex-col.justify-start.gap-6.rounded-2xl.px-4.pt-4.pb-6.outline-1.outline-offset-\[-1px\] > div.relative > div > div:nth-child(1) > div > div.flex.flex-col.items-center.gap-2 > div > div.cursor-help.text-\[0\.7rem\].font-medium 셀렉터가 보스 배율 합산 예시다


## Design
환산 주스탯 사이트
https://maplescouter.com/ko
디자인을 카피

## UI



### 로고 이미지
https://i.namu.wiki/i/Opr-1HnIcl1fTqpcxlh0VtyYb6JFGNMVtXNia0N08Pxcx9-FeUB8He2LoAEeNf1ViPX4RAJoK9QsV8G9OSYmxQ.webp


# 감정 기록 앱

하루 세 번(아침 08:00, 점심 12:00, 저녁 20:00) 기분과 메모를 기록하는 React + TypeScript + Vite 앱입니다. 기록은 브라우저 `localStorage`에 저장되어 새로고침 후에도 유지됩니다.

## 주요 기능

- 아침, 점심, 저녁 기분 기록
- 기분 선택과 자유 메모 입력
- 브라우저 알림 권한 요청 및 정해진 시간 알림
- 오늘 기록 완료 여부 표시
- 날짜별 기록 필터
- 기록 삭제
- 최근 7일 요약
- 기분별 횟수 통계
- 모바일 반응형 UI

## 설치

```bash
npm install
```

Windows PowerShell에서 `npm` 실행 정책 오류가 나면 아래처럼 실행할 수 있습니다.

```bash
npm.cmd install
```

## 실행

```bash
npm run dev
```

PowerShell 실행 정책 오류가 나는 경우:

```bash
npm.cmd run dev
```

실행 후 터미널에 표시되는 로컬 주소를 브라우저에서 열면 됩니다. 기본 주소는 보통 `http://localhost:5173`입니다.

## 빌드

```bash
npm run build
```

PowerShell 실행 정책 오류가 나는 경우:

```bash
npm.cmd run build
```

## 알림 안내

브라우저 알림은 사용자가 앱에서 알림 권한을 허용해야 동작합니다. 외부 서버나 백그라운드 서비스 없이 구현되어 있어 앱이 브라우저에서 열려 있을 때 정해진 시간에 알림을 보냅니다.
https://totoro00joon-svg.github.io/mood--tracker-korean/


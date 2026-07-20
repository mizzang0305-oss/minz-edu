---
type: implementation-report
project: Minz_Edu
status: implemented-local-poc
updated: 2026-07-20
tags:
  - minz-edu
  - phaser
  - mathlive
  - learning-game
  - colyseus
---

# Phaser + MathLive 학습 전투 PoC

## 목적

기존 민즈 학습 게임의 Phaser 장면을 재사용해 `/game`에서 독립 실행되는 수학 전투 PoC를 제공한다. 문제를 맞힌 뒤 아이가 직접 공격하고, 개념 룬이 100%가 되면 스페셜 스킬을 발동하는 흐름을 검증한다.

## 현재 구조 조사

- 프론트엔드: Next.js 16 App Router, React 19, TypeScript
- 게임 렌더링: Phaser 3.90 `NumberForestScene`과 `PhaserStage`
- 기존 전투 기반: HP, 보호막, 보스 공격, 70ms hit-stop, 화면 흔들림, 피해 숫자, 캐릭터별 검격/마법탄
- 기존 협동 기반: 같은 화면 2인 전투 상태와 Firestore 온라인 룸 API
- 이번 PoC 경계: Firebase API, Firestore Rules, 배포 설정은 변경하지 않음

## 학습 전투 흐름

1. MathLive 수식 입력창으로 답을 입력한다.
2. 오답이면 공격은 열리지 않고 수호자가 반격한다.
3. 정답이면 개념 룬과 스킬 게이지가 `skill_reward`만큼 오른다.
4. 아이가 공격 버튼을 직접 누른다. 0.5초 이상 누르면 차지 공격이 된다.
5. 심화 문제까지 해결해 개념 룬이 100%가 되면 스페셜 스킬이 열린다.
6. 스페셜 애니메이션 완료 이벤트 뒤 전투 결과를 확정한다.

## 학습 데이터 계약

```ts
type LearningBattleQuestion = {
  id: string;
  grade: number;
  subject: string;
  concept: string;
  question: string;
  answer: string;
  explanation: string;
  difficulty: "core" | "application" | "deep";
  skill_reward: number;
  hint: string;
};
```

아이 화면에서는 `explanation`을 별도 공부 설명으로 분리하지 않고 `전투 힌트`, `약점 해독` 문맥으로 보여 준다.

## 로컬 협동과 Colyseus 경계

- 현재: `solo`와 `local-coop`이 같은 순수 상태 엔진을 사용한다.
- 같은 화면 2인: 번개 검사와 불꽃 마법사가 문제마다 차례를 교대한다.
- 향후: `ColyseusLearningRoomContract`가 클라이언트 요청과 서버 확정 이벤트를 분리한다.
- 서버 권한 원칙: Colyseus 전환 시 답 판정, 피해량, 게이지, 보스 HP와 `revision`은 서버가 확정한다.
- 중복 방지: 모든 요청에 `clientSequence`, 서버 스냅샷에 `revision`을 사용한다.

## 실행

```powershell
npm install
npm run dev
```

- 로컬 URL: `http://localhost:3000/game`
- 별도 포트를 사용한 경우: `http://localhost:<port>/game`

## 검증 체크리스트

- [x] `npm run typecheck`
- [x] `npm test` — 35개 파일, 184개 테스트 통과
- [x] `npm run lint`
- [x] `npm run build`
- [x] 데스크톱에서 Phaser Canvas가 비어 있지 않음
- [x] 모바일 390×844 세로와 844×390 가로에서 문서 스크롤 없이 한 화면 유지
- [x] 표시되는 모든 터치 버튼 44×44px 이상, 화면 밖으로 잘린 버튼 없음
- [x] 정답 후에만 공격 버튼이 열림
- [x] 오답 후 보스 반격과 전투 힌트가 표시됨
- [x] 세 번째 심화 정답 후 스페셜 버튼과 애니메이션이 동작함

## 리스크

- 현재 문항은 PoC용 고정 3문항이며 교사 검수 콘텐츠 저장소와 아직 연결하지 않았다.
- Colyseus는 타입 계약만 있으며 실제 룸 서버, 재접속, 권한 검증은 구현하지 않았다.
- MathLive 모바일 가상 키보드는 실제 iOS/Android 기기에서 추가 확인이 필요하다.

## 롤백

`/game`, `game-poc`, `game/poc`, `gamePocQuestions`, `learningBattlePoc`, `mathlive-react` 파일을 제거하고 `package.json`과 `package-lock.json`에서 `mathlive`를 제거하면 기존 게임 동작으로 복귀한다.

## 다음 작업

1. Colyseus 권한형 Room 서버와 재접속/지연 시뮬레이션
2. 문제별 시도, 힌트, 소요 시간, 오답 유형 학습 로그
3. 교사 승인 문항만 사용하는 AI 문제 생성·검수 파이프라인

# 민즈 AI 공부게임

유아부터 중학교 3학년까지 캐릭터를 직접 움직여 탐험하고, 수학·국어·영어 문제를 풀어 몬스터를 물리치는 무료 웹 학습 RPG입니다.

- 운영 데모: [https://minz-edu.vercel.app](https://minz-edu.vercel.app)
- OpenAI Build Week 출품 부문: **Education**
- 결제, 광고, 유료 아이템, 공개 채팅 없음

## 주요 기능

- 숫자 숲·단어섬·이야기 성으로 이어지는 RPG 월드
- 유아·초등·중1~중3 학년, 학기, 주차별 수학·국어·영어 목표 선택
- 오답 진행 차단, 힌트·정답 해설, 전체 문제 화면과 스킬 선택 반격
- NPC 대화, 필드 적 공격, 보물 상자, 조각 수집, 대시, 2구역 이동
- 캐릭터 선택, STATUS, 장비·방어구·스킬, 모험 코인 상점
- 보호자 Google 로그인과 여러 자녀 프로필 분리
- 자녀별 스테이지 진행도, 학습 결과, 코인과 배지 Firebase 동기화
- 6자리 참가 코드 기반 2인 협동 로비
- 문제 수·정답·재도전·힌트·실행 시간·복습 영역 부모 이메일 요약
- 휴대폰 세로·가로, 태블릿과 PC 반응형 UI
- 처음 한 번 세계관, 플레이 방법과 최종 목표를 알려주는 게임 인트로

## 기술 구성

- Next.js 16, React 19, TypeScript
- Phaser 3, HTML5 Canvas, Tiled maps
- Firebase Authentication, Cloud Firestore, Firebase Admin SDK
- Tailwind CSS, PWA
- Vitest, React Testing Library, Playwright, Firebase Rules Unit Testing
- Vercel

## 로컬 실행

### 요구 사항

- Node.js 20 이상
- npm
- 온라인 기능 및 Firestore Rules 검증 시 Firebase CLI와 Java 21 이상

### 설치 및 개발 서버

```powershell
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. Firebase 운영 비밀값 없이도 로컬 게임의 기본 화면과 학습 흐름을 확인할 수 있습니다.

### 로컬 실시간 2인 학습 전투 PoC

별도 터미널에서 Colyseus 서버와 Next.js를 함께 실행한 뒤 `/game`에서 `온라인 2인`을 선택합니다.

```powershell
npm run dev:colyseus
npm run dev
```

방 생성·참가, 서버 권한 판정과 10초 재접속 구조는 [COLYSEUS_COOP_POC.md](./docs/minz-learning-game/COLYSEUS_COOP_POC.md)를 참고합니다. 이 로컬 PoC는 Firebase와 Production 설정을 변경하지 않습니다.

### Firebase 온라인 기능

온라인 기능은 저장소에 포함되지 않은 Firebase Web 설정과 Admin 인증정보가 필요합니다. 비밀값, 서비스 계정 키와 로컬 설정 파일은 Git에 커밋하지 않습니다.

1. Firebase CLI로 로컬 `.firebase-web-config.json`을 준비합니다.
2. Firebase Admin 인증정보는 로컬 환경변수 또는 배포 플랫폼의 암호화된 환경변수로 설정합니다.
3. `/login`에서 보호자 Google 로그인과 `HttpOnly` 서버 세션 교환을 사용합니다.
4. `/room`에서 방을 만들거나 6자리 코드로 참가하면 Firestore 구독으로 로비가 동기화됩니다.

온라인 데이터와 권한 구조는 [ONLINE_MOBILE_ARCHITECTURE.md](./docs/minz-learning-game/ONLINE_MOBILE_ARCHITECTURE.md), 게임 기록 동기화는 [FIREBASE_GAME_STATE_SYNC.md](./docs/minz-learning-game/FIREBASE_GAME_STATE_SYNC.md), 부모 메일 설정은 [PARENT_SESSION_EMAIL_REPORTS.md](./docs/minz-learning-game/PARENT_SESSION_EMAIL_REPORTS.md)에서 확인할 수 있습니다.

## 체험 순서

1. 첫 방문 게임 인트로를 확인하거나 건너뜁니다.
2. 보호자 Google 계정으로 로그인합니다. 아이의 개인 Google 계정은 필요하지 않습니다.
3. 유아·초등 또는 중1~중3 자녀 프로필을 만들거나 선택합니다.
4. 학년·학기·주차별 목표를 선택하고 월드에 입장합니다.
5. 화면 방향키 또는 키보드 방향키로 이동합니다.
6. NPC, 보물 상자와 목표물 근처에서 화면 상호작용 버튼을 누릅니다.
7. 보스전에서 문제를 크게 보고 풀고, 정답 해설 뒤 스킬을 골라 반격합니다.
8. 승리 후 코인, 스테이지 진행도, 학습 결과와 인벤토리를 확인합니다.

## 검증

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Firestore Rules는 Java 21 이상에서 검증합니다.

```powershell
npm run test:rules
```

## OpenAI Build Week — Codex와 GPT-5.6 활용

초기 학습 게임 아이디어는 출품 기간 전에 존재했습니다. OpenAI Build Week 기간에는 Codex와 GPT-5.6을 제품 설계, 구현, 오류 분석, 테스트, 보안 검토와 배포 파트너로 사용해 모바일 중심의 배포 가능한 학습 RPG로 발전시켰습니다.

### Codex가 가속한 작업

- Next.js, React, Phaser와 Firebase로 구성된 저장소 전체 구조 분석
- 실제 화면 캡처를 바탕으로 문제점을 재현하고 UI·게임플레이 개선
- 작은 화면에서는 문제를 전체 화면으로 분리하고 정답 뒤 게임·스킬 화면으로 복귀
- 보스 공격 예고, 문제 기반 회피·방어·반격 흐름 구현
- 휴대폰 세로·가로, 태블릿과 PC 반응형 레이아웃 안정화
- 학년·학기·주차·학습 목표 기반 스테이지 선택과 훈련 흐름 설계
- Google 보호자 로그인, 다중 자녀 프로필과 자녀별 Firebase 기록 동기화
- Phaser 장면 생명주기와 Canvas `drawImage` 오류의 원인 분석 및 회귀 방지
- 단위·통합·브라우저·Firestore Rules 테스트 작성과 반복 검증
- GitHub PR exact-head 검증, Vercel Preview와 Production 배포 확인

### GPT-5.6과 함께 결정한 제품 원칙

- 구독, 유료 아이템과 광고 없이 무료로 제공
- 유아부터 중3까지 단계별 대표 목표를 제공하고 학교 진도와 다를 때 직접 목표 선택
- 문제 풀이를 별도 시험지가 아니라 탐험과 전투 행동으로 표현
- 점프 대신 이동·대화·탐색·회피·스킬에 집중
- 보스 공격은 문제를 풀면 피하거나 막을 수 있도록 설계
- 오답을 처벌하지 않고 힌트와 재도전으로 연결
- 협동 플레이에서 공개 채팅과 직접 점수 비교를 제공하지 않음
- 아이에게 개인 Google 계정을 요구하지 않고 보호자 계정 아래에서 데이터 분리

### 출품 기간에 완성·개선한 범위

- RPG 탐험과 학습 문제를 결합한 반응형 게임 HUD
- 숫자 숲, 단어섬, 이야기 성 Tiled 월드와 단계별 보스 흐름
- 유아·초등·중등 교육과정 및 주차별 목표 선택(중등 72문항은 교사 검수 대기)
- 자녀별 진행도·학습 결과·인벤토리의 안전한 동기화와 레거시 데이터 정규화
- 첫 실행 스토리 인트로와 다시 보기
- 모바일 성능·접근성·오프라인 복구·회귀 테스트
- 공개 GitHub 저장소, Vercel 운영 배포와 심사용 문서

### 증빙

- 주요 Codex 작업 Session ID: `019f5437-0dbd-7c33-9300-e711c3b90f19`
- [Pull request 및 커밋 기록](https://github.com/mizzang0305-oss/minz-edu/pulls)
- [운영 애플리케이션](https://minz-edu.vercel.app)
- 테스트: Vitest, React Testing Library, Playwright, Firebase Rules Unit Testing

## 안전과 개인정보

- 아이는 개인 Google 계정 없이 보호자가 만든 자녀 프로필로 이용합니다.
- 서버는 보호자 세션과 자녀 소유 관계를 확인합니다.
- Firestore 직접 쓰기는 보안 규칙으로 제한합니다.
- 서비스 계정 키, 토큰, 비밀번호와 개인 데이터는 저장소에 포함하지 않습니다.
- 결제, 광고, 공개 채팅과 위치 공유를 제공하지 않습니다.

## 문서

상세 설계와 검증 기록은 [docs/minz-learning-game](./docs/minz-learning-game)에서 확인할 수 있습니다.

## License

This project is licensed under the [MIT License](./LICENSE).

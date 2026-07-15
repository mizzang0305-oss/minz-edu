# 민즈 어드벤처

초등 저학년이 숫자 블록을 직접 조작하며 `10 만들기`와 받아올림 덧셈을 발견하는 2D 웹 전투 MVP입니다. 현재 1인 모드와 같은 기기 2인 협동이 동작하며, 각자 휴대폰·태블릿에서 참가하는 온라인 협동은 Google 보호자 계정 기반 방 생성·6자리 코드 참가·실시간 로비까지 연결되어 있습니다.

## 실행

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 검증

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## MVP 흐름

1. `/setup`에서 아이·모드·친구 프로필을 설정합니다.
2. `/world`에서 숫자 숲을 선택합니다.
3. `/battle`에서 10칸 틀 조작 → 각자 암호 → 심화 작전 → 필살기를 진행합니다.
4. `/result`에서 보상과 오늘의 생각을 저장합니다.
5. `/parent`에서 비교 없는 시도·힌트·협동 기록을 확인합니다.
6. 실제 2인 세션 뒤 `/parent/observation`에서 협동 UX 관찰지를 저장합니다.

현재 상세 학습 데이터는 마이그레이션 가능한 버전 필드를 포함해 브라우저 `localStorage`에 저장됩니다. Firebase 프로젝트 `studymate-ai-v2`를 온라인 데이터 대상으로 사용하며 Google 보호자 로그인, 최소 자녀 프로필, Firestore 보안 규칙과 서버 권한 온라인 방 API를 연결합니다. 설정 파일과 Admin 키는 Git에서 제외됩니다. 온라인 턴 전투 확정 서버, 결제, 광고, 공개 채팅은 아직 연결하지 않습니다.

## 온라인 계정 준비

1. Firebase CLI로 `.firebase-web-config.json`을 생성하고 로컬 Admin 키 또는 운영 비밀 환경값을 설정합니다.
2. `/login`에서 보호자 Google 로그인 → `HttpOnly` 서버 세션 교환을 사용합니다.
3. 아이는 개인 Google 로그인 없이 보호자 소유 자녀 프로필과 승인된 방 코드로 참가합니다.
4. `/room`에서 방을 만들거나 6자리 코드로 참가하면 두 기기의 로비가 Firestore 구독으로 동기화됩니다.
5. 로비는 20초마다 연결 상태를 확인하고, 네트워크가 끊겨도 60초 동안 같은 방 재접속을 기다립니다.

온라인 전투의 데이터·권한·모바일 기준은 [ONLINE_MOBILE_ARCHITECTURE.md](./docs/minz-learning-game/ONLINE_MOBILE_ARCHITECTURE.md)에 정리했습니다.

Firestore 규칙은 Java 21 이상에서 다음 명령으로 검증합니다.

```powershell
npm run test:rules
```

상세 설계는 [docs/minz-learning-game](./docs/minz-learning-game)에서 확인할 수 있습니다.

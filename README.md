# 민즈 어드벤처

초등 저학년이 숫자 블록을 직접 조작하며 `10 만들기`와 받아올림 덧셈을 발견하는 2D 웹 전투 MVP입니다. 1인 모드와 네트워크가 필요 없는 같은 기기 2인 협동 모드를 지원합니다.

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

데이터는 마이그레이션 가능한 버전 필드를 포함해 브라우저 `localStorage`에만 저장됩니다. 외부 AI API, 계정, 결제, 광고, 공개 채팅, 온라인 서버는 연결하지 않습니다.

상세 설계는 [docs/minz-learning-game](./docs/minz-learning-game)에서 확인할 수 있습니다.

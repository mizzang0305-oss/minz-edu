---
type: architecture
project: Minz_Edu
status: implemented-local
updated: 2026-07-15
tags: [firebase, sync, child-safety, game-progress]
---

# Firebase 게임 기록 동기화

## 목적

보호자 Google 세션을 기준으로 `primary` 자녀의 스테이지 진행도, 학습 결과, 인벤토리를 휴대폰·태블릿·PC 사이에서 이어서 플레이한다.

## 저장 경로

- 자녀 프로필: `guardians/{guardianUid}/children/primary`
- 게임 기록: `guardians/{guardianUid}/children/primary/gameState/current`
- 브라우저는 게임 기록 문서에 직접 접근하지 않는다.
- 읽기와 쓰기는 보호자 세션을 다시 검증하는 `/api/guardian/game-state`와 Admin SDK만 사용한다.

## 동기화 대상

- 스테이지 상태, 완료 퀘스트, 발견한 비밀
- 모험 결과와 목표별 누적 학습 결과
- 훈련장·진단 결과
- 코인, 배지, 협동 보상, 해금 스킬

다음 정보는 의도적으로 Firebase에 보내지 않는다.

- 아이가 직접 쓴 자유 문장
- 보호자의 협동 관찰 메모
- 접근성·소리·화면 흔들림 같은 기기 설정
- 친구 이름과 Google 계정 정보

## 충돌·중복 처리

- 동일한 모험·훈련 ID는 한 번만 반영한다.
- 서로 다른 기기에서 생긴 기록은 시간순으로 합친다.
- 스테이지 완료와 `mastered` 상태는 이전 상태로 내려가지 않는다.
- 기록 보관 한도를 넘은 오래된 모험은 ID를 보관해 코인이 다시 지급되지 않게 한다.
- 모든 로컬 저장은 즉시 완료하고 서버 동기화는 1.2초 지연 처리한다. 네트워크 실패 시 게임은 중단하지 않는다.

## 보안 기준

- 서버 세션 검증과 UID 기반 고정 경로로 다른 보호자 데이터 접근 차단
- 변경 요청 CSRF 토큰 확인
- 요청 본문 512KB 제한
- 허용 필드·문자열·배열·수치 범위 런타임 검증
- 분당 동기화 요청 제한
- 개인화 API 응답 `Cache-Control: no-store`
- Firestore Rules에서 게임 기록 직접 읽기·쓰기 거부

## 배포 전 검증

- `npm test`
- `npm run test:rules`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Emulator에서 보호자 A/B 격리와 동일 모험 중복 전송 확인
- Preview에서 Google 로그인 → 프로필 저장 → 전투 완료 → 새 기기 복원 확인

## 롤백

클라이언트 Provider와 `/api/guardian/game-state`를 되돌리면 기존 `localStorage` 기반 플레이는 그대로 유지된다. 게임 기록 문서는 별도 경로이므로 자녀 프로필과 기존 방 데이터에 영향을 주지 않는다. Firestore 규칙은 이전 버전으로 되돌려도 상위 기본 거부 규칙이 유지된다.

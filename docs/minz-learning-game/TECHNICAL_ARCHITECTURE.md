# Technical Architecture

## 로컬 MVP

```text
Next.js App Router
├─ Server pages/layout: 정적 셸과 경로
├─ Client components: 입력, localStorage, HUD
├─ CombatSystem: 순수 상태 전이
├─ typed mission data: 학습 콘텐츠
└─ gameEventBridge → Phaser 3 Scene: 전투 연출
```

Phaser는 브라우저에서만 동적 import한다. Scene은 localStorage나 보호자 설정을 직접 읽지 않는다. React가 `sync`, `attack`, `special` 이벤트를 전달하고 Phaser는 `specialComplete`만 돌려준다.

## 저장

키는 `minz-learning-game`, 스키마 버전은 `1`이다. 저장 항목은 프로필, 보호자 설정, 접근성, 개념 진행, 인벤토리, 보상/생각/플레이 이력, 친구 임시 프로필, 로컬 협동 설정, 협동 이력, 팀 보상, 해금된 팀 스킬이다. 파싱 실패나 알 수 없는 버전은 안전한 기본값으로 복구한다.

## 온라인 확장 인터페이스

이번 MVP는 서버에 연결하지 않지만 `CoopRoomState`, `CoopNetworkEvent`와 19개 이벤트 타입을 정의한다.

```text
Phaser: 입력과 연출만
Next.js: 방/보호자 승인/결과 UI
권한 서버(향후 Colyseus 또는 별도 Node.js): 턴, 데미지, 보스 HP, 링크, 보상, 승리
Supabase(향후 승인 후): 계정, 보호자 승인 관계, 장기 이력, Presence 보조
```

모든 이벤트는 `roomId`, `playerId`, `eventId`, 양쪽 timestamp, `payloadVersion`을 가진다. 서버는 `eventId`로 중복을 제거한다. 연결이 끊기면 캐릭터를 보호 상태로 두고 60초 동안 재접속을 기다리며, 서버 snapshot으로 상태를 복원한다. 클라이언트가 데미지·보스 HP·링크·보상·승리를 확정할 수 없다.

## 테스트 전략

- Vitest: 게이지, 데미지, 보호막, 보상, 난이도, 개념 상태, reducer, 직렬화.
- React Testing Library: 10칸 조작과 부정적 표현 미사용, 결과 저장 화면.
- Playwright: 설정→지도→전투→필살기→결과→새로고침 유지, 360px 뷰포트.
- 수동 브라우저 QA: 콘솔 오류, Phaser 캔버스, 터치 크기, 360/390/430/768 레이아웃.

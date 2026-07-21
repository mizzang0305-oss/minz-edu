---
type: implementation-report
project: Minz_Edu
status: implemented-authenticated-local-poc
updated: 2026-07-21
tags:
  - minz-edu
  - colyseus
  - multiplayer
  - learning-game
---

# Colyseus 실시간 2인 학습 전투 PoC

## 목적

`/game`의 Phaser + MathLive 전투에 실제 WebSocket 기반 2인 방을 연결한다. 클라이언트는 답과 공격 의도만 보내며, 정답 판정·반격·피해량·게이지·턴·승패·문제별 학습 로그는 Colyseus Room 서버가 확정한다. 방 접속은 HTTP-only 보호자 세션과 해당 보호자의 자녀 프로필을 확인한 90초 room ticket만 허용한다.

## 실행

먼저 Next.js와 Colyseus 두 프로세스에 같은 32바이트 이상의 `COLYSEUS_ROOM_TICKET_SECRET`을 주입한다. 값은 출력하거나 저장소에 커밋하지 않는다. 터미널 1에서 협동 서버를 실행한다.

```powershell
npm run dev:colyseus
```

터미널 2에서 Next.js를 실행한다.

```powershell
npm run dev
```

- 게임: `http://127.0.0.1:3000/game`
- Colyseus: `http://127.0.0.1:2567`
- 상태 확인: `http://127.0.0.1:2567/__healthcheck`

서로 다른 보호자 계정으로 로그인한 브라우저 두 개에서 `온라인 2인`을 선택한다. 첫 브라우저는 `새 방 만들기`, 두 번째 브라우저는 첫 화면에 표시된 방 ID를 입력해 `방 참가`를 누른다. 로그아웃 상태, 다른 보호자의 자녀 ID, 만료·변조·재사용 ticket은 거부된다.

## 구조

```text
보호자 HTTP-only 세션 + CSRF + 자녀 소유권
  -> Next.js /api/colyseus/room-ticket (HMAC, 90초, 방 ID scope)
  -> @colyseus/sdk Authorization: Bearer room-ticket
MathLive/공격 버튼
  -> clientSequence 요청
  -> LearningBattleRoom 입력·좌석 검증
  -> LearningRoomAuthority 서버 판정
  -> 기존 LearningBattlePocEngine 상태 전이
  -> revision 스냅샷 + 확정 이벤트 방송
  -> 두 Phaser 화면 동일 전투 연출
```

## 서버 권한 규칙

- 두 플레이어가 모두 연결되기 전에는 답·공격·스페셜을 거부한다.
- 접속 세션과 `playerId`가 다르면 거부한다.
- 현재 차례가 아닌 플레이어의 입력을 거부한다.
- 현재 문제 ID가 다르면 거부한다.
- 플레이어별 `clientSequence`가 과거 값이거나 중복이면 거부한다.
- 정답 뒤 `attack-ready`, 심화 룬 완성 뒤 `special-ready`일 때만 해당 공격을 허용한다.
- 클라이언트가 피해량, HP, 게이지, 턴, `revision`을 직접 보낼 수 없다.
- room ticket은 한 번만 사용할 수 있고, `create` 또는 특정 `roomId`의 `join`으로 범위가 고정된다.
- 같은 보호자 세션으로 한 방의 두 자리를 동시에 차지할 수 없다.
- 표시 이름은 브라우저 입력이 아니라 ticket에 서명된 자녀 프로필 값을 사용한다.

## 문제별 학습 로그

- 각 문제에 시도 번호, 정답 여부, 서버 기준 누적 소요 시간, 힌트 제공 여부, 오답 유형을 기록한다.
- 오답일 때 화면에 힌트가 자동 노출되므로 해당 시도에서 힌트 수를 1회 증가시킨다.
- 실제 입력한 원답 문자열은 로그에 저장하거나 서버 관측 로그로 출력하지 않는다.
- 각 클라이언트에는 자기 자녀의 `learning:log`만 전송한다. 상대 자녀의 상세 학습 로그는 공용 snapshot에 넣지 않는다.
- 현재 PoC 로그는 room 프로세스 메모리에만 보존된다. 영구 보호자 리포트 저장은 별도 승인·데이터 수명 정책이 필요하다.

## 연결 복구와 안전 경계

- 비정상 연결 종료 시 같은 좌석, 전투 상태, 개인 학습 로그를 60초간 보존한다.
- SDK 자동 재접속 성공 시 기존 `sessionId`, 플레이어, 전투 상태로 복귀한다.
- 전송 빈도는 클라이언트당 초당 12개로 제한한다.
- 기본 서버는 `127.0.0.1`에만 바인딩한다.
- 기본 CORS는 `localhost`와 `127.0.0.1`의 HTTP origin만 허용한다.
- 외부 Preview에 붙일 때는 `COLYSEUS_ALLOWED_ORIGINS`에 정확한 origin을 설정해야 한다.
- Firebase, Firestore Rules, Vercel Production, 인증 설정은 변경하지 않는다.

## 환경 변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_COLYSEUS_URL` | `http://127.0.0.1:2567` | 브라우저 SDK 접속 주소 |
| `COLYSEUS_ROOM_TICKET_SECRET` | 없음, 필수 | Next.js 발급·Colyseus 검증에 함께 사용하는 32바이트 이상 서버 비밀 |
| `COLYSEUS_HOST` | `127.0.0.1` | 서버 바인드 주소 |
| `COLYSEUS_PORT` | `2567` | 서버 포트 |
| `COLYSEUS_ALLOWED_ORIGINS` | 로컬 origin만 | 쉼표로 구분한 외부 허용 origin |
| `COLYSEUS_SIMULATED_LATENCY_MS` | `0` | 로컬 왕복 지연 시뮬레이션 |

## 자동 검증

- 순수 권한 테스트: 대기 잠금, 오답 반격, 정답 공격, 턴 교대, ID 위조 차단, sequence 재전송 차단, 상태·개인 학습 로그 보존
- room ticket 테스트: 서명 검증, 만료, 변조, 짧은 secret 차단, create/join scope, 일회성 사용
- 실제 SDK 2클라이언트 통합 테스트: 인증된 방 생성·참가, 120ms 지연, 차지 공격, 강제 연결 종료·자동 재접속, 학습 로그 복원, 스페셜 승리
- CORS 통합 테스트: 로컬 origin 허용, 미허용 origin 거부

```powershell
npx vitest run src/services/online/roomTicket.test.ts src/game/online/LearningRoomAuthority.test.ts src/game/online/LearningBattleRoom.integration.test.ts
```

## 남은 리스크

- ticket 재사용 차단은 현재 단일 Colyseus 프로세스 메모리 기준이다. 다중 인스턴스 배포 전 공유 nonce 저장소가 필요하다.
- 프로세스 메모리 기반 방이라 서버 재시작 시 진행 상태가 사라진다.
- 실제 휴대폰 2대 검증은 `COLYSEUS_PHYSICAL_DEVICE_VALIDATION.md` 기준으로 아직 외부 전제조건 대기 상태다.
- 같은 문제를 두 기기에서 동시에 보는 구조이며 공개 채팅은 제공하지 않는다.

## 롤백

`server/colyseus`, `src/game/online`, 온라인 2인 UI, Colyseus 환경 변수 문서와 관련 의존성을 되돌리면 기존 1인·같은 화면 2인 PoC로 복귀한다. Firebase 데이터와 Rules에는 롤백 작업이 없다.

## 다음 작업

1. 실제 휴대폰 2대에서 30초 앱 전환·네트워크 전환·60초 만료 경계를 검증한다.
2. 영구 학습 로그의 보존 기간·보호자 조회 범위·삭제 정책을 승인받는다.
3. 교사 승인 문항만 사용하는 AI 문제 생성·검수 파이프라인을 설계한다.

---
type: validation-report
project: Minz_Edu
status: automated-pass-real-devices-blocked
updated: 2026-07-21
tags:
  - colyseus
  - mobile
  - reconnect
  - guardian-session
---

# Colyseus 휴대폰 2대 재접속·앱 전환 검증

## 판정

- 로컬 Colyseus SDK/서버 자동 검증: `PASS`
- 실제 휴대폰 2대 검증: `BLOCKED`
- 비운영 LAN endpoint: 주소와 실행 절차는 준비됨, 보호자 인증 환경이 없어 상시 실행하지 않음
- production 배포·Firebase Rules 배포·TTL 설정: 수행하지 않음

실제 기기 PASS로 대체 기록하지 않는다. 현재 PC에는 ADB가 설치되어 있지 않고 연결된 기기 증거가 없다. Firebase Admin 설정, `COLYSEUS_ROOM_TICKET_SECRET`, 연결된 외부 비운영 배포도 현재 프로세스에 없다.

## 준비된 비운영 endpoint

2026-07-21 확인 LAN IPv4는 `192.168.45.120`이다. 같은 사설망에서 사용할 주소는 다음과 같다.

- Next.js: `http://192.168.45.120:3000`
- Colyseus: `http://192.168.45.120:2567`
- Health check: `http://192.168.45.120:2567/__healthcheck`

IP는 DHCP에 따라 바뀔 수 있으므로 실행 직전에 재확인한다. 실제 secret 값은 문서나 로그에 남기지 않는다.

```powershell
# 터미널 1: Next.js
$env:NEXT_PUBLIC_COLYSEUS_URL = "http://192.168.45.120:2567"
$env:COLYSEUS_ROOM_TICKET_SECRET = "<same-32-byte-or-longer-non-production-secret>"
npm run dev -- --hostname 0.0.0.0
```

```powershell
# 터미널 2: Colyseus
$env:COLYSEUS_HOST = "0.0.0.0"
$env:COLYSEUS_ALLOWED_ORIGINS = "http://192.168.45.120:3000"
$env:COLYSEUS_ROOM_TICKET_SECRET = "<same-32-byte-or-longer-non-production-secret>"
npm run dev:colyseus
```

Windows 방화벽 규칙 변경은 이 검증에서 수행하지 않았다. 실제 기기 접속이 차단되면 private-network 범위에 한해 별도 승인 후 처리한다.

## CPD-01~07 결과

| ID | 검증 내용 | 자동 검증 | 실제 휴대폰 |
|---|---|---|---|
| CPD-01 | 서로 다른 보호자 ticket으로 방 생성·참가, 서로 다른 좌석 배정 | PASS | BLOCKED |
| CPD-02 | 오답 후 정답, 힌트·시도·소요 시간·오답 유형, 상대 상세 로그 비공개 | PASS | BLOCKED |
| CPD-03 | 연결 중단 상태로 정확히 30초 대기 후 동일 session/좌석·전투·학습 로그 복구 | PASS (SDK 모사) | BLOCKED |
| CPD-04 | 네트워크 단절 상태로 20초 대기 후 동일 session/좌석 복구 | PASS (SDK 모사) | BLOCKED |
| CPD-05 | client sequence 재전송 방지와 상태 revision 일치 | PASS | BLOCKED |
| CPD-06 | 연결 중단 65초 후 기존 reconnect token 거부, 새 session의 로그 0에서 시작 | PASS (SDK 모사) | BLOCKED |
| CPD-07 | ticket 재사용과 다른 room scope 사용 거부, raw UID·ticket 미출력 | PASS | BLOCKED |

## 시간 경계 자동 검증 증거

실행 명령:

```powershell
$env:RUN_LONG_RECONNECT_TESTS = "true"
npx vitest run src/game/online/LearningBattleRoom.reconnect-long.integration.test.ts --reporter=verbose
```

2026-07-21 결과:

- 테스트 파일 1개, 테스트 1개 PASS
- 테스트 본체 115.267초, 전체 116.40초
- 30,000ms 대기 후 동일 `sessionId`, `wrongCount=1`, 시도 1·힌트 1 로그 복원
- 20,000ms 대기 후 동일 `sessionId`, 상태 유지
- 65,000ms 대기 후 기존 reconnect token 거부
- 만료 뒤 새 ticket으로 참가한 새 `sessionId`는 시도 0·힌트 0으로 시작

이 검증은 실제 OS 앱 전환이나 실제 Wi-Fi 토글이 아니라 WebSocket 연결 중단을 SDK로 모사한 결과다.

## 실제 휴대폰 검증 입력란

| 항목 | 기기 A | 기기 B |
|---|---|---|
| 모델 / OS | 미제공 | 미제공 |
| 브라우저 / 버전 | 미제공 | 미제공 |
| 비운영 보호자 계정 | 미제공 | 미제공 |
| 시작 시각(KST) | 미수행 | 미수행 |
| 30초 앱 전환 결과 | BLOCKED | BLOCKED |
| Wi-Fi 단절·복구 결과 | BLOCKED | BLOCKED |
| 65초 만료 결과 | BLOCKED | BLOCKED |

캡처에는 이메일, Firebase UID, 전체 room ID, ticket, cookie, secret, 자녀 실명 등 민감정보를 포함하지 않는다.

## 실제 기기 완료 조건

- [ ] 서로 다른 보호자 테스트 계정과 비식별 자녀 프로필 2개 준비
- [ ] 비운영 Firebase Admin 설정과 동일한 room-ticket secret을 두 서버에 주입
- [ ] 두 휴대폰에서 LAN endpoint health check 접근
- [ ] CPD-01~07을 순서대로 수행하고 KST 시각·기기·축약 room ID 기록
- [ ] 30초 앱 전환, 실제 Wi-Fi off/on, 65초 만료 화면 캡처
- [ ] 보호자 A가 보호자 B 자녀 로그를 조회·삭제하지 못함을 확인

## 롤백

로컬 자동 검증은 데이터나 외부 시스템을 변경하지 않는다. 저장 계층 롤백은 `LEARNING_LOG_RETENTION_POLICY.md`의 절차를 따른다. 실제 비운영 데이터가 생겼다면 보호자 전체 삭제 API로 제거하고, Rules·TTL이 배포되었다면 별도 승인된 배포 롤백을 수행한다.

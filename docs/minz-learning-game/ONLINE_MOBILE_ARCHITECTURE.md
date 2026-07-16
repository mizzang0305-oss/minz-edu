# 온라인·모바일 협동 아키텍처

## 결론

주 사용 환경은 각자 휴대폰 또는 태블릿이다. 계정은 `보호자 Google 계정 1개 → 여러 자녀 프로필` 구조로 운영하며, 아이에게 개인 Google 로그인을 요구하지 않는다.

## 계정과 참가 경계

| 주체 | 인증/입장 | 허용 범위 |
| --- | --- | --- |
| 보호자 | Firebase Authentication Google 로그인 | 자녀 프로필 생성, 친구 승인, 방 생성, 기록 조회 |
| 아이 | 보호자 소유 자녀 프로필 + 6자리 방 코드 | 승인된 방 참가, 자기 미션 입력 |
| 서버 | Firebase Admin SDK | 방 권한, 차례, 공격, 게이지, 보상, 승리 결과 확정 |

- 보호자 로그인 ID 토큰은 클라이언트에 지속 저장하지 않는다.
- ID 토큰을 Next.js Route Handler에서 확인한 뒤 `HttpOnly`, `SameSite`, 운영 HTTPS의 `Secure` 쿠키로 교환한다.
- 온라인 방 화면은 `HttpOnly` 세션을 서버에서 검증하고 짧은 custom token을 발급받아 Firebase Auth를 메모리에서만 복구한다. 이 인증은 새로고침 때 다시 부트스트랩하며 브라우저 영구 저장소에 남기지 않는다.
- 로그인 세션 생성 요청에는 CSRF 토큰과 최근 로그인 시간 검사를 적용한다.
- 자녀 프로필에는 실명, 이메일, 위치를 저장하지 않는다.
- 공개 검색, 랜덤 매칭, 자유 채팅, 점수 순위는 지원하지 않는다.

## 권장 Firebase 구성

- Authentication: 보호자 Google 로그인
- Cloud Firestore: 보호자/자녀 프로필, 승인 친구, 방 스냅샷, 전투 결과
- Cloud Functions: 서버 권한 전투 명령 검증 및 결과 확정
- App Check: 승인되지 않은 클라이언트의 Firebase 요청 완화

전투는 턴 기반이므로 최초 온라인 MVP는 Firestore 실시간 구독으로 충분하다. 향후 액션성이 커져 지연 요구가 낮아지면 전용 WebSocket 게임 서버를 별도 검토한다.

모바일의 `signInWithRedirect`는 Firebase Hosting 도메인과 앱 도메인이 다를 때 브라우저의 서드파티 저장소 제한 영향을 받을 수 있다. 운영 도메인을 Firebase Authentication 승인 도메인에 등록하고, Firebase의 redirect best-practice 중 동일 도메인 구성을 적용한 뒤 실제 iOS Safari/Android Chrome에서 확인한다.

## Firestore 초안

```text
guardians/{guardianUid}
  children/{childProfileId}
  friendApprovals/{approvalId}

rooms/{roomId}
  publicState/current
  privateMembers/{childProfileId}
  commands/{eventId}
  results/final
```

`rooms/*/commands`에는 클라이언트의 의도만 기록한다. `bossHp`, `teamLinkGauge`, `reward`, `winner`, `revision`은 Cloud Functions/Admin SDK만 쓴다. 모든 명령은 `eventId` 중복 방지, `expectedRevision` 낙관적 잠금, 참가자 권한, 현재 차례, 입력 스키마를 확인한다.

## 모바일 기준

- 360px 세로 화면에서 가로 스크롤 없음
- 주요 터치 영역 48px 이상
- `100dvh`와 safe-area inset 적용
- 확대를 막지 않으며 텍스트 자동 축소 방지
- 세로 모드를 기본으로 하되 짧은 가로 화면에서도 전투 조작 가능
- 네트워크 단절 시 60초 재접속, 현재 서버 revision부터 복원
- 중복 탭/재전송은 같은 `eventId`로 멱등 처리
- 느린 네트워크에서는 입력 잠금과 재시도 상태를 명확히 표시

## 단계별 구현

1. **Phase 11-A (완료)**: 모바일 viewport/safe-area/PWA manifest, Google 보호자 로그인 세션 기반, 온라인 타입과 방 코드 검증
2. **Phase 11-B (부분 완료)**: Firebase 개발 프로젝트, Emulator Suite, Firestore 규칙, 로컬 기본 자녀 프로필의 보호자 계정 동기화 완료. 다중 자녀 CRUD 대기
3. **Phase 11-C (진행 중)**: 서버 권한 방 생성, 6자리 코드 참가, 2인 제한, 30분 만료, Firestore 실시간 로비, 20초 presence heartbeat와 60초 재접속 보호 완료. 서버 권한 턴 전투 대기
4. **Phase 11-D**: 실제 휴대폰 2대/태블릿 조합 테스트, App Check 모니터링 후 적용

## 운영 승인 필요 항목

Firebase 프로젝트 `studymate-ai-v2`의 서울 리전 Firestore를 온라인 데이터 대상으로 사용한다. 방 생성·참가·presence heartbeat는 Next.js 서버 Route Handler의 Admin SDK가 처리하고 클라이언트는 참가한 방만 읽는다. 로컬 Web 설정은 프로젝트의 기존 `studymate-web` 앱을 사용하며, Admin 키는 반드시 같은 프로젝트의 키만 허용한다. 개발 검증용 `localhost`와 `127.0.0.1`은 Firebase Authentication 승인 도메인에 등록됐다. Functions 배포, 운영 도메인 등록, App Check enforcement 활성화는 아직 진행하지 않았다.

# 부모 학습 세션 이메일 리포트

## 목적

훈련 또는 보스 전투가 끝나거나 화면이 닫힐 때 세션 합계를 기기에 먼저 저장하고, 보호자 Google 세션과 메일 환경이 준비되면 보호자 계정 이메일로 자동 전송한다.

## 전송 내용

- 실행 시간
- 문제 수와 정답 확인 수
- 첫 시도 정답 수
- 재도전 및 힌트 사용 횟수
- 학습 목표와 복습 관찰
- 중등 세션의 익명 오답 유형 상위 3개와 횟수

문제 원문, 선택한 오답, 아이의 자유 글, 계정 UID, 자녀 문서 ID는 이메일 본문에 포함하지 않는다. 오답 유형은 고정된 교육 태그의 한국어 설명과 횟수만 전송한다.

## 동작 순서

1. 클라이언트가 세션을 `localStorage`에 `pending` 상태로 저장한다.
2. 앱 시작, 온라인 복귀, 새 세션 저장 시 자동 전송을 시도한다.
3. 서버는 보호자 Firebase 세션과 CSRF 토큰을 확인한다.
4. 서버가 현재 보호자 소유의 자녀 프로필인지 Firestore 경로로 다시 확인한다.
5. Resend의 `Idempotency-Key`로 중복 발송을 막고 로그인 보호자의 이메일로만 전송한다.
6. 성공 시 로컬 기록을 `sent`로 갱신한다. 실패하면 로컬 기록을 유지하고 다시 시도한다.

브라우저나 운영체제가 강제 종료되면 종료 순간의 네트워크 요청은 보장되지 않는다. 이 경우 세션은 로컬에 남고 다음 앱 실행 또는 보호자 화면 접속 때 자동 재시도한다.

## 필요한 환경 변수

```dotenv
PARENT_REPORT_EMAIL_ENABLED=true
RESEND_API_KEY=...
PARENT_REPORT_FROM_EMAIL="Minz Adventure <reports@verified-domain.example>"
```

`RESEND_API_KEY`는 서버 전용이며 `NEXT_PUBLIC_` 접두사를 사용하지 않는다. `PARENT_REPORT_FROM_EMAIL`의 도메인은 Resend에서 DNS 검증을 끝내야 한다.

## 검증 절차

1. `PARENT_REPORT_EMAIL_ENABLED=false`에서 API가 `EMAIL_NOT_CONFIGURED`로 닫히는지 확인한다.
2. Firebase Emulator 또는 테스트 프로젝트에서 보호자 세션, CSRF 실패, 다른 자녀 경로 거부를 확인한다.
3. 검증된 테스트 발신 도메인과 테스트 보호자 계정으로 한 건만 발송한다.
4. 같은 세션 ID를 재요청해 중복 메일이 생기지 않는지 확인한다.
5. 메일 본문에 문제 원문이나 식별자가 없는지 확인한다.

## 2026-07-19 PR Preview 검증

- 부모 테스트 계정으로 새 학습 세션 1회를 완료해 보호자 요약 메일 정확히 1건을 발송했다.
- 앱 상태 `보호자 메일 발송 완료`와 Resend `delivered` 이벤트를 확인했다.
- Preview 본문에는 세션 합계·학습 목표·복습 관찰만 있었고 문제 원문, 선택 답, 계정 UID, 자녀 문서 ID는 없었다.
- 검증을 위해 임시 추가한 Firebase 승인 도메인은 즉시 제거했고, 로컬 우회 검증 중 생성했으나 사용하지 않은 임시 Resend API 키도 폐기했다.

## 롤백

즉시 중단은 `PARENT_REPORT_EMAIL_ENABLED=false`로 전환한다. 코드 롤백 시 `SessionReportDelivery`와 `/api/parent-reports/send`를 제거해도 로컬 학습 기록과 게임 진행 데이터는 유지된다.

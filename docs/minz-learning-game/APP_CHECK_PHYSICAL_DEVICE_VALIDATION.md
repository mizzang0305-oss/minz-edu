---
type: validation-runbook
project: Minz_Edu
status: waiting-external-prerequisites
updated: 2026-07-19
tags:
  - firebase
  - app-check
  - mobile
  - staging
---

# App Check 모니터링·실제 기기 2대 검증

## 목적

온라인 실시간 팀전의 App Check 요청 분류와 실제 휴대폰 2대에서의 지연·앱 전환 복원을 검증한다. 이 문서는 production 요청 차단 승인서가 아니다.

## 현재 상태

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| App Check SDK preflight | 준비 완료 | Enterprise site key가 있을 때 Auth·Firestore보다 먼저 초기화, 자동 토큰 갱신 |
| 미설정·Emulator 동작 | PASS | reCAPTCHA를 로드하지 않고 기존 기능 유지 |
| 초기화 실패 | PASS | 사이트 키·원본 오류를 로그에 남기지 않고 fail-open |
| `studymate-web` App Check 등록 | WAITING | Firebase Console에서 미등록 확인, 사용할 Enterprise site key 없음 |
| Cloud Firestore enforcement | OFF | Firebase Console에서 `적용되지 않음` 확인 |
| 실제 휴대폰 2대 | WAITING | 현재 작업 환경에 ADB와 연결 디바이스 없음 |
| 중등 72문항 | `pending-teacher-review` | 자동 검증만 완료, 실제 교사 승인 아님 |

## 승인 경계

- reCAPTCHA Enterprise key 생성 또는 기존 key 선택은 GCP 외부 설정과 사용량 비용 검토 후 진행한다.
- `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`는 공개 site key지만, 실제 값은 저장소에 커밋하지 않고 배포 환경 변수로만 설정한다.
- staging 요청이 `Verified`로 관측되기 전에는 Cloud Firestore enforcement를 켜지 않는다.
- production Firestore Rules 배포와 App Check enforcement 활성화는 각각 별도 승인이 필요하다.
- debug provider와 debug token은 production에서 사용하지 않는다.

## App Check 모니터링 활성화 순서

1. `studymate-ai-v2` 프로젝트에 사용할 reCAPTCHA Enterprise 웹 site key의 도메인 범위와 비용 정책을 승인한다.
2. Firebase Console에서 `studymate-web`에 해당 key를 등록한다. Token TTL은 초기 기본값 1시간을 유지한다.
3. Vercel Preview에 `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`를 추가하고 새 Preview를 빌드한다. `NEXT_PUBLIC_*` 값은 빌드 시 포함되므로 기존 배포 재시작만으로는 반영되지 않는다.
4. staging `/room`에서 보호자 로그인 → 방 생성 → 2P 참가 → 준비 → 정답/오답 도움 → 팀 필살기 → 보상까지 완료한다.
5. Firebase App Check 측정항목에서 Web 앱 요청의 `Verified`, `Outdated client`, `Unknown origin`, `Invalid` 분포를 기록한다.
6. 실제 기기 검증이 PASS여도 production enforcement는 켜지 않고 별도 승인 문서를 올린다.

## 실제 휴대폰 2대 검증 절차

### 준비

- 기기 A: Android Chrome 또는 iOS Safari
- 기기 B: A와 다른 실제 휴대폰 및 브라우저
- 동일 staging URL, 보호자 테스트 계정 2개 또는 승인된 테스트 세션
- 화면 녹화 또는 타임스탬프가 보이는 캡처
- 테스트 시작 시 두 기기의 OS·브라우저 버전과 네트워크 종류 기록

### 시나리오

| ID | 절차 | 합격 기준 |
| --- | --- | --- |
| PD-01 | A가 방 생성, B가 6자리 코드로 참가 | 두 화면의 참가자와 `revision`이 일치 |
| PD-02 | 양쪽 준비 후 번갈아 정답 제출 | 현재 차례, Boss HP, 팀 게이지, 메시지가 한 revision 안에 수렴 |
| PD-03 | 한 기기 네트워크를 3G 수준 또는 1초 이상 지연 환경으로 전환 | 중복 공격·보상 없음, 충돌 시 최신 revision 재시도 안내 |
| PD-04 | A를 30초간 다른 앱으로 전환 후 복귀 | 복귀 즉시 heartbeat, 60초 보호 구간 안에서 방 상태 복원 |
| PD-05 | B를 60초 초과 백그라운드 후 복귀 | 오프라인 표시 후 서버 snapshot에서 안전하게 재접속하거나 명확한 만료 안내 |
| PD-06 | 전송 직후 앱 전환 후 같은 행동 재시도 | 같은 `eventId`는 한 번만 반영, 보상 중복 없음 |
| PD-07 | 전체 시나리오 중 Firebase 측정항목 확인 | staging 도메인 요청은 `Verified`, enforcement는 계속 OFF |

## 증적 기록표

| ID | 기기 A | 기기 B | 시작 시각 | 관측 지연 | 최종 revision | App Check 분류 | 결과 | 증적 경로 |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| PD-01 |  |  |  |  |  |  | WAITING |  |
| PD-02 |  |  |  |  |  |  | WAITING |  |
| PD-03 |  |  |  |  |  |  | WAITING |  |
| PD-04 |  |  |  |  |  |  | WAITING |  |
| PD-05 |  |  |  |  |  |  | WAITING |  |
| PD-06 |  |  |  |  |  |  | WAITING |  |
| PD-07 |  |  |  |  |  |  | WAITING |  |

## 롤백 방법

- 코드 롤백: App Check preflight 커밋을 `git revert`한다.
- 환경 롤백: Vercel에서 `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`를 제거하고 새 배포를 만든다.
- Firebase 롤백: enforcement가 OFF인 동안 SDK/site key 문제는 요청 차단을 만들지 않는다. 등록 취소가 필요하면 먼저 환경 변수를 제거한 새 배포를 확인한 뒤 앱의 제공업체 등록을 해제한다.
- Firestore Rules는 이 작업에서 배포하지 않는다.

## 다음 작업

1. 사용할 Enterprise site key의 생성·비용 승인을 받는다.
2. Preview 환경에만 key를 설정해 측정항목을 수집한다.
3. 실제 휴대폰 2대로 PD-01~PD-07을 수행하고 증적을 채운다.

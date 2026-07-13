---
type: migration-plan
project: Minz_Edu
status: read-only-audit-complete
updated: 2026-07-13
tags: [firebase, firestore, migration, child-profile, read-only]
---

# Firebase 중등 프로필 읽기 전용 감사와 마이그레이션 계획

## 결론

`studymate-ai-v2`의 `(default)` Firestore 데이터베이스를 읽기 전용으로 확인한 결과, `children` collection group에 `schoolLevel == "middle"`인 프로필은 **0개**다. 현재 실제 변환 대상이 없으므로 데이터 마이그레이션은 실행하지 않는다.

## 감사 범위와 결과

| 항목 | 결과 |
|---|---:|
| 프로젝트 | `studymate-ai-v2` |
| 데이터베이스 | `(default)` |
| 조회 범위 | 모든 `guardians/*/children/*` 문서를 포함하는 `children` collection group |
| 읽은 필드 | `schoolLevel`만 projection |
| 전체 프로필 | 1 |
| `kindergarten` | 0 |
| `elementary` | 1 |
| `middle` | 0 |
| 누락 또는 알 수 없는 값 | 0 |
| 문서 ID·아이 이름·친구 코드 출력·기록 | 하지 않음 |
| 쓰기·수정·삭제·배포 | 하지 않음 |

Firebase Console의 현재 Chrome 계정은 Firestore 관리 화면 권한이 없었지만, 로컬 Firebase CLI 인증으로 프로젝트의 읽기 권한을 확인하고 Firestore REST `runQuery`를 사용해 `schoolLevel`만 projection한 뒤 집계했다. 응답에 포함되는 문서 경로는 즉시 버렸으며, 인증 토큰과 개인정보는 출력하거나 파일에 저장하지 않았다.

## 현재 코드의 차단 상태

- 설정 UI는 `kindergarten`, `elementary`만 제공한다.
- 서버 API는 `middle` 입력을 유효하지 않은 학습 단계로 거부한다.
- 로컬 `firestore.rules`는 신규·수정 프로필에서 `middle`을 거부한다.
- 이전 브라우저 저장값의 `middle`은 앱이 깨지지 않도록 초등 동일 숫자 학년으로 정규화한다.
- 온라인 방은 자녀 프로필에서 이름과 캐릭터만 복사하므로 방 문서에는 `schoolLevel`이 저장되지 않는다.

주의: 로컬 Firestore 규칙 변경은 아직 배포하지 않았다. 실제 운영 규칙 반영은 별도 승인 작업이다.

## 실행 계획

### 1. 현재 상태 종결

- 현재 `middle == 0`을 기준선으로 기록한다.
- 데이터 변환 스크립트는 만들거나 실행하지 않는다.
- 실제 문서 백업·수정·삭제도 수행하지 않는다.

### 2. 규칙 배포 전 승인 게이트

다음 항목을 다시 읽기 전용으로 확인한 후에만 규칙 배포 승인을 요청한다.

- `children` 전체 수
- `middle` 수가 계속 0인지
- `schoolLevel` 누락·알 수 없는 값이 0인지
- Firebase Emulator 규칙 테스트 통과 여부
- 운영 규칙의 롤백 파일과 이전 ruleset 식별 가능 여부

### 3. 향후 `middle > 0`이 발견될 때

자동으로 초등 프로필로 덮어쓰지 않는다. 실제 중학생을 초등학생으로 잘못 표시할 수 있기 때문이다.

1. 문서 ID만 제한된 운영자 검토 자료로 분리한다.
2. 보호자가 지원 과정인 유아·초등 중 올바른 프로필을 다시 선택하도록 안내한다.
3. 변경 전 해당 문서를 별도 백업한다.
4. 사용자 승인 또는 운영자 확인이 끝난 문서만 개별 변환한다.
5. 변환 후 `middle == 0`, 누락 값 0을 다시 집계한다.
6. 감사 로그에는 문서 ID, 변경 전후 단계, 실행자, 실행 시각만 남기고 아이 이름은 남기지 않는다.

### 4. 승인 문구

실제 운영 규칙 배포 또는 프로필 쓰기는 다음과 같이 별도 승인 범위를 명시한 뒤 진행한다.

`승인: studymate-ai-v2의 Firestore 규칙을 배포하고, 사전 검토된 middle 프로필만 계획서에 따라 변환해.`

현재 감사 결과에서는 변환 대상이 0개이므로 위 승인 문구를 사용할 필요가 없다.

## 롤백 원칙

- 규칙 배포 전 기존 ruleset 식별자를 기록한다.
- 데이터 변환이 필요한 미래 작업에서는 문서별 변경 전 스냅샷을 먼저 보관한다.
- 오류 발생 시 규칙은 이전 ruleset으로 복원하고, 데이터는 문서별 백업을 이용해 원복한다.
- 일괄 삭제와 collection-level 삭제는 사용하지 않는다.

## 다음 확인 시점

- Firestore 규칙 배포 승인 직전
- 보호자 계정 동기화 기능을 운영 환경에 배포하기 직전
- 지원 학습 단계 정책이 다시 바뀔 때

## 배포 직전 읽기 전용 재검증 — 2026-07-13

### 게이트 판정

| 게이트 | 결과 | 근거 |
|---|---|---|
| `middle == 0` | PASS | 전체 1개 중 `elementary` 1개, `middle` 0개, 누락·기타 0개 |
| 운영/로컬 ruleset 일치 | BLOCK | 정규화 SHA-256과 규칙 내용이 서로 다름 |
| 운영 변경 발생 여부 | PASS | 데이터·규칙·인덱스 쓰기 및 배포를 수행하지 않음 |

종합 판정은 **배포 보류(BLOCK)** 이다. 데이터 마이그레이션 대상은 없지만 운영 ruleset과 로컬 `firestore.rules`가 일치하지 않으므로, 차이를 승인 범위에 포함하기 전에는 배포하지 않는다.

### 프로필 재집계

`studymate-ai-v2`의 `(default)` 데이터베이스에서 모든 `children` collection group을 조회하되 `schoolLevel`만 projection했다.

| 구분 | 수량 |
|---|---:|
| 전체 | 1 |
| `kindergarten` | 0 |
| `elementary` | 1 |
| `middle` | 0 |
| 누락·기타 | 0 |

문서 경로, 사용자 이름, 친구 코드, 인증 토큰 등 식별 정보는 보고서에 저장하거나 출력하지 않았다.

### 운영 ruleset과 로컬 규칙 비교

- 운영 release: `projects/studymate-ai-v2/releases/cloud.firestore`
- 운영 ruleset: `projects/studymate-ai-v2/rulesets/f469656f-c85b-4afe-b85a-e7741ef379ad`
- 운영 release 최종 갱신: `2026-07-12T08:23:33.054575Z`
- 운영 정규화 SHA-256: `3352221479fae066a8c660af65733e41576712fbf131478b5553e745b9159c14`
- 로컬 정규화 SHA-256: `f0ca98dd99359c48cc4f85f96060d5fa6dd856e46463d413dba7e6d006883bee`
- 비교 결과: 불일치

핵심 차이는 다음과 같다.

- 운영 규칙은 child profile 허용 필드에 `schoolLevel`이 없고 `grade`를 1~6으로만 검증한다.
- 로컬 규칙은 `schoolLevel`을 필수 허용 필드로 추가하고 `kindergarten` 5~7, `elementary` 1~6만 허용한다.
- 운영과 로컬 모두 `schoolLevel == 'middle'`을 허용하는 분기는 없다.

따라서 로컬 규칙 배포는 단순 동기화가 아니라 프로필 스키마 검증 정책을 변경하는 작업이다. 운영 배포 전에는 이 차이를 포함한 명시적 승인과 Firebase Emulator 규칙 테스트 통과가 필요하다.

## 자녀 프로필 생성·수정 경로 감사 — 2026-07-13

### 전수 확인 결과

| 경로 | 역할 | `schoolLevel` 처리 | 판정 |
|---|---|---|---|
| `SetupForm` → `saveSettings` | 브라우저 로컬 프로필 생성·수정 | `playerProfile.schoolLevel`과 친구 프로필 단계를 함께 저장 | PASS |
| `ParentDashboard` → `POST /api/guardian/children` | 로그인 보호자의 기본 자녀 프로필 동기화 | 공통 요청 생성기가 `displayName`, `schoolLevel`, `grade`, `characterId`, CSRF 토큰을 구성 | PASS |
| `POST /api/guardian/children` → Firestore transaction | `guardians/{uid}/children/primary` 생성·수정 | 공통 검증기가 유아·초등 단계만 허용하고 검증된 `schoolLevel`을 문서에 저장 | PASS |
| `createOnlineRoom` / `joinOnlineRoom` | 온라인 방 참가자 구성 | 자녀 프로필을 읽기만 하며 생성·수정하지 않음 | 해당 없음 |
| 브라우저 Firebase SDK | 방 상태 실시간 읽기 | 자녀 프로필 직접 쓰기 경로 없음 | PASS |

현재 운영 Firestore의 자녀 프로필 쓰기는 `POST /api/guardian/children` 한 경로로 수렴한다. 새로운 자녀 프로필 쓰기 경로를 추가할 때는 공통 `childProfileSync` 경계와 동일한 단계 검증을 사용해야 한다.

### 추가한 회귀 방지 장치

- 클라이언트 요청 생성과 서버 입력 검증을 `childProfileSync` 모듈로 통합했다.
- `schoolLevel` 누락, 제거된 `middle`, 유효하지 않은 나이·학년은 서버 경계에서 거부한다.
- 유아 프로필 요청에 `schoolLevel: kindergarten`이 실제 포함되는 단위 테스트를 추가했다.
- Firestore Emulator 규칙 테스트는 유아·초등 허용과 중등 거부를 계속 검증한다.

### Git 배포 기준점

운영 배포 전 최소 기준점은 다음 두 파일이다.

- `firestore.rules`: 실제 배포 대상 규칙
- 이 감사 계획서: 운영 ruleset 식별자, 정규화 해시, 프로필 집계, 승인·롤백 근거

규칙 파일은 로컬 Git 커밋으로 고정하되 다른 미완료 게임 변경은 같은 커밋에 포함하지 않는다. 원격 push, PR, Firebase 배포는 별도 승인 전까지 수행하지 않는다.

- Git blob: `e50185817a9001c2d0e05b15bbf06f9c73a71ba0`
- 기준 커밋 확인: `git log -1 --oneline -- firestore.rules`

### 다음 승인 범위

프로필 데이터는 변경하지 않고 Firestore 규칙만 배포하려면 다음과 같이 승인 범위를 한정한다.

`승인: studymate-ai-v2에 현재 로컬 firestore.rules만 배포해. 프로필 데이터·인덱스·Auth·Storage·Functions는 변경하지 마.`

승인을 받은 실행 차수에서도 배포 직전에 `middle == 0`, 활성 ruleset 식별자, 로컬 규칙 해시, Emulator 테스트를 다시 확인한다. 하나라도 달라지면 배포를 중단하고 재승인을 요청한다.

### Admin SDK 경계와 배포 순서

`POST /api/guardian/children`은 서버의 Firebase Admin SDK로 Firestore를 쓴다. Admin SDK 요청은 Firestore Security Rules의 허용·거부 판단을 거치지 않으므로 다음 두 방어선을 분리해서 관리해야 한다.

1. 서버 API의 `childProfileSync` 검증: Admin SDK가 저장하기 전에 `schoolLevel` 누락과 `middle`을 거부한다.
2. `firestore.rules`: 브라우저 Firebase SDK나 기타 비관리자 클라이언트의 직접 쓰기를 제한한다.

따라서 “Firestore 규칙만 배포”하면 운영 데이터나 서버 코드는 변경되지 않지만, 서버 API의 새 검증 코드도 자동으로 배포되지 않는다. 실제 온라인 프로필 동기화 출시 전에는 현재 검증된 API 코드가 포함된 애플리케이션 배포를 별도 승인·검증해야 한다. 규칙 배포와 애플리케이션 배포를 한 승인으로 묶지 않는다.

## 풀 오케스트라 보안 보강 재검증 — 2026-07-13

- 프로필 재집계: 전체 1, 유아 0, 초등 1, 중등 0, 누락·기타 0
- 운영 ruleset: `projects/studymate-ai-v2/rulesets/f469656f-c85b-4afe-b85a-e7741ef379ad`
- 운영 정규화 SHA-256: `3352221479fae066a8c660af65733e41576712fbf131478b5553e745b9159c14`
- 보강된 로컬 후보 SHA-256: `2fa6f420b2b6b95e379df1b8ee7218ef688773e8540f8749f6eb6415cf09525a`
- 비교 결과: 불일치, 운영 배포 없음

로컬 후보에는 보호자 이름 검증, 안전한 `characterId` 형식, 자녀 프로필의 `friendCode`·`createdAt` 불변성, 명령 ID·payload 크기 제한을 추가했다. Firestore/방 Emulator 테스트 15개가 통과했으며, 별도 배포 승인 전까지 운영 ruleset은 변경하지 않는다.

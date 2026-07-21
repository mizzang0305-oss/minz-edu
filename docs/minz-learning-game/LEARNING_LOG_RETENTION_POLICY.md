---
type: privacy-policy-decision
project: Minz_Edu
status: approved-local-implementation
updated: 2026-07-21
tags:
  - learning-log
  - guardian
  - retention
  - deletion
---

# 영구 학습 로그 보존·조회·삭제 정책

## 결론

로컬 구현 기준 정책을 아래와 같이 승인한다. 운영 적용 전에는 개인정보 처리방침 반영과 법률 검토, Firestore TTL 설정 및 Rules 배포 승인이 별도로 필요하다.

| 항목 | 승인 정책 |
|---|---|
| 상세 로그 보존 기간 | 마지막 갱신일로부터 90일 |
| 용량 상한 | 자녀 프로필당 최근 200개 room/player 기록 |
| 조회 주체 | 로그인한 보호자 본인 |
| 조회 범위 | 해당 보호자가 소유한 현재 선택 자녀의 로그만 |
| 저장 내용 | 문제 ID, 시도 횟수, 정오, 힌트 여부·횟수, 서버 측 소요 시간, 제한된 오답 유형, 집계값 |
| 저장 금지 | 실제 입력 답안, 문제 본문, 자유서술, 이메일, Firebase UID, room ticket, 서명 receipt, 상대 자녀 로그 |
| 개별 삭제 | 보호자가 즉시 요청 가능 |
| 전체 삭제 | 보호자가 자녀별 전체 삭제 가능 |
| 자녀 삭제 | 자녀 문서와 모든 하위 학습 로그를 재귀 삭제 |
| 만료 처리 | API는 만료 즉시 조회에서 제외, Firestore TTL은 비동기 물리 삭제 보조 |
| 직접 접근 | Firestore client read/write 전부 거부, 인증된 서버 API만 허용 |
| 관리자 조회 | 현재 일반 관리자 일괄 조회 기능 없음 |

## 저장·권한 흐름

1. Colyseus Room이 서버 권한으로 학습 로그를 계산한다.
2. Room이 보호자·자녀 익명 키와 로그를 HMAC receipt로 서명한다.
3. 브라우저는 보호자 세션과 CSRF 토큰으로 receipt를 제출한다.
4. API가 서명, 만료, 보호자 키, 자녀 키, 자녀 소유권을 다시 검증한다.
5. `guardians/{guardianUid}/children/{childProfileId}/learningLogs/{roomId_playerId}`에 저장한다.
6. 낮거나 같은 revision은 무시하여 재전송을 멱등 처리한다.

## 삭제와 만료

- 개별·전체 삭제 API는 보호자 세션과 CSRF를 필수로 요구한다.
- 자녀 프로필 삭제는 알려진 문서만 지우지 않고 자녀 문서 전체를 `recursiveDelete`하여 하위 로그 잔존을 막는다.
- 만료 시각은 `expiresAt`에 기록한다. API는 만료 시각 이후 즉시 숨긴다.
- Firestore TTL 삭제는 즉시성이 보장되지 않으므로, 운영에서 TTL을 활성화하더라도 API 필터를 유지한다.
- Firestore TTL은 하위 컬렉션을 연쇄 삭제하지 않으므로 자녀 삭제에는 TTL 대신 재귀 삭제를 사용한다.

## 운영 승인 전 체크

- [ ] 개인정보 처리방침과 보호자 동의 문구에 목적·항목·90일 보존·삭제 방법 반영
- [ ] `expiresAt` 필드에 Firestore TTL 정책 생성
- [ ] 비운영 Firebase 프로젝트에서 API 저장·조회·개별 삭제·전체 삭제 검증
- [ ] Firestore Rules 변경 검토 및 별도 배포 승인
- [ ] 실제 휴대폰 2대에서 보호자별 자녀 격리 검증
- [ ] 운영 배포 승인

## 근거와 한계

- 개인정보 보호법 제21조는 보유기간 경과 또는 처리 목적 달성 시 지체 없이 파기하는 원칙을 둔다: https://www.law.go.kr/LSW/lsSideInfoP.do?docClsCd=jo&joBrNo=00&joNo=0021&lsiSeq=270351&urlMode=lsScJoRltInfoR
- Firestore TTL은 일반적으로 만료 후 24시간 안에 삭제되지만 즉시 삭제가 아니며 하위 컬렉션을 삭제하지 않는다: https://firebase.google.com/docs/firestore/ttl
- 이 문서는 제품 내부 최소수집 정책 결정이며 법률 자문이나 운영 적법성 확정이 아니다.

## 롤백

API route, receipt, storage helper, 보호자 UI 및 Rules의 `learningLogs` 명시 차단 블록을 함께 되돌린다. 이미 비운영 DB에 저장된 데이터가 있다면 코드 롤백과 별도로 승인된 삭제 절차를 수행한다.

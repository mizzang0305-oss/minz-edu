---
type: development-report
project: Minz_Edu
status: local-verified
updated: 2026-07-18
tags:
  - minz-edu
  - playtest
  - learning-game
  - parent-report
  - middle-school
---

# 민표 플레이테스트 개선 구현 보고서

## 작업 요약

- 오답을 맞은 것으로 처리하지 않고 같은 문제에 머물며 힌트와 정답 해설을 확인하도록 변경했다.
- 문제 풀이 중에는 게임 UI를 줄이고 큰 글자의 문제 전용 화면을 사용하며, 정답 후 게임 화면에서 공격 스킬을 선택하도록 분리했다.
- 현재 학년·주차·학습 목표·문제 진행률·완료 상태를 표시하고, 이미 완료한 목표 대신 다음 미완료 목표를 우선 연결한다.
- 실제 캐릭터 선택, STATUS, 장비, 상점, 인벤토리, 스킬 선택과 장비 효과를 추가했다.
- 필드 적 공격, 2페이지 횡스크롤 진행감, 전투 타격 효과와 모바일 조작 안전 영역을 보강했다.
- 중학교 1~3학년 수학·영어 대표 학습 목표와 문제를 추가했다.
- 훈련·전투 종료 시 문제 수, 정답 수, 첫 시도 정답, 재시도, 힌트, 약한 영역, 실행시간을 저장하고 부모 이메일 보고 대기열을 추가했다.

## 변경 파일

- `src/learning/curriculumCatalog.ts`: 초등 영어 및 중1~중3 수학·영어 대표 콘텐츠
- `src/components/training/TrainingClient.tsx`: 오답 차단, 힌트/해설, 종료 세션 분석
- `src/components/battle/BattleClient.tsx`: 문제/전투 화면 분리, 스킬 공격, 종료 세션 분석
- `src/components/world/WorldMap.tsx`: STATUS와 다음 미완료 목표 연결
- `src/components/inventory/InventoryClient.tsx`: 상점 구매, 장착, 스킬 선택
- `src/game/scenes/NumberForestScene.ts`: 필드 적, 공격, 2페이지 진행과 타격 효과
- `src/components/auth/GuardianGoogleSignIn.tsx`: Firebase 오류의 사용자용 한국어 안내
- `src/app/api/parent-reports/send/route.ts`: 보호자 세션·자녀 소유권·CSRF·전송 제한을 확인하는 이메일 API
- `src/components/reports/SessionReportDelivery.tsx`: 미전송 보고서 자동 재시도
- `firestore.rules`: 중학교 1~3학년 프로필 허용
- `docs/minz-learning-game/PARENT_SESSION_EMAIL_REPORTS.md`: 이메일 설정·보안·운영 문서

## 핵심 의사결정

1. 오답은 진행도를 올리지 않는다. 정답을 고른 뒤에도 해설 확인 버튼을 눌러야 다음 문제로 이동한다.
2. 학습 화면과 전투 화면을 분리한다. 작은 화면에서는 문제 집중도를 우선하고, 정답 뒤에만 스킬 선택과 타격 연출을 보여 준다.
3. 브라우저 강제 종료 순간의 네트워크 전송은 보장할 수 없으므로 로컬에 집계 보고서를 먼저 저장하고 다음 실행·로그인·온라인 복귀 때 재전송한다.
4. 부모 이메일 주소는 클라이언트 입력을 신뢰하지 않고 Firebase 보호자 세션의 이메일만 사용한다.
5. 중등 콘텐츠는 2022 개정 교육과정의 영역 구조에 맞춘 대표 문제 세트다. 교과서 전체 문항 데이터베이스를 의미하지 않는다.
6. 온라인 팀전은 서버 revision 기반 준비·턴 교대·정답 판정·도움·팀 필살기·보상 상태를 Firestore로 실시간 동기화한다.
7. 중등 72문항은 교사 검수 대기 상태와 익명 오답 유형 태그를 가진다. 실제 교사 승인 전에는 승인 완료로 표시하지 않는다.

## 교육과정 근거

- 교육부 2022 개정 교육과정 고시: https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0
- 국가교육과정정보센터 영어 성취기준 자료: https://ncic.go.kr/board/B0024.cs?act=read&bwrId=2031&m=10&pageIndex=5&pageUnit=15

## 테스트/검증 결과

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: 31 files, 159 tests PASS
- `npm run test:rules`: Firestore 규칙·온라인 서비스 2 files, 21 tests PASS
- `npm run build`: Next.js 16.2.10 production build PASS
- `npm run test:e2e`: 39 PASS, 2 intentional skip, 0 fail
- Playwright Chromium·태블릿·360px 모바일 단독/2인 전투와 iPhone·Galaxy·Fold 안전 영역·오프라인 흐름 PASS
- 온라인 command 로그는 선택 답안을 저장하지 않고, Firestore 클라이언트 직접 쓰기를 거부하는 회귀 테스트 포함

## 남은 리스크

- 실제 이메일 1건 검증은 Resend API 키와 Preview 전용 서버 환경변수 설정 후 부모 테스트 계정으로 수행해야 한다. 코드·로컬 보안 테스트와 구분해 완료 전까지 머지 게이트로 유지한다.
- 기기를 완전히 끄는 순간 메일 전송 자체는 브라우저가 보장하지 않는다. 저장된 보고서는 다음 앱 실행 때 재시도된다.
- 온라인 팀전은 Emulator 기반 서버 권한 동기화까지 구현됐으며, 실제 휴대폰 2대의 지연·앱 전환 검증과 App Check 적용은 남아 있다.
- 장비와 선택 스킬은 현재 기기 로컬 상태다. 진행도·학습 결과·코인·배지는 Firebase 동기화되지만 장착 선택의 기기 간 동기화는 후속 작업이다.
- PWA 설치 모드에서는 주소 표시줄이 숨겨지지만 일반 브라우저 탭에서는 브라우저 보안 정책상 강제로 숨길 수 없다.

## 롤백 방법

- 현재 기능 브랜치의 변경을 파일 단위로 되돌리거나, 향후 커밋 후 해당 커밋을 `git revert`한다.
- 이메일 기능은 `PARENT_REPORT_EMAIL_ENABLED=false`로 즉시 비활성화할 수 있다.
- Firestore 배포는 수행하지 않았으므로 운영 규칙에는 변화가 없다.

## 다음 작업

1. 부모 테스트 계정과 검증된 발신 도메인으로 스테이징 이메일 1건을 승인 후 확인한다.
2. 실제 휴대폰 2대에서 온라인 팀전 재접속과 턴 충돌을 검증한다.
3. 실제 수학·영어 교사가 중등 72문항을 검수하고 승인 메타데이터를 기록한다.

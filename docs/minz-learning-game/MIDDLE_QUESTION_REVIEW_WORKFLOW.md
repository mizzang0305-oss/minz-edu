---
type: content-review-workflow
project: Minz_Edu
status: pending-teacher-review
updated: 2026-07-18
tags: [중등, 문항, 교사검수, 오답유형, 개인정보최소화]
---

# 중등 문항 교사 검수와 오답 유형 태깅

## 목적

중1~중3 수학·영어 12개 영역, 총 72문항을 실제 교사가 승인하기 전까지 초안으로 구분하고, 학습 기록에는 선택한 답이나 문제 원문 대신 익명 오답 유형 횟수만 남긴다.

## 현재 상태

- 각 영역은 6문항이다.
- 모든 중등 문항은 `review.status = pending-teacher-review`다.
- 각 문항에는 2022 개정 교육과정 영역 근거와 `misconceptionTag`가 있다.
- 코드와 자동 테스트는 형식·정답 일치·중복 ID·태그 누락을 점검하지만, 실제 교과 정확성 승인을 대신하지 않는다.

## 교사 검수 절차

1. `getMiddleSchoolTeacherReviewQueue()`로 72문항 검수 목록을 추출한다.
2. 수학 또는 영어 담당 교사가 학년 적합성, 정답 유일성, 선택지 품질, 힌트 정확성, 표현 난이도를 확인한다.
3. 수정이 필요하면 `changes-requested`, 승인하면 `teacher-approved`로 바꾸고 `reviewedBy`, `reviewedAt`을 기록한다.
4. 승인자 이름은 운영 문서에만 최소 보관하고 아동 화면·학습 이메일에는 노출하지 않는다.
5. 변경 후 `npm test -- src/learning/curriculumCatalog.test.ts`와 전체 검증을 실행한다.

## 오답 유형 데이터 경계

- 저장: `m1-number-sign` 같은 고정 태그와 세션 내 발생 횟수.
- 저장하지 않음: 선택한 오답 문자열, 문제 원문, 자유서술, 반응 시간.
- 부모 이메일에는 태그의 한국어 설명과 횟수만 최대 3개 표시한다.

## 승인 완료 기준

- [ ] 72문항 모두 담당 교사 검수
- [ ] 문항별 정답이 하나로 명확함
- [ ] 학년·영역·표현 난이도 적합
- [ ] 힌트가 정답을 그대로 노출하지 않음
- [ ] 오답 유형 태그가 실제 오개념과 일치
- [ ] `teacher-approved`, 검수자, 검수 일시 기록
- [ ] 전체 unit/lint/typecheck/build 통과

## 롤백

문항 오류가 발견되면 해당 문항을 `changes-requested`로 바꾸고 런타임 은행에서 제외하거나 직전 승인 커밋을 `git revert`한다. 학습 기록은 익명 집계만 저장하므로 문제 원문 삭제 마이그레이션은 필요하지 않다.

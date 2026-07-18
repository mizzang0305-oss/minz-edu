"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getWeeklyLearningGoals, SUBJECT_START_WEEKS } from "@/learning/curriculumCatalog";
import { createDefaultGameData, readGameData, selectLearningGoal } from "@/stores/storage";
import type { StoredGameData } from "@/types/progress";
import type { CurriculumSubject } from "@/types/curriculum";

export function GoalSelectionClient() {
  const router = useRouter();
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  const [subject, setSubject] = useState<"all" | CurriculumSubject>("all");
  useEffect(() => {
    const timer = window.setTimeout(() => setData(readGameData()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const goals = useMemo(() => getWeeklyLearningGoals(data.playerProfile, data.parentSettings.academicSemester), [data]);
  const visible = subject === "all" ? goals : goals.filter((goal) => goal.subject === subject);
  const selectedId = data.parentSettings.selectedLearningGoalId;
  const isEarlyChildhood = data.playerProfile.schoolLevel === "kindergarten";
  const semesterLabel = `${data.parentSettings.academicSemester}학기`;
  const subjectLabel = (value: CurriculumSubject) => value === "math" ? (isEarlyChildhood ? "유아수학" : "수학") : value === "english" ? "영어" : (isEarlyChildhood ? "유아 언어" : "국어");
  const availableSubjects = Array.from(new Set(goals.map((goal) => goal.subject)));
  const selectedGoal = goals.find((goal) => goal.id === selectedId) ?? goals[0];
  const selectedProgress = selectedGoal ? data.learningGoalProgress[selectedGoal.id] : undefined;
  const completedGoals = goals.filter((goal) => data.learningGoalProgress[goal.id]?.status === "mastered").length;

  const start = (goalId: string, destination: "world" | "diagnostic") => {
    setData(selectLearningGoal(goalId));
    router.push(destination === "world" ? "/world" : `/training?mode=diagnostic&goal=${encodeURIComponent(goalId)}`);
  };

  return (
    <main className="goal-page">
      <header className="goal-hero">
        <div><span className="eyebrow">{semesterLabel} 추천 모험 경로</span><h1>이번 주에 배울 목표를 골라요</h1><p>수학 8주차·국어 9주차·영어 10주차부터 시작합니다. 이미 아는 목표는 짧게 확인하고 건너뜁니다.</p></div>
        <Link className="secondary-button" href="/setup">연령·학년·학기 바꾸기</Link>
      </header>
      <section className="goal-progress-summary" aria-label="현재 학습 진행 상황"><div><span>CURRENT QUEST</span><strong>{selectedGoal ? `${selectedGoal.week}주차 · ${selectedGoal.title}` : "목표 선택 전"}</strong><small>{selectedGoal ? `${subjectLabel(selectedGoal.subject)} · ${selectedProgress?.attempts ?? 0}회 시도 · 문항 ${selectedProgress?.questionCount ?? 0}개 풀이` : "목표를 골라 주세요."}</small></div><div><span>완료한 목표</span><strong>{completedGoals} / {goals.length}</strong><small>완료 기록이 남아 같은 목표를 반복하지 않도록 표시합니다.</small></div></section>
      <section className="goal-start-points" aria-label="과목별 시작 주차">
        {availableSubjects.map((value) => <article key={value}><span>{subjectLabel(value)}</span><strong>{SUBJECT_START_WEEKS[value]}주차부터</strong><small>{value === "math" ? "수와 식을 연결하며 숫자 숲을 탐험해요." : value === "english" ? "실생활 영어의 이해와 표현을 단어섬에서 훈련해요." : "낱말과 이야기를 모으며 단어섬으로 출발해요."}</small></article>)}
      </section>
      <div className="goal-filter" role="group" aria-label="과목 선택">
        <button className={subject === "all" ? "selected" : ""} onClick={() => setSubject("all")}>전체</button>
        {availableSubjects.map((value) => <button key={value} className={subject === value ? "selected" : ""} onClick={() => setSubject(value)}>{subjectLabel(value)}</button>)}
      </div>
      <section className="weekly-path" aria-label="주차별 학습 목표">
        {visible.map((goal) => {
          const progress = data.learningGoalProgress[goal.id];
          const selected = goal.id === selectedId;
          return (
            <article key={goal.id} className={`week-goal-card ${selected ? "selected" : ""} ${progress?.status === "mastered" ? "ready-goal" : ""}`}>
              <div className="week-badge"><strong>{goal.week}</strong><span>주차</span></div>
              <div className="week-goal-copy"><span>{subjectLabel(goal.subject)} · {goal.stageId === "number-forest" ? "숫자 숲" : goal.stageId === "story-castle" ? "이야기 성" : "단어섬"} · {goal.unitTitle}</span><h2>{goal.title}</h2><p>{goal.objective}</p><small>{progress?.status === "mastered" ? `완료 · ${progress.attempts}회 시도 · ${progress.questionCount}문제 기록` : progress?.status === "needs-practice" ? `연습 필요 · 오답 ${progress.retryCount}회 · 힌트 ${progress.hintCount}회` : selected ? "현재 선택한 목표 · 아직 완료 전" : "원하는 주차부터 시작 가능"}</small></div>
              <div className="week-goal-actions"><button className="primary-button" onClick={() => start(goal.id, "world")}>이 목표로 모험 시작</button><button className="secondary-button" onClick={() => start(goal.id, "diagnostic")}>이미 아는지 확인</button></div>
            </article>
          );
        })}
      </section>
      <aside className="curriculum-disclaimer"><strong>진도 안내</strong><p>{semesterLabel} 수학 8주차·국어 9주차·영어 10주차부터 이어지는 추천 경로입니다. 중등 수학·영어는 2022 개정 교육과정의 수학 4개 영역과 영어 이해·표현 성취기준을 대표 퀘스트로 구성했으며, 학교·교과서 일정과 다르면 원하는 목표를 직접 골라도 괜찮습니다.</p></aside>
    </main>
  );
}

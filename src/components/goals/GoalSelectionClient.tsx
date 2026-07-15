"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getWeeklyLearningGoals, SUBJECT_START_WEEKS } from "@/learning/curriculumCatalog";
import { createDefaultGameData, readGameData, selectLearningGoal } from "@/stores/storage";
import type { StoredGameData } from "@/types/progress";

export function GoalSelectionClient() {
  const router = useRouter();
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  const [subject, setSubject] = useState<"all" | "math" | "korean">("all");
  useEffect(() => {
    const timer = window.setTimeout(() => setData(readGameData()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const goals = useMemo(() => getWeeklyLearningGoals(data.playerProfile, data.parentSettings.academicSemester), [data]);
  const visible = subject === "all" ? goals : goals.filter((goal) => goal.subject === subject);
  const selectedId = data.parentSettings.selectedLearningGoalId;
  const isEarlyChildhood = data.playerProfile.schoolLevel === "kindergarten";
  const semesterLabel = `${data.parentSettings.academicSemester}학기`;

  const start = (goalId: string, destination: "world" | "diagnostic") => {
    setData(selectLearningGoal(goalId));
    router.push(destination === "world" ? "/world" : `/training?mode=diagnostic&goal=${encodeURIComponent(goalId)}`);
  };

  return (
    <main className="goal-page">
      <header className="goal-hero">
        <div><span className="eyebrow">{semesterLabel} 추천 모험 경로</span><h1>이번 주에 배울 목표를 골라요</h1><p>수학은 8주차, 국어는 9주차부터 시작해요. 이미 아는 목표는 짧게 확인하고 건너뜁니다.</p></div>
        <Link className="secondary-button" href="/setup">연령·학년·학기 바꾸기</Link>
      </header>
      <section className="goal-start-points" aria-label="과목별 시작 주차">
        <article><span>{isEarlyChildhood ? "유아수학" : "수학"}</span><strong>{SUBJECT_START_WEEKS.math}주차부터</strong><small>수를 만지고 움직이며 숫자 숲을 탐험해요.</small></article>
        <article><span>{isEarlyChildhood ? "유아 언어" : "국어"}</span><strong>{SUBJECT_START_WEEKS.korean}주차부터</strong><small>낱말과 이야기를 모으며 단어섬으로 출발해요.</small></article>
      </section>
      <div className="goal-filter" role="group" aria-label="과목 선택">
        {([['all', '전체'], ['math', isEarlyChildhood ? '유아수학' : '수학'], ['korean', isEarlyChildhood ? '유아 언어' : '국어']] as const).map(([value, label]) => <button key={value} className={subject === value ? "selected" : ""} onClick={() => setSubject(value)}>{label}</button>)}
      </div>
      <section className="weekly-path" aria-label="주차별 학습 목표">
        {visible.map((goal) => {
          const progress = data.learningGoalProgress[goal.id];
          const selected = goal.id === selectedId;
          return (
            <article key={goal.id} className={`week-goal-card ${selected ? "selected" : ""} ${progress?.status === "mastered" ? "ready-goal" : ""}`}>
              <div className="week-badge"><strong>{goal.week}</strong><span>주차</span></div>
              <div className="week-goal-copy"><span>{goal.subject === "math" ? `${isEarlyChildhood ? "유아수학" : "수학"} · 숫자 숲` : `${isEarlyChildhood ? "유아 언어" : "국어"} · ${goal.stageId === "story-castle" ? "이야기 성" : "단어섬"}`} · {goal.unitTitle}</span><h2>{goal.title}</h2><p>{goal.objective}</p><small>{progress?.status === "mastered" ? "게임 내 준비됨 · 바로 다음 목표로 이동 가능" : progress?.status === "needs-practice" ? "훈련 추천 · 다시 연습하면 더 편해져요" : selected ? "현재 선택한 목표" : "원하는 주차부터 시작 가능"}</small></div>
              <div className="week-goal-actions"><button className="primary-button" onClick={() => start(goal.id, "world")}>이 목표로 모험 시작</button><button className="secondary-button" onClick={() => start(goal.id, "diagnostic")}>이미 아는지 확인</button></div>
            </article>
          );
        })}
      </section>
      <aside className="curriculum-disclaimer"><strong>진도 안내</strong><p>{semesterLabel} 수학 8주차·국어 9주차부터 이어지는 과목별 추천 경로입니다. 학교·교과서·행사 일정과 다르면 원하는 목표를 직접 골라도 괜찮습니다.</p></aside>
    </main>
  );
}

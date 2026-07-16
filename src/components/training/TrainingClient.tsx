"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { findLearningGoal } from "@/learning/curriculumCatalog";
import { readGameData, saveTrainingAttempt } from "@/stores/storage";
import type { WeeklyLearningGoal } from "@/types/curriculum";

export function TrainingClient() {
  const [goal, setGoal] = useState<WeeklyLearningGoal | null>(null);
  const [mode, setMode] = useState<"practice" | "diagnostic">("practice");
  const [index, setIndex] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [triedCurrent, setTriedCurrent] = useState(false);
  const [message, setMessage] = useState("답을 고르고 수호자의 문을 열어 보세요.");
  const [finished, setFinished] = useState(false);
  const [passed, setPassed] = useState(false);
  const answeredQuestionRef = useRef<number | null>(null);
  const hintUsedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const data = readGameData();
      const params = new URLSearchParams(window.location.search);
      setMode(params.get("mode") === "diagnostic" ? "diagnostic" : "practice");
      setGoal(findLearningGoal(
        data.playerProfile,
        params.get("goal") ?? data.parentSettings.selectedLearningGoalId,
        data.parentSettings.academicSemester,
      ));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!goal) return <div className="loading-card">훈련장을 여는 중…</div>;
  const question = goal.questions[index];

  const answer = (choice: string) => {
    if (answeredQuestionRef.current === index) return;
    if (choice !== question.answer) {
      setRetryCount((value) => value + 1);
      setTriedCurrent(true);
      setMessage("괜찮아요. 다른 방법으로 다시 도전해 봐요.");
      return;
    }
    answeredQuestionRef.current = index;
    const nextFirstTry = firstTryCorrect + (triedCurrent ? 0 : 1);
    if (index < goal.questions.length - 1) {
      setFirstTryCorrect(nextFirstTry);
      setIndex((value) => value + 1);
      setTriedCurrent(false);
      hintUsedRef.current = false;
      setMessage("문이 열렸어요! 다음 훈련으로 이동합니다.");
      return;
    }
    const attemptPassed = mode === "diagnostic" ? nextFirstTry === goal.questions.length : nextFirstTry >= Math.ceil(goal.questions.length * 0.67);
    const completedAt = new Date().toISOString();
    saveTrainingAttempt({ id: `training-${goal.id}-${completedAt}`, goalId: goal.id, mode, completedAt, questionCount: goal.questions.length, firstTryCorrect: nextFirstTry, retryCount, hintCount, passed: attemptPassed });
    setFirstTryCorrect(nextFirstTry);
    setPassed(attemptPassed);
    setFinished(true);
    setMessage(attemptPassed ? (mode === "diagnostic" ? "게임 내 준비됨! 이미 아는 목표로 표시했어요." : "훈련 완료! 다음 모험을 시작해도 좋아요.") : "조금만 더 연습하면 수호자의 문을 열 수 있어요.");
  };

  const showHint = () => {
    if (!hintUsedRef.current) {
      hintUsedRef.current = true;
      setHintCount((value) => value + 1);
    }
    setTriedCurrent(true);
    setMessage(question.hint);
  };

  const retry = () => {
    setIndex(0);
    setFirstTryCorrect(0);
    setRetryCount(0);
    setHintCount(0);
    setTriedCurrent(false);
    setPassed(false);
    setFinished(false);
    answeredQuestionRef.current = null;
    hintUsedRef.current = false;
    setMessage("답을 고르고 수호자의 문을 열어 보세요.");
  };

  if (finished) return (
    <main className="training-page"><section className="training-finish"><span>TRAINING COMPLETE</span><h1>{message}</h1><p>{goal.title} · 처음에 해결 {firstTryCorrect}/{goal.questions.length} · 다시 시도 {retryCount}회 · 힌트 {hintCount}회</p><div>{!passed && <button className="primary-button" onClick={retry}>같은 목표 다시 연습</button>}<Link href="/goals" className={passed ? "primary-button" : "secondary-button"}>다음 주차 고르기</Link>{passed && <Link href={`/battle?stage=${goal.stageId}&goal=${goal.id}`} className="secondary-button">이 목표로 스테이지 시작</Link>}</div></section></main>
  );

  return (
    <main className="training-page">
      <header className="training-header"><div><span className="eyebrow">{mode === "diagnostic" ? "이미 아는지 짧게 확인" : "부족한 부분 훈련장"}</span><h1>{goal.title}</h1><p>{goal.objective}</p></div><strong>{index + 1} / {goal.questions.length}</strong></header>
      <section className="training-arena">
        <div className="training-guardian" aria-hidden="true">◆</div>
        <div className="training-question"><span>{goal.unitTitle} 결계</span><h2>{question.prompt}</h2><div className="training-choices">{question.choices.map((choice) => <button key={choice} onClick={() => answer(choice)}>{choice}</button>)}</div><button className="hint-button" onClick={showHint}>힌트 보기</button><p role="status" aria-live="polite">{message}</p></div>
      </section>
      <p className="training-safety">한 번의 결과로 학업 능력을 단정하지 않습니다. 진단 통과는 이 게임 경로에서 다음 목표로 이동할 준비가 되었다는 뜻입니다.</p>
    </main>
  );
}

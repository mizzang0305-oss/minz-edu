"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { findLearningGoal } from "@/learning/curriculumCatalog";
import { readGameData, saveSessionReport, saveTrainingAttempt } from "@/stores/storage";
import type { WeeklyLearningGoal } from "@/types/curriculum";
import { incrementMisconceptionTag, type MisconceptionTagCounts } from "@/learning/misconceptionTags";

export function TrainingClient() {
  const [goal, setGoal] = useState<WeeklyLearningGoal | null>(null);
  const [mode, setMode] = useState<"practice" | "diagnostic">("practice");
  const [index, setIndex] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [misconceptionTagCounts, setMisconceptionTagCounts] = useState<MisconceptionTagCounts>({});
  const [triedCurrent, setTriedCurrent] = useState(false);
  const [message, setMessage] = useState("답을 고르고 수호자의 문을 열어 보세요.");
  const [finished, setFinished] = useState(false);
  const [passed, setPassed] = useState(false);
  const [resolvedFirstTryCorrect, setResolvedFirstTryCorrect] = useState<number | null>(null);
  const answeredQuestionRef = useRef<number | null>(null);
  const hintUsedRef = useRef(false);
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startedAtRef.current = Date.now();
      sessionIdRef.current = `training-session-${startedAtRef.current}`;
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

  useEffect(() => {
    const saveInterruptedSession = () => {
      if (!goal || finished) return;
      const attemptedCurrent = triedCurrent || answeredQuestionRef.current === index;
      const questionCount = index + (attemptedCurrent ? 1 : 0);
      if (questionCount < 1) return;
      const correctCount = index + (answeredQuestionRef.current === index ? 1 : 0);
      saveSessionReport({
        id: sessionIdRef.current,
        source: "training",
        goalId: goal.id,
        goalTitle: `${goal.unitTitle} · ${goal.title}`,
        learningObjective: goal.objective,
        startedAt: new Date(startedAtRef.current).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        questionCount,
        correctCount,
        firstTryCorrect: resolvedFirstTryCorrect ?? firstTryCorrect,
        retryCount,
        hintCount,
        weakSkillTag: retryCount > 0 || hintCount > 0 ? goal.skillTag : undefined,
        ...(Object.keys(misconceptionTagCounts).length > 0 ? { misconceptionTagCounts } : {}),
        deliveryStatus: "pending",
      });
    };
    window.addEventListener("pagehide", saveInterruptedSession);
    return () => window.removeEventListener("pagehide", saveInterruptedSession);
  }, [finished, firstTryCorrect, goal, hintCount, index, misconceptionTagCounts, resolvedFirstTryCorrect, retryCount, triedCurrent]);

  if (!goal) return <div className="loading-card">훈련장을 여는 중…</div>;
  const question = goal.questions[index];

  const answer = (choice: string) => {
    if (answeredQuestionRef.current === index) return;
    if (choice !== question.answer) {
      setRetryCount((value) => value + 1);
      setMisconceptionTagCounts((counts) => incrementMisconceptionTag(counts, question.misconceptionTag));
      setTriedCurrent(true);
      setMessage(`아직 문은 열리지 않았어요. 힌트: ${question.hint} 답을 다시 골라 보세요.`);
      return;
    }
    answeredQuestionRef.current = index;
    const nextFirstTry = firstTryCorrect + (triedCurrent ? 0 : 1);
    setResolvedFirstTryCorrect(nextFirstTry);
    setMessage(`${question.answer}, 정답이에요! ${question.explanation ?? question.hint} 그래서 답은 ${question.answer}입니다.`);
  };

  const continueAfterExplanation = () => {
    if (resolvedFirstTryCorrect === null) return;
    if (index < goal.questions.length - 1) {
      setFirstTryCorrect(resolvedFirstTryCorrect);
      setResolvedFirstTryCorrect(null);
      setIndex((value) => value + 1);
      setTriedCurrent(false);
      answeredQuestionRef.current = null;
      hintUsedRef.current = false;
      setMessage("다음 문제입니다. 정답을 찾아 결계를 열어 보세요.");
      return;
    }
    const nextFirstTry = resolvedFirstTryCorrect;
    const attemptPassed = mode === "diagnostic" ? nextFirstTry === goal.questions.length : nextFirstTry >= Math.ceil(goal.questions.length * 0.67);
    const completedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    saveTrainingAttempt({ id: `training-${goal.id}-${completedAt}`, goalId: goal.id, mode, completedAt, questionCount: goal.questions.length, firstTryCorrect: nextFirstTry, retryCount, hintCount, passed: attemptPassed, durationSeconds, ...(Object.keys(misconceptionTagCounts).length > 0 ? { misconceptionTagCounts } : {}) });
    saveSessionReport({ id: sessionIdRef.current, source: "training", goalId: goal.id, goalTitle: `${goal.unitTitle} · ${goal.title}`, learningObjective: goal.objective, startedAt: new Date(startedAtRef.current).toISOString(), completedAt, durationSeconds, questionCount: goal.questions.length, correctCount: goal.questions.length, firstTryCorrect: nextFirstTry, retryCount, hintCount, weakSkillTag: retryCount > 0 || hintCount > 0 ? goal.skillTag : undefined, ...(Object.keys(misconceptionTagCounts).length > 0 ? { misconceptionTagCounts } : {}), deliveryStatus: "pending" });
    setFirstTryCorrect(nextFirstTry);
    setResolvedFirstTryCorrect(null);
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
    setMisconceptionTagCounts({});
    setTriedCurrent(false);
    setPassed(false);
    setFinished(false);
    answeredQuestionRef.current = null;
    hintUsedRef.current = false;
    startedAtRef.current = Date.now();
    sessionIdRef.current = `training-session-${Date.now()}`;
    setResolvedFirstTryCorrect(null);
    setMessage("답을 고르고 수호자의 문을 열어 보세요.");
  };

  if (finished) return (
    <main className="training-page"><section className="training-finish"><span>TRAINING COMPLETE</span><h1>{message}</h1><p>{goal.title} · 처음에 해결 {firstTryCorrect}/{goal.questions.length} · 다시 시도 {retryCount}회 · 힌트 {hintCount}회</p><div>{!passed && <button className="primary-button" onClick={retry}>같은 목표 다시 연습</button>}<Link href="/goals" className={passed ? "primary-button" : "secondary-button"}>다음 주차 고르기</Link>{passed && <Link href={`/battle?stage=${goal.stageId}&goal=${goal.id}`} className="secondary-button">이 목표로 스테이지 시작</Link>}</div></section></main>
  );

  return (
    <main className="training-page training-fullscreen">
      <header className="training-header"><div><span className="eyebrow">{mode === "diagnostic" ? "이미 아는지 짧게 확인" : "부족한 부분 훈련장"}</span><h1>{goal.title}</h1><p>{goal.objective}</p></div><strong>{index + 1} / {goal.questions.length}</strong></header>
      <section className="training-arena">
        <div className="training-guardian" aria-hidden="true">◆</div>
        <div className="training-question"><span>{goal.unitTitle} 결계</span><h2>{question.prompt}</h2><div className="training-choices">{question.choices.map((choice) => <button key={choice} disabled={resolvedFirstTryCorrect !== null} onClick={() => answer(choice)}>{choice}</button>)}</div>{resolvedFirstTryCorrect === null ? <button className="hint-button" onClick={showHint}>힌트 보기</button> : <button className="primary-button training-next-button" onClick={continueAfterExplanation}>{index < goal.questions.length - 1 ? "해설 확인하고 다음 문제" : "해설 확인하고 훈련 완료"}</button>}<p className={resolvedFirstTryCorrect === null ? "training-feedback" : "training-feedback correct"} role="status" aria-live="polite">{message}</p></div>
      </section>
      <p className="training-safety">한 번의 결과로 학업 능력을 단정하지 않습니다. 진단 통과는 이 게임 경로에서 다음 목표로 이동할 준비가 되었다는 뜻입니다.</p>
    </main>
  );
}

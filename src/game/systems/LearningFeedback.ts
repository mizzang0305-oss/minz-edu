import type { PracticeQuestion } from "@/types/curriculum";

export type LearningFeedback = {
  kind: "correct" | "retry" | "hint";
  eyebrow: string;
  title: string;
  explanation: string;
};

export function buildCorrectFeedback(question: PracticeQuestion, recovered = false): LearningFeedback {
  return {
    kind: "correct",
    eyebrow: recovered ? "다시 찾아낸 회피" : "회피 성공 · 반격",
    title: `${question.answer}, 회피 성공!`,
    explanation: `${question.explanation ?? question.hint} 그래서 답은 ${question.answer}이고, 공격을 피한 뒤 반격할 수 있어.`,
  };
}

export function buildRetryFeedback(question: PracticeQuestion, attemptCount: number): LearningFeedback {
  return {
    kind: "retry",
    eyebrow: attemptCount > 1 ? "두 번째 회피 단서" : "첫 번째 회피 단서",
    title: "보호막이 막아 줬어. 다시 회피해 보자!",
    explanation: question.hint,
  };
}

export function buildHintFeedback(question: PracticeQuestion): LearningFeedback {
  return {
    kind: "hint",
    eyebrow: "탐험가 힌트",
    title: "천천히 한 단계만 살펴보자",
    explanation: question.hint,
  };
}

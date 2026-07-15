import type { LearningGoalProgress } from "@/types/curriculum";

export type PerformanceInsight = {
  label: "오늘의 관찰" | "학습 경향";
  strength: string;
  nextPractice: string;
};

export function analyzeGoalPerformance(progress?: LearningGoalProgress): PerformanceInsight {
  if (!progress || progress.questionCount === 0) {
    return { label: "오늘의 관찰", strength: "아직 확인 전이에요.", nextPractice: "짧은 진단으로 이미 아는 부분부터 확인해요." };
  }
  const firstTryRate = progress.firstTryCorrect / progress.questionCount;
  const retryRate = progress.retryCount / progress.questionCount;
  const enoughEvidence = progress.attempts >= 2 || progress.questionCount >= 6;
  return {
    label: enoughEvidence ? "학습 경향" : "오늘의 관찰",
    strength: firstTryRate >= 0.7
      ? "힌트 없이 스스로 해결하는 힘이 안정적이에요."
      : progress.retryCount > 0
        ? "다시 시도하며 끝까지 해결했어요."
        : "문제를 읽고 해결 방법을 찾아가고 있어요.",
    nextPractice: retryRate >= 0.5
      ? "같은 목표를 작은 단계로 한 번 더 연습해요."
      : progress.hintCount / progress.questionCount >= 0.5
        ? "힌트를 보기 전에 첫 단서를 스스로 찾아봐요."
        : "다음 주차 목표로 이동해도 좋아요.",
  };
}

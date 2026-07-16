import { describe, expect, it } from "vitest";
import { analyzeGoalPerformance } from "./performanceAnalysis";

describe("학습 성과 관찰", () => {
  it("표본이 없을 때 부족하다고 단정하지 않는다", () => {
    expect(analyzeGoalPerformance().label).toBe("오늘의 관찰");
    expect(analyzeGoalPerformance().nextPractice).toContain("진단");
  });

  it("충분한 표본에서 첫 시도 해결 강점을 보여준다", () => {
    const result = analyzeGoalPerformance({ goalId: "g", status: "in-progress", attempts: 2, firstTryCorrect: 5, questionCount: 6, retryCount: 1, hintCount: 0, updatedAt: "2026-07-13" });
    expect(result.label).toBe("학습 경향");
    expect(result.strength).toContain("스스로 해결");
  });
});

import { describe, expect, it } from "vitest";
import { buildCorrectFeedback, buildHintFeedback, buildRetryFeedback } from "./LearningFeedback";

const question = {
  id: "make-ten-1",
  prompt: "8에 몇을 더하면 10일까?",
  choices: ["1", "2", "3"],
  answer: "2",
  hint: "8 다음 수를 두 번 세어 보자.",
};

describe("LearningFeedback", () => {
  it("정답과 풀이 단서를 함께 설명한다", () => {
    expect(buildCorrectFeedback(question)).toEqual(expect.objectContaining({
      kind: "correct",
      title: "2, 회피 성공!",
      explanation: expect.stringContaining("8 다음 수"),
    }));
  });

  it("재도전을 실패가 아닌 발견으로 안내한다", () => {
    expect(buildRetryFeedback(question, 1)).toEqual(expect.objectContaining({
      kind: "retry",
      eyebrow: "첫 번째 회피 단서",
      explanation: question.hint,
    }));
    expect(buildRetryFeedback(question, 2).eyebrow).toBe("두 번째 회피 단서");
  });

  it("힌트는 정답을 대신하지 않고 풀이 방향을 보여 준다", () => {
    expect(buildHintFeedback(question)).toEqual(expect.objectContaining({
      kind: "hint",
      explanation: question.hint,
    }));
  });
});

import { describe, expect, it } from "vitest";
import { formatLearningStage, getLearningBattleProfile, isValidLearningStage, normalizeLearningStage } from "./stages";

describe("learning stages", () => {
  it("validates each supported school level range", () => {
    expect(isValidLearningStage("kindergarten", 5)).toBe(true);
    expect(isValidLearningStage("elementary", 6)).toBe(true);
    expect(isValidLearningStage("middle", 3)).toBe(false);
    expect(isValidLearningStage("middle", 4)).toBe(false);
  });

  it("migrates legacy grades to elementary", () => {
    expect(normalizeLearningStage(undefined, 4)).toEqual({ schoolLevel: "elementary", grade: 4 });
    expect(normalizeLearningStage("middle", 3)).toEqual({ schoolLevel: "elementary", grade: 3 });
  });

  it("uses different concepts and age-appropriate labels", () => {
    expect(formatLearningStage({ schoolLevel: "kindergarten", grade: 6 })).toBe("유아 6세");
    expect(getLearningBattleProfile({ schoolLevel: "kindergarten", grade: 6 }).conceptName).toBe("5 만들기");
    expect(getLearningBattleProfile({ schoolLevel: "elementary", grade: 4 }).conceptName).toBe("곱셈과 나눗셈");
  });
});

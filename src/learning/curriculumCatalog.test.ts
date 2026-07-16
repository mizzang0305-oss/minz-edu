import { describe, expect, it } from "vitest";
import { findLearningGoal, getWeeklyLearningGoals, SUBJECT_START_WEEKS } from "./curriculumCatalog";
import { SCHOOL_LEVEL_GRADES } from "./stages";

describe("2학기 주별 추천 경로", () => {
  it("지원하는 유아·초등 전 과정에서 과목별 8개 목표와 고유 ID를 만든다", () => {
    const all = Object.entries(SCHOOL_LEVEL_GRADES).flatMap(([schoolLevel, grades]) => grades.flatMap((grade) => getWeeklyLearningGoals({ schoolLevel: schoolLevel as keyof typeof SCHOOL_LEVEL_GRADES, grade }, 2)));
    expect(all).toHaveLength((3 + 6) * 16);
    expect(new Set(all.map((goal) => goal.id)).size).toBe(all.length);
    expect(all.every((goal) => goal.questions.length >= 3)).toBe(true);
    expect(all.every((goal) => goal.questions.every((question) => question.id.startsWith(goal.skillTag) && question.choices.includes(question.answer)))).toBe(true);
  });

  it("수학은 8주차, 국어는 9주차부터 각각 8주 경로를 만든다", () => {
    const goals = getWeeklyLearningGoals({ schoolLevel: "elementary", grade: 2 }, 2);
    const math = goals.filter((goal) => goal.subject === "math");
    const korean = goals.filter((goal) => goal.subject === "korean");
    expect(math.map((goal) => goal.week)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(korean.map((goal) => goal.week)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect(math[0].week).toBe(SUBJECT_START_WEEKS.math);
    expect(korean[0].week).toBe(SUBJECT_START_WEEKS.korean);
  });

  it("유아 과정에도 유아수학 목표와 연습 문제가 있다", () => {
    const goals = getWeeklyLearningGoals({ schoolLevel: "kindergarten", grade: 5 }, 2);
    const math = goals.filter((goal) => goal.subject === "math");
    const korean = goals.filter((goal) => goal.subject === "korean");
    expect(math).toHaveLength(8);
    expect(math[0].questions.every((question) => question.id.startsWith("counting-"))).toBe(true);
    expect(korean[0].questions.every((question) => question.id.startsWith("oral-language-"))).toBe(true);
  });

  it("수학은 숫자 숲, 국어는 단어섬 또는 이야기 성으로 연결한다", () => {
    const goals = getWeeklyLearningGoals({ schoolLevel: "elementary", grade: 2 }, 2);
    expect(goals.filter((goal) => goal.subject === "math").every((goal) => goal.stageId === "number-forest")).toBe(true);
    expect(goals.filter((goal) => goal.subject === "korean").every((goal) => goal.stageId !== "number-forest")).toBe(true);
  });

  it("선택한 목표 ID의 학기를 유지한다", () => {
    const stage = { schoolLevel: "elementary", grade: 2 } as const;
    const semesterOneGoal = getWeeklyLearningGoals(stage, 1)[0];
    expect(findLearningGoal(stage, semesterOneGoal.id)).toMatchObject({ id: semesterOneGoal.id, semester: 1 });
  });

  it("초등 2학년 수학 8주차 세 자리 수 목표에 자릿값 문항을 연결한다", () => {
    const goal = getWeeklyLearningGoals({ schoolLevel: "elementary", grade: 2 }, 2)
      .find((candidate) => candidate.id === "elementary-2-s2-math-w8");
    expect(goal).toMatchObject({ unitTitle: "세 자리 수", skillTag: "place-value", stageId: "number-forest" });
    expect(goal?.questions).toHaveLength(3);
    expect(goal?.questions[0].prompt).toBe("352에서 5가 나타내는 값은?");
    expect(goal?.questions.every((question) => question.id.startsWith("place-value-1000"))).toBe(true);
  });

  it("초등 2학년 국어 9주차와 보스가 중요 내용 찾기 문항을 유지한다", () => {
    const goals = getWeeklyLearningGoals({ schoolLevel: "elementary", grade: 2 }, 2);
    const wordIsland = goals.find((goal) => goal.id === "elementary-2-s2-korean-w9");
    const storyCastle = goals.find((goal) => goal.id === "elementary-2-s2-korean-w12");
    expect(wordIsland).toMatchObject({ unitTitle: "중요 내용 찾기", skillTag: "main-idea", stageId: "word-island" });
    expect(storyCastle).toMatchObject({ unitTitle: "중요 내용 찾기", skillTag: "main-idea", stageId: "story-castle" });
    expect(wordIsland?.questions[0].answer).toBe("민수가 화분을 돌봐요");
    expect(storyCastle?.questions.map((question) => question.id)).toEqual(wordIsland?.questions.map((question) => question.id));
  });

  it("같은 skillTag도 학습 범위가 다르면 나이·학년에 맞는 문항을 고른다", () => {
    const ageSix = getWeeklyLearningGoals({ schoolLevel: "kindergarten", grade: 6 }, 2).find((goal) => goal.skillTag === "number-composition");
    const ageSeven = getWeeklyLearningGoals({ schoolLevel: "kindergarten", grade: 7 }, 2).find((goal) => goal.skillTag === "number-composition");
    const gradeOne = getWeeklyLearningGoals({ schoolLevel: "elementary", grade: 1 }, 2).find((goal) => goal.skillTag === "place-value");
    const gradeTwo = getWeeklyLearningGoals({ schoolLevel: "elementary", grade: 2 }, 2).find((goal) => goal.skillTag === "place-value");
    expect(ageSix?.questions[0].id).toContain("number-composition-5");
    expect(ageSeven?.questions[0].id).toContain("number-composition-10");
    expect(gradeOne?.questions[0].id).toContain("place-value-100");
    expect(gradeTwo?.questions[0].id).toContain("place-value-1000");
  });
});

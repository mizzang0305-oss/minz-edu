import { describe, expect, it } from "vitest";
import {
  createLearningBattlePocState,
  normalizeMathAnswer,
  resolveLearningBattleAttack,
  resolveLearningBattleSpecial,
  submitLearningBattleAnswer,
} from "./LearningBattlePocEngine";

describe("Phaser 학습 전투 PoC 엔진", () => {
  it("정답 뒤에만 일반 공격을 허용한다", () => {
    const initial = createLearningBattlePocState();
    expect(resolveLearningBattleAttack(initial)).toBe(initial);

    const solved = submitLearningBattleAnswer(initial, "20");
    expect(solved.phase).toBe("attack-ready");
    expect(solved.conceptGauge).toBe(30);

    const attacked = resolveLearningBattleAttack(solved);
    expect(attacked.bossHp).toBe(152);
    expect(attacked.questionIndex).toBe(1);
  });

  it("오답이면 같은 문제를 유지하고 보호막으로 보스 반격을 받는다", () => {
    const initial = createLearningBattlePocState("local-coop");
    const failed = submitLearningBattleAnswer(initial, "19");

    expect(failed.phase).toBe("question");
    expect(failed.questionIndex).toBe(0);
    expect(failed.players[0]).toMatchObject({ hp: 100, shield: 10 });
    expect(failed.feedback.detail).toContain("전투 힌트");
    expect(resolveLearningBattleAttack(failed)).toBe(failed);
  });

  it("길게 누른 차지 공격은 더 큰 피해를 준다", () => {
    const solved = submitLearningBattleAnswer(createLearningBattlePocState(), "20");
    expect(resolveLearningBattleAttack(solved, true).bossHp).toBe(140);
  });

  it("심화 문제까지 해결하면 스페셜을 열고 보스를 쓰러뜨린다", () => {
    let state = createLearningBattlePocState();
    for (const answer of ["20", "x=5"]) {
      state = submitLearningBattleAnswer(state, answer);
      state = resolveLearningBattleAttack(state);
    }
    state = submitLearningBattleAnswer(state, "6");

    expect(state.phase).toBe("special-ready");
    expect(state.conceptGauge).toBe(100);
    expect(state.skillGauge).toBe(100);

    state = resolveLearningBattleSpecial(state);
    expect(state.phase).toBe("complete");
    expect(state.bossHp).toBe(0);
  });

  it("MathLive의 간단한 LaTeX와 x= 입력을 정규화한다", () => {
    expect(normalizeMathAnswer("  x = {5} ")).toBe("5");
    expect(normalizeMathAnswer("$\\left 20 \\right$")).toBe("20");
  });
});

import { describe, expect, it } from "vitest";
import { applyDamage, attackDamage } from "./DamageSystem";
import { nextDifficulty } from "./DifficultyEngine";
import { conceptStatus } from "./ConceptMasteryEngine";
import { retryReward } from "./RewardSystem";
import { addGauge, isCoopSpecialReady, isSoloSpecialReady } from "./SkillGaugeSystem";

describe("battle calculations", () => {
  it("보호막이 HP보다 먼저 피해를 흡수한다", () => {
    expect(applyDamage(100, 25, 30)).toEqual({ hp: 95, shield: 0, absorbed: 25 });
    expect(applyDamage(100, 25, 10)).toEqual({ hp: 100, shield: 15, absorbed: 10 });
  });

  it("게이지와 데미지를 안전한 범위로 계산한다", () => {
    expect(addGauge(90, 30)).toBe(100);
    expect(addGauge(5, -20)).toBe(0);
    expect(attackDamage("special")).toBe(100);
  });

  it("심화 미션이 없으면 필살기를 열지 않는다", () => {
    expect(isSoloSpecialReady(100, 100, false)).toBe(false);
    expect(isCoopSpecialReady([100, 100], 100, false)).toBe(false);
    expect(isCoopSpecialReady([70, 70], 100, true)).toBe(true);
  });

  it("여러 신호로 난이도와 개념 상태를 계산한다", () => {
    expect(nextDifficulty(2, { recentSuccesses: 4, hintCount: 1, applicationSuccess: true, manipulationFailures: 0, stopped: false })).toBe(3);
    expect(nextDifficulty(2, { recentSuccesses: 5, hintCount: 3, applicationSuccess: true, manipulationFailures: 0, stopped: false })).toBe(1);
    expect(conceptStatus(5, true, true)).toBe("자유롭게 사용");
  });

  it("재도전 자체에 용기 보상을 준다", () => {
    expect(retryReward(1)).toEqual({ courageGauge: 15, shieldRecovery: 5, badge: "다시 도전 용기 배지" });
  });
});

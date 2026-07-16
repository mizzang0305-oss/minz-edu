import { describe, expect, it } from "vitest";
import { getBossAttackWarningProfile } from "./BossAttackTiming";

describe("getBossAttackWarningProfile", () => {
  it("유아에게 가장 긴 6초 예고 시간을 준다", () => {
    expect(getBossAttackWarningProfile({ schoolLevel: "kindergarten", grade: 5 })).toEqual({
      durationMs: 6_000,
      paceLabel: "천천히 준비",
    });
  });

  it("초등 1~3학년에게 5초 예고 시간을 준다", () => {
    expect(getBossAttackWarningProfile({ schoolLevel: "elementary", grade: 3 })).toEqual({
      durationMs: 5_000,
      paceLabel: "차분히 준비",
    });
  });

  it("초등 4~6학년에게 조금 빠른 4초 예고 시간을 준다", () => {
    expect(getBossAttackWarningProfile({ schoolLevel: "elementary", grade: 4 })).toEqual({
      durationMs: 4_000,
      paceLabel: "빠르게 집중",
    });
    expect(getBossAttackWarningProfile({ schoolLevel: "elementary", grade: 6 }).durationMs).toBe(4_000);
  });
});

import type { LearningStage } from "@/types/learning";

export type BossAttackWarningProfile = {
  durationMs: number;
  paceLabel: string;
};

export function getBossAttackWarningProfile(stage: LearningStage): BossAttackWarningProfile {
  if (stage.schoolLevel === "kindergarten") {
    return { durationMs: 6_000, paceLabel: "천천히 준비" };
  }

  if (stage.grade >= 4) {
    return { durationMs: 4_000, paceLabel: "빠르게 집중" };
  }

  return { durationMs: 5_000, paceLabel: "차분히 준비" };
}

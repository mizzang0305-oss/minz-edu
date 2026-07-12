export type MissionDifficulty = "foundation" | "core" | "application" | "deep";
export type MissionType = "observe" | "manipulate" | "calculate" | "explain" | "apply" | "create";

export type MathMission = {
  id: string;
  grade: number;
  conceptId: string;
  difficulty: MissionDifficulty;
  missionType: MissionType;
  prompt: string;
  visualModel?: {
    type: "tenFrame" | "numberBlocks" | "numberLine" | "coins";
    data: Record<string, unknown>;
  };
  choices?: string[];
  answer: string | number;
  explanationSteps: string[];
  hints: string[];
  rewards: { battleGauge: number; conceptGauge: number; coins: number };
};

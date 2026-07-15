export type SchoolLevel = "kindergarten" | "elementary";

export type LearningStage = {
  schoolLevel: SchoolLevel;
  grade: number;
};

export type LearningBattleProfile = {
  stageLabel: string;
  conceptId: string;
  conceptName: string;
  bossName: string;
  battleTitle: string;
  introTitle: string;
  introCopy: string;
  opening:
    | {
        kind: "blocks";
        target: number;
        base: number;
        source: number;
        move: number;
        title: string;
        copy: string;
      }
    | {
        kind: "choice";
        title: string;
        prompt: string;
        choices: string[];
        answer: string;
        copy: string;
      };
  answer: { title: string; prompt: string; choices: string[]; answer: string; copy: string };
  deep: { prompt: string; copy: string; choices: string[]; answer: string };
  hint: string;
};

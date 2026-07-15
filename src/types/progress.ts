import type { BattleMode, CoopMetrics, PlayerRole } from "./battle";
import type { SchoolLevel } from "./learning";
import type { AcademicSemester, LearningGoalProgress, TrainingAttemptRecord } from "./curriculum";

export type ParentSettings = {
  playerName: string;
  schoolLevel: SchoolLevel;
  grade: number;
  level: "foundation" | "grade" | "advanced";
  advanceRate: 0 | 10 | 20 | 30;
  playMinutes: 5 | 10 | 15;
  theme: string;
  role: PlayerRole;
  soundVolume: number;
  shakeIntensity: 0 | 1 | 2;
  mode: BattleMode;
  friendName: string;
  friendSchoolLevel: SchoolLevel;
  friendGrade: number;
  friendRole: PlayerRole;
  academicSemester: AcademicSemester;
  selectedLearningGoalId: string;
};

export type AdventureRecord = {
  id: string;
  completedAt: string;
  mode: BattleMode;
  playerNames: string[];
  completedMissions: number;
  firstTryCorrect?: number;
  retryCount: number;
  hintCount: number;
  specialSkill: string;
  coins: number;
  badges: string[];
  teamRewards: string[];
  thought?: string;
  coopMetrics?: CoopMetrics;
  stageId?: "number-forest" | "word-island" | "story-castle";
  mapId?: string;
  completedQuestIds?: string[];
  discoveredSecretIds?: string[];
  learningGoalId?: string;
};

export type StageProgress = {
  stageId: "number-forest" | "word-island" | "story-castle";
  status: "locked" | "available" | "cleared";
  completedQuestIds: string[];
  discoveredSecretIds: string[];
  clearedAt?: string;
};

export type ObservationRating = 1 | 2 | 3 | 4 | 5;

export type CoopObservationRecord = {
  id: string;
  adventureId: string;
  observedAt: string;
  turnClarity: ObservationRating;
  waitComfort: ObservationRating;
  helpOccurred: "yes" | "partly" | "no";
  specialSatisfaction: ObservationRating;
  askedToReplay: boolean;
  notes: string;
};

export type StoredGameData = {
  version: 5;
  playerProfile: { displayName: string; schoolLevel: SchoolLevel; grade: number };
  parentSettings: ParentSettings;
  battleProgress: { lastPhase: string; lastPlayedAt?: string };
  conceptProgress: Record<string, "발견 중" | "익히는 중" | "자유롭게 사용">;
  inventory: { coins: number; badges: string[] };
  rewardHistory: AdventureRecord[];
  opinionEntries: Array<{ id: string; text: string; createdAt: string }>;
  playHistory: AdventureRecord[];
  accessibilitySettings: { soundEnabled: boolean; shakeIntensity: 0 | 1 | 2 };
  friendProfiles: Array<{ id: string; displayName: string; schoolLevel: SchoolLevel; grade: number; role: PlayerRole }>;
  localCoopSettings: { enabled: boolean };
  coopBattleHistory: AdventureRecord[];
  teamRewards: string[];
  unlockedTeamSkills: string[];
  observationRecords: CoopObservationRecord[];
  stageProgress: Record<StageProgress["stageId"], StageProgress>;
  learningGoalProgress: Record<string, LearningGoalProgress>;
  trainingHistory: TrainingAttemptRecord[];
};

import type { BattleMode, PlayerRole } from "./battle";

export type ParentSettings = {
  playerName: string;
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
  friendGrade: number;
  friendRole: PlayerRole;
};

export type AdventureRecord = {
  id: string;
  completedAt: string;
  mode: BattleMode;
  playerNames: string[];
  completedMissions: number;
  retryCount: number;
  hintCount: number;
  specialSkill: string;
  coins: number;
  badges: string[];
  teamRewards: string[];
  thought?: string;
};

export type StoredGameData = {
  version: 1;
  playerProfile: { displayName: string; grade: number };
  parentSettings: ParentSettings;
  battleProgress: { lastPhase: string; lastPlayedAt?: string };
  conceptProgress: Record<string, "발견 중" | "익히는 중" | "자유롭게 사용">;
  inventory: { coins: number; badges: string[] };
  rewardHistory: AdventureRecord[];
  opinionEntries: Array<{ id: string; text: string; createdAt: string }>;
  playHistory: AdventureRecord[];
  accessibilitySettings: { soundEnabled: boolean; shakeIntensity: 0 | 1 | 2 };
  friendProfiles: Array<{ id: string; displayName: string; grade: number; role: PlayerRole }>;
  localCoopSettings: { enabled: boolean };
  coopBattleHistory: AdventureRecord[];
  teamRewards: string[];
  unlockedTeamSkills: string[];
};

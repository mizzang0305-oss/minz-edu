import type { SchoolLevel } from "./learning";

export type PlayerRole = "attack" | "defense" | "magic" | "support";
export type BattleMode = "solo" | "local-shared-screen";

export type BattlePhase =
  | "INTRO"
  | "PLAYER_MANIPULATE"
  | "PLAYER_ANSWER"
  | "RESOLVE_ATTACK"
  | "MONSTER_REACTION"
  | "MONSTER_TURN"
  | "REWARD_FEEDBACK"
  | "SPECIAL_CHALLENGE"
  | "SPECIAL_READY"
  | "SPECIAL_CUTSCENE"
  | "BATTLE_WIN"
  | "BATTLE_RECOVERY"
  | "RESULT";

export type CoopPlayer = {
  id: string;
  displayName: string;
  schoolLevel: SchoolLevel;
  grade: number;
  levelProfile: Record<string, string>;
  characterId: string;
  role: PlayerRole;
  hp: number;
  shield: number;
  battleGauge: number;
  conceptGauge: number;
  ready: boolean;
};

export type CoopMetrics = {
  jointMissionsCompleted: number;
  hintsShared: number;
  explanationsShared: number;
  retries: number;
  specialActivations: number;
  waitedTurns: number;
  roleChanges: number;
};

export type CoopBattleState = {
  mode: "local-shared-screen" | "online-room";
  players: CoopPlayer[];
  activePlayerIndex: number;
  teamLinkGauge: number;
  teamCombo: number;
  bossHp: number;
  bossMaxHp: number;
  bossShield: number;
  battlePhase: BattlePhase;
  pendingCoopMissionId?: string;
  specialSkillReady: boolean;
  attemptCount: number;
  completedMissionIds: string[];
  firstTryCorrectCount: number;
  currentQuestionRetried: boolean;
  currentQuestionHintUsed: boolean;
  hintCount: number;
  retryCount: number;
  successfulDodges: number;
  failedDodges: number;
  dodgeStreak: number;
  damageTaken: number;
  message: string;
  shakeIntensity: 0 | 1 | 2;
  soundVolume: number;
  coopMetrics: CoopMetrics;
};

export type CoopMissionType =
  | "split-task"
  | "shared-manipulation"
  | "two-methods"
  | "explain-to-friend"
  | "hint-support"
  | "simultaneous-choice"
  | "joint-creation";

export type CoopMission = {
  id: string;
  conceptId: string;
  missionType: CoopMissionType;
  playerTasks: Array<{
    playerSlot: number;
    taskType: string;
    prompt: string;
    difficultyPolicy: "individualized";
    rewards: { personalGauge: number; teamLinkGauge: number };
  }>;
  completionPolicy: "all-players" | "role-combination" | "shared-result";
  teamReward: { teamLinkGauge: number; coins: number };
};

export type BattleAction =
  | { type: "START"; goalTitle?: string }
  | { type: "MANIPULATION_SUCCESS"; missionId?: string }
  | { type: "ANSWER_SUCCESS"; missionId: string; deep?: boolean }
  | { type: "ANSWER_RETRY"; hint?: string }
  | { type: "DODGE_SUCCESS" }
  | { type: "DODGE_FAILED"; damage: number; hint?: string }
  | { type: "USE_HINT"; hint?: string }
  | { type: "SPECIAL_CHALLENGE_SUCCESS"; missionId?: string }
  | { type: "PLAYER_READY"; playerIndex: number }
  | { type: "RESET_READY" }
  | { type: "SPECIAL_COMPLETE" };

export type BossAttackSignal = {
  id: number;
  targetPlayerIndex: number;
  outcome: "telegraph" | "dodge" | "hit";
  attackName: string;
};

export type OnlineRoomStatus =
  | "waiting"
  | "ready"
  | "battle"
  | "special"
  | "reward"
  | "closed";

export type CoopRoomState = {
  roomCode: string;
  status: OnlineRoomStatus;
  hostPlayerId: string;
  players: Record<string, CoopPlayer>;
  boss: { id: string; hp: number; maxHp: number; phase: number };
  activePlayerId?: string;
  teamLinkGauge: number;
  teamCombo: number;
  missionState: {
    missionId?: string;
    assignedPlayerIds: string[];
    completedPlayerIds: string[];
  };
  expiresAt: number;
};

export const NETWORK_EVENT_TYPES = [
  "ROOM_CREATE",
  "ROOM_JOIN",
  "PLAYER_READY",
  "BATTLE_START",
  "MISSION_ASSIGNED",
  "PLAYER_ANSWER_SUBMIT",
  "PLAYER_MANIPULATION_COMPLETE",
  "PLAYER_HINT_SEND",
  "PLAYER_RETRY",
  "ATTACK_RESOLVED",
  "TEAM_GAUGE_UPDATED",
  "SPECIAL_CHALLENGE_START",
  "SPECIAL_READY",
  "SPECIAL_ACTIVATE",
  "BOSS_PHASE_CHANGED",
  "BATTLE_COMPLETE",
  "PLAYER_DISCONNECTED",
  "PLAYER_RECONNECTED",
  "ROOM_CLOSED",
] as const;

export type NetworkEventType = (typeof NETWORK_EVENT_TYPES)[number];

export type CoopNetworkEvent<TPayload = Record<string, unknown>> = {
  type: NetworkEventType;
  roomId: string;
  playerId: string;
  eventId: string;
  clientTimestamp: number;
  serverTimestamp: number;
  payloadVersion: 1;
  payload: TPayload;
};

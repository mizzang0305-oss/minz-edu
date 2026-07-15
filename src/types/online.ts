import type { SchoolLevel } from "./learning";

export type GuardianAccount = {
  uid: string;
  email?: string;
  displayName: string;
  childProfileIds: string[];
};

export type ChildProfile = {
  id: string;
  guardianUid: string;
  displayName: string;
  schoolLevel: SchoolLevel;
  grade: number;
  characterId: string;
  friendCode: string;
  createdAt: number;
};

export type OnlineRoomStatus =
  | "waiting"
  | "ready"
  | "battle"
  | "special"
  | "reward"
  | "closed";

export type OnlineRoomPlayer = {
  childProfileId: string;
  guardianUid: string;
  displayName: string;
  characterId: string;
  ready: boolean;
  connected: boolean;
  lastSeenAt: number;
};

export type OnlineRoom = {
  id: string;
  roomCode: string;
  hostGuardianUid: string;
  status: OnlineRoomStatus;
  players: Record<string, OnlineRoomPlayer>;
  activePlayerId?: string;
  bossHp: number;
  teamLinkGauge: number;
  revision: number;
  expiresAt: number;
};

export type BattleCommand = {
  eventId: string;
  roomId: string;
  playerId: string;
  expectedRevision: number;
  type: "PLAYER_READY" | "ANSWER_SUBMIT" | "HINT_SEND" | "SPECIAL_READY";
  payload: Record<string, unknown>;
  clientTimestamp: number;
};

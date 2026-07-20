import { GAME_POC_QUESTIONS } from "@/data/gamePocQuestions";
import {
  createLearningBattlePocState,
  resolveLearningBattleAttack,
  resolveLearningBattleSpecial,
  submitLearningBattleAnswer,
} from "@/game/poc/LearningBattlePocEngine";
import type {
  ColyseusLearningClientMessages,
  ColyseusLearningRoomState,
  ColyseusLearningServerMessages,
  LearningBattlePocState,
} from "@/types/learningBattlePoc";

const MAX_DISPLAY_NAME_LENGTH = 12;
const MAX_ANSWER_LENGTH = 64;

type Seat = {
  sessionId?: string;
  playerId: string;
  connected: boolean;
  lastClientSequence: number;
};

export class LearningRoomActionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LearningRoomActionError";
  }
}

export class LearningRoomAuthority {
  private battle: LearningBattlePocState = createLearningBattlePocState("local-coop");
  private revision = 0;
  private readonly seats: Seat[];

  constructor(private readonly roomId: string) {
    this.seats = this.battle.players.map((player) => ({
      playerId: player.id,
      connected: false,
      lastClientSequence: -1,
    }));
  }

  join(sessionId: string, rawDisplayName: unknown) {
    const existingSeatIndex = this.seats.findIndex((seat) => seat.sessionId === sessionId);
    const seatIndex = existingSeatIndex >= 0
      ? existingSeatIndex
      : this.seats.findIndex((seat) => seat.sessionId === undefined);

    if (seatIndex < 0) {
      throw new LearningRoomActionError("ROOM_FULL", "두 명이 이미 전투에 참가하고 있어.");
    }

    const displayName = sanitizeDisplayName(rawDisplayName, seatIndex);
    const seat = this.seats[seatIndex];
    const changed = seat.sessionId !== sessionId
      || !seat.connected
      || this.battle.players[seatIndex].displayName !== displayName;

    seat.sessionId = sessionId;
    seat.connected = true;
    if (existingSeatIndex < 0) seat.lastClientSequence = -1;
    this.battle = {
      ...this.battle,
      players: this.battle.players.map((player, index) => index === seatIndex
        ? { ...player, displayName }
        : player),
    };
    if (changed) this.revision += 1;

    return { playerId: seat.playerId, playerIndex: seatIndex };
  }

  markDropped(sessionId: string) {
    const seat = this.requireSeat(sessionId);
    if (seat.connected) {
      seat.connected = false;
      this.revision += 1;
    }
  }

  markReconnected(sessionId: string) {
    const seat = this.requireSeat(sessionId);
    if (!seat.connected) {
      seat.connected = true;
      this.revision += 1;
    }
    return { playerId: seat.playerId };
  }

  leave(sessionId: string) {
    const seat = this.seats.find((candidate) => candidate.sessionId === sessionId);
    if (!seat) return;
    seat.sessionId = undefined;
    seat.connected = false;
    seat.lastClientSequence = -1;
    this.revision += 1;
  }

  resolveAnswer(
    sessionId: string,
    payload: ColyseusLearningClientMessages["answer:submit"],
  ): ColyseusLearningServerMessages["answer:resolved"] {
    const { seat, playerIndex } = this.requireActiveSeat(sessionId, payload.playerId, payload.clientSequence);
    const question = GAME_POC_QUESTIONS[this.battle.questionIndex];
    if (!question || payload.questionId !== question.id) {
      throw new LearningRoomActionError("QUESTION_MISMATCH", "현재 결계와 답안 정보가 일치하지 않아.");
    }
    if (typeof payload.answer !== "string" || payload.answer.length > MAX_ANSWER_LENGTH) {
      throw new LearningRoomActionError("INVALID_ANSWER", "답안 형식을 다시 확인해 줘.");
    }
    if (this.battle.phase !== "question") {
      throw new LearningRoomActionError("ANSWER_LOCKED", "지금은 답을 제출할 차례가 아니야.");
    }

    this.consumeSequence(seat, payload.clientSequence);
    const previousCorrectCount = this.battle.correctCount;
    this.battle = submitLearningBattleAnswer(this.battle, payload.answer);
    this.revision += 1;
    return {
      playerId: seat.playerId,
      playerIndex,
      questionId: question.id,
      correct: this.battle.correctCount > previousCorrectCount,
      revision: this.revision,
    };
  }

  resolveAttack(
    sessionId: string,
    payload: ColyseusLearningClientMessages["attack:request"],
  ): ColyseusLearningServerMessages["attack:resolved"] {
    const { seat, playerIndex } = this.requireActiveSeat(sessionId, payload.playerId, payload.clientSequence);
    const question = GAME_POC_QUESTIONS[this.battle.questionIndex];
    if (!question || payload.questionId !== question.id) {
      throw new LearningRoomActionError("QUESTION_MISMATCH", "현재 결계와 공격 정보가 일치하지 않아.");
    }
    if (this.battle.phase !== "attack-ready") {
      throw new LearningRoomActionError("ATTACK_LOCKED", "정답을 맞힌 뒤에만 공격할 수 있어.");
    }
    if (typeof payload.charged !== "boolean") {
      throw new LearningRoomActionError("INVALID_ATTACK", "공격 형식을 다시 확인해 줘.");
    }

    this.consumeSequence(seat, payload.clientSequence);
    const previousBossHp = this.battle.bossHp;
    this.battle = resolveLearningBattleAttack(this.battle, payload.charged);
    this.revision += 1;
    return {
      playerId: seat.playerId,
      playerIndex,
      charged: payload.charged,
      damage: previousBossHp - this.battle.bossHp,
      bossHp: this.battle.bossHp,
      revision: this.revision,
    };
  }

  resolveSpecial(
    sessionId: string,
    payload: ColyseusLearningClientMessages["special:request"],
  ): ColyseusLearningServerMessages["special:resolved"] {
    const { seat } = this.requireActiveSeat(sessionId, payload.playerId, payload.clientSequence);
    if (this.battle.phase !== "special-ready") {
      throw new LearningRoomActionError("SPECIAL_LOCKED", "심화 룬을 완성한 뒤에만 스페셜을 쓸 수 있어.");
    }

    this.consumeSequence(seat, payload.clientSequence);
    const previousBossHp = this.battle.bossHp;
    this.battle = resolveLearningBattleSpecial(this.battle);
    this.revision += 1;
    return {
      playerIds: this.battle.players.map((player) => player.id),
      damage: previousBossHp - this.battle.bossHp,
      bossHp: this.battle.bossHp,
      revision: this.revision,
    };
  }

  getSnapshot(): ColyseusLearningRoomState {
    const assignedSeats = this.seats.filter((seat) => seat.sessionId !== undefined);
    const connectedSeats = assignedSeats.filter((seat) => seat.connected);
    const connectionStatus = connectedSeats.length === 2
      ? "ready"
      : assignedSeats.length === 2
        ? "reconnecting"
        : "waiting";
    return {
      roomId: this.roomId,
      revision: this.revision,
      battle: structuredClone(this.battle),
      connectedPlayerIds: connectedSeats.map((seat) => seat.playerId),
      connectionStatus,
    };
  }

  getPlayerId(sessionId: string) {
    return this.requireSeat(sessionId).playerId;
  }

  private requireActiveSeat(sessionId: string, claimedPlayerId: unknown, clientSequence: unknown) {
    this.requireReadyRoom();
    const seat = this.requireSeat(sessionId);
    const playerIndex = this.seats.indexOf(seat);
    const activePlayer = this.battle.players[this.battle.activePlayerIndex];
    if (claimedPlayerId !== seat.playerId) {
      throw new LearningRoomActionError("PLAYER_MISMATCH", "현재 접속한 캐릭터 정보와 요청이 일치하지 않아.");
    }
    if (activePlayer.id !== seat.playerId) {
      throw new LearningRoomActionError("NOT_YOUR_TURN", "친구의 행동이 끝날 때까지 기다려 줘.");
    }
    if (!Number.isSafeInteger(clientSequence) || Number(clientSequence) <= seat.lastClientSequence) {
      throw new LearningRoomActionError("STALE_SEQUENCE", "이미 처리했거나 순서가 지난 요청이야.");
    }
    return { seat, playerIndex };
  }

  private requireReadyRoom() {
    if (this.seats.filter((seat) => seat.connected).length !== 2) {
      throw new LearningRoomActionError("WAITING_FOR_PLAYER", "두 플레이어가 연결되어야 전투를 시작할 수 있어.");
    }
  }

  private requireSeat(sessionId: string) {
    const seat = this.seats.find((candidate) => candidate.sessionId === sessionId);
    if (!seat) {
      throw new LearningRoomActionError("PLAYER_NOT_FOUND", "이 방의 플레이어 정보를 찾지 못했어.");
    }
    return seat;
  }

  private consumeSequence(seat: Seat, clientSequence: number) {
    seat.lastClientSequence = clientSequence;
  }
}

function sanitizeDisplayName(value: unknown, seatIndex: number) {
  if (typeof value !== "string") return seatIndex === 0 ? "민즈" : "친구";
  const normalized = value.trim().replace(/[<>]/g, "").slice(0, MAX_DISPLAY_NAME_LENGTH);
  return normalized || (seatIndex === 0 ? "민즈" : "친구");
}

import { ErrorCode, Room, ServerError, type Client } from "@colyseus/core";
import {
  LearningRoomActionError,
  LearningRoomAuthority,
} from "../../src/game/online/LearningRoomAuthority";
import type {
  ColyseusLearningClientMessages,
  ColyseusLearningServerMessages,
} from "../../src/types/learningBattlePoc";
import {
  RoomTicketError,
  verifyRoomTicket,
  type RoomTicketClaims,
} from "../../src/services/online/roomTicket";
import { issueLearningLogReceipt } from "../../src/services/online/learningLogReceipt";

export const LEARNING_BATTLE_ROOM_NAME = "learning_battle";
export const LEARNING_BATTLE_RECONNECT_SECONDS = 60;

export class LearningBattleRoom extends Room {
  static roomTicketSecret = "";
  static consumedTicketIds = new Map<string, number>();

  private authority!: LearningRoomAuthority;
  private hostTicketId = "";

  static async onAuth(token: string, options: unknown) {
    try {
      const claims = verifyRoomTicket(token, this.roomTicketSecret);
      assertTicketOptions(options, claims);
      const nowSeconds = Math.floor(Date.now() / 1_000);
      for (const [ticketId, expiresAt] of this.consumedTicketIds) {
        if (expiresAt <= nowSeconds) this.consumedTicketIds.delete(ticketId);
      }
      if (this.consumedTicketIds.has(claims.ticketId)) {
        throw new RoomTicketError("EXPIRED");
      }
      this.consumedTicketIds.set(claims.ticketId, claims.expiresAt);
      console.info("minz_coop_auth", {
        event: "room_ticket_accepted",
        intent: claims.intent,
        ticketRef: claims.ticketId.slice(0, 8),
      });
      return claims;
    } catch (error) {
      console.warn("minz_coop_auth", {
        event: "room_ticket_rejected",
        code: error instanceof RoomTicketError ? error.code : "CLAIMS",
      });
      throw new ServerError(ErrorCode.AUTH_FAILED, "room ticket rejected");
    }
  }

  onCreate(options: { ticketIntent?: unknown; ticketId?: unknown } = {}) {
    if (options.ticketIntent !== "create" || typeof options.ticketId !== "string") {
      throw new ServerError(ErrorCode.AUTH_FAILED, "create ticket required");
    }
    this.hostTicketId = options.ticketId;
    this.maxClients = 2;
    this.maxMessagesPerSecond = 12;
    this.authority = new LearningRoomAuthority(this.roomId);

    this.onMessage("player:join", (client) => {
      this.runSafely(client, () => {
        const auth = requireRoomAuth(client.auth);
        const assignment = this.authority.join(client.sessionId, auth.displayName, auth.guardianKey);
        client.userData = { ...client.userData, synced: true };
        this.sendAssignment(client, assignment.playerId);
        this.sendLearningLog(client);
        this.broadcastSnapshot();
      });
    });
    this.onMessage("answer:submit", (client, payload: unknown) => {
      this.runSafely(client, () => {
        assertRecord(payload);
        const resolved = this.authority.resolveAnswer(
          client.sessionId,
          payload as ColyseusLearningClientMessages["answer:submit"],
        );
        this.broadcast("answer:resolved", resolved);
        this.sendLearningLog(client);
        const learningLog = this.authority.getLearningLog(client.sessionId);
        const questionLog = learningLog.questionLogs.at(-1);
        this.audit("answer_resolved", {
          playerId: resolved.playerId,
          questionId: resolved.questionId,
          correct: resolved.correct,
          attemptCount: questionLog?.attemptCount ?? 0,
          hintCount: questionLog?.hintCount ?? 0,
          elapsedMs: questionLog?.elapsedMs ?? 0,
        });
        this.broadcastSnapshot();
      });
    });
    this.onMessage("attack:request", (client, payload: unknown) => {
      this.runSafely(client, () => {
        assertRecord(payload);
        const resolved = this.authority.resolveAttack(
          client.sessionId,
          payload as ColyseusLearningClientMessages["attack:request"],
        );
        this.broadcast("attack:resolved", resolved);
        this.broadcastSnapshot();
      });
    });
    this.onMessage("special:request", (client, payload: unknown) => {
      this.runSafely(client, () => {
        assertRecord(payload);
        const resolved = this.authority.resolveSpecial(
          client.sessionId,
          payload as ColyseusLearningClientMessages["special:request"],
        );
        this.broadcast("special:resolved", resolved);
        this.broadcastSnapshot();
      });
    });
  }

  onJoin(client: Client, _options: unknown, authValue: unknown) {
    const auth = requireRoomAuth(authValue);
    if (auth.intent === "create" && auth.ticketId !== this.hostTicketId) {
      throw new ServerError(ErrorCode.AUTH_FAILED, "create ticket does not own this room");
    }
    if (auth.intent === "join" && auth.roomId !== this.roomId) {
      throw new ServerError(ErrorCode.AUTH_FAILED, "join ticket room mismatch");
    }
    client.userData = { ...client.userData, synced: false };
    this.authority.join(client.sessionId, auth.displayName, auth.guardianKey);
    this.audit("player_joined", { intent: auth.intent });
    this.clock.setTimeout(() => {
      if (!client.userData?.synced) client.leave(4_008, "player sync timeout");
    }, 5_000);
  }

  onDrop(client: Client) {
    this.authority.markDropped(client.sessionId);
    this.broadcastSnapshot();
    this.audit("player_dropped");
    void this.allowReconnection(client, LEARNING_BATTLE_RECONNECT_SECONDS).catch(() => undefined);
  }

  onReconnect(client: Client) {
    const assignment = this.authority.markReconnected(client.sessionId);
    this.sendAssignment(client, assignment.playerId);
    this.sendLearningLog(client);
    this.broadcastSnapshot();
    this.audit("player_reconnected", { playerId: assignment.playerId });
  }

  onLeave(client: Client) {
    this.authority.leave(client.sessionId);
    this.broadcastSnapshot();
  }

  private sendAssignment(client: Client, playerId: string) {
    client.send("player:assigned", {
      playerId,
      roomId: this.roomId,
      reconnectSeconds: LEARNING_BATTLE_RECONNECT_SECONDS,
    } satisfies ColyseusLearningServerMessages["player:assigned"]);
  }

  private broadcastSnapshot() {
    this.broadcast("battle:snapshot", this.authority.getSnapshot());
  }

  private sendLearningLog(client: Client) {
    const auth = requireRoomAuth(client.auth);
    const log = this.authority.getLearningLog(client.sessionId);
    const { receipt } = issueLearningLogReceipt({
      guardianKey: auth.guardianKey,
      childKey: auth.childKey,
      roomId: this.roomId,
      playerId: log.playerId,
      revision: this.authority.getSnapshot().revision,
      log,
    }, (this.constructor as typeof LearningBattleRoom).roomTicketSecret);
    client.send("learning:log", {
      log,
      receipt,
    } satisfies ColyseusLearningServerMessages["learning:log"]);
  }

  private audit(event: string, details: Record<string, unknown> = {}) {
    console.info("minz_coop_audit", {
      event,
      roomId: this.roomId,
      revision: this.authority.getSnapshot().revision,
      ...details,
    });
  }

  private runSafely(client: Client, action: () => void) {
    try {
      action();
    } catch (error) {
      const roomError = error instanceof LearningRoomActionError
        ? error
        : new LearningRoomActionError("INVALID_PAYLOAD", "요청 형식을 다시 확인해 줘.");
      client.send("room:error", {
        code: roomError.code,
        message: roomError.message,
      } satisfies ColyseusLearningServerMessages["room:error"]);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRoomAuth(value: unknown): RoomTicketClaims {
  if (
    !isRecord(value)
    || typeof value.guardianKey !== "string"
    || typeof value.childKey !== "string"
    || typeof value.displayName !== "string"
  ) {
    throw new ServerError(ErrorCode.AUTH_FAILED, "room authentication missing");
  }
  return value as RoomTicketClaims;
}

function assertTicketOptions(value: unknown, claims: RoomTicketClaims) {
  if (!isRecord(value) || value.ticketId !== claims.ticketId || value.ticketIntent !== claims.intent) {
    throw new RoomTicketError("CLAIMS");
  }
  if (claims.intent === "join" && value.roomId !== claims.roomId) {
    throw new RoomTicketError("CLAIMS");
  }
  if (claims.intent === "create" && value.roomId !== undefined) {
    throw new RoomTicketError("CLAIMS");
  }
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new LearningRoomActionError("INVALID_PAYLOAD", "요청 형식을 다시 확인해 줘.");
  }
}

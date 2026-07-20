import { Room, type Client } from "@colyseus/core";
import {
  LearningRoomActionError,
  LearningRoomAuthority,
} from "../../src/game/online/LearningRoomAuthority";
import type {
  ColyseusLearningClientMessages,
  ColyseusLearningServerMessages,
} from "../../src/types/learningBattlePoc";

export const LEARNING_BATTLE_ROOM_NAME = "learning_battle";
export const LEARNING_BATTLE_RECONNECT_SECONDS = 10;

export class LearningBattleRoom extends Room {
  private authority!: LearningRoomAuthority;

  onCreate() {
    this.maxClients = 2;
    this.maxMessagesPerSecond = 12;
    this.authority = new LearningRoomAuthority(this.roomId);

    this.onMessage("player:join", (client, payload: unknown) => {
      this.runSafely(client, () => {
        const displayName = isRecord(payload) ? payload.displayName : undefined;
        const assignment = this.authority.join(client.sessionId, displayName);
        client.userData = { ...client.userData, synced: true };
        this.sendAssignment(client, assignment.playerId);
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

  onJoin(client: Client, options: { displayName?: unknown } = {}) {
    client.userData = { ...client.userData, synced: false };
    this.authority.join(client.sessionId, options.displayName);
    this.clock.setTimeout(() => {
      if (!client.userData?.synced) client.leave(4_008, "player sync timeout");
    }, 5_000);
  }

  onDrop(client: Client) {
    this.authority.markDropped(client.sessionId);
    this.broadcastSnapshot();
    void this.allowReconnection(client, LEARNING_BATTLE_RECONNECT_SECONDS).catch(() => undefined);
  }

  onReconnect(client: Client) {
    const assignment = this.authority.markReconnected(client.sessionId);
    this.sendAssignment(client, assignment.playerId);
    this.broadcastSnapshot();
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

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new LearningRoomActionError("INVALID_PAYLOAD", "요청 형식을 다시 확인해 줘.");
  }
}

import { Client, type Room } from "@colyseus/sdk";
import type {
  ColyseusLearningClientMessages,
  ColyseusLearningRoomState,
  ColyseusLearningServerMessages,
} from "@/types/learningBattlePoc";

export type LearningRoomClientStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "ready"
  | "reconnecting"
  | "error";

export type LearningRoomClientEvents = {
  onAssigned?: (payload: ColyseusLearningServerMessages["player:assigned"]) => void;
  onSnapshot?: (payload: ColyseusLearningRoomState) => void;
  onAnswer?: (payload: ColyseusLearningServerMessages["answer:resolved"]) => void;
  onAttack?: (payload: ColyseusLearningServerMessages["attack:resolved"]) => void;
  onSpecial?: (payload: ColyseusLearningServerMessages["special:resolved"]) => void;
  onStatus?: (status: LearningRoomClientStatus) => void;
  onError?: (message: string, code?: string | number) => void;
};

type ConnectOptions = {
  endpoint?: string;
  displayName: string;
  roomId?: string;
  match?: "create" | "join-or-create" | "join-by-id";
};

export class ColyseusLearningClient {
  private room: Room | null = null;
  private playerId: string | null = null;
  private clientSequence = 0;
  private leaving = false;

  constructor(private readonly events: LearningRoomClientEvents) {}

  async connect(options: ConnectOptions) {
    if (this.room) throw new Error("이미 협동 방에 연결되어 있어.");
    this.events.onStatus?.("connecting");
    const endpoint = options.endpoint ?? process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "http://127.0.0.1:2567";
    const client = new Client(endpoint);
    const joinOptions = { displayName: options.displayName };

    try {
      const room = options.match === "create"
        ? await client.create("learning_battle", joinOptions)
        : options.match === "join-by-id"
          ? await client.joinById(requireRoomId(options.roomId), joinOptions)
          : await client.joinOrCreate("learning_battle", joinOptions);
      this.room = room;
      this.bindRoom(room, options.displayName);
      room.send("player:join", { displayName: options.displayName } satisfies ColyseusLearningClientMessages["player:join"]);
      return room.roomId;
    } catch (error) {
      this.events.onStatus?.("error");
      this.events.onError?.(toErrorMessage(error), "CONNECT_FAILED");
      throw error;
    }
  }

  sendAnswer(questionId: string, answer: string) {
    this.send("answer:submit", { questionId, answer });
  }

  sendAttack(questionId: string, charged: boolean) {
    this.send("attack:request", { questionId, charged });
  }

  sendSpecial() {
    this.send("special:request", {});
  }

  async disconnect() {
    this.leaving = true;
    const room = this.room;
    this.room = null;
    this.playerId = null;
    this.clientSequence = 0;
    if (room) await room.leave(true).catch(() => undefined);
    this.events.onStatus?.("idle");
    this.leaving = false;
  }

  private bindRoom(room: Room, displayName: string) {
    room.reconnection.minUptime = 0;
    room.reconnection.minDelay = 100;
    room.reconnection.maxDelay = 1_000;
    room.reconnection.maxRetries = 12;

    room.onMessage("player:assigned", (payload: ColyseusLearningServerMessages["player:assigned"]) => {
      this.playerId = payload.playerId;
      this.events.onAssigned?.(payload);
    });
    room.onMessage("battle:snapshot", (payload: ColyseusLearningRoomState) => {
      this.events.onSnapshot?.(payload);
      this.events.onStatus?.(payload.connectionStatus);
    });
    room.onMessage("answer:resolved", (payload: ColyseusLearningServerMessages["answer:resolved"]) => {
      this.events.onAnswer?.(payload);
    });
    room.onMessage("attack:resolved", (payload: ColyseusLearningServerMessages["attack:resolved"]) => {
      this.events.onAttack?.(payload);
    });
    room.onMessage("special:resolved", (payload: ColyseusLearningServerMessages["special:resolved"]) => {
      this.events.onSpecial?.(payload);
    });
    room.onMessage("room:error", (payload: ColyseusLearningServerMessages["room:error"]) => {
      this.events.onError?.(payload.message, payload.code);
    });
    room.onDrop(() => this.events.onStatus?.("reconnecting"));
    room.onReconnect(() => {
      this.events.onStatus?.("waiting");
      room.send("player:join", { displayName } satisfies ColyseusLearningClientMessages["player:join"]);
    });
    room.onError((code, message) => this.events.onError?.(message || "협동 서버 연결 오류가 발생했어.", code));
    room.onLeave(() => {
      if (!this.leaving) {
        this.room = null;
        this.playerId = null;
        this.events.onStatus?.("error");
        this.events.onError?.("협동 방 연결이 종료됐어. 다시 참가해 줘.", "ROOM_LEFT");
      }
    });
  }

  private send<TType extends Exclude<keyof ColyseusLearningClientMessages, "player:join">>(
    type: TType,
    payload: Omit<ColyseusLearningClientMessages[TType], "playerId" | "clientSequence">,
  ) {
    if (!this.room || !this.playerId) {
      this.events.onError?.("플레이어 배정이 끝난 뒤 다시 시도해 줘.", "PLAYER_NOT_READY");
      return;
    }
    this.clientSequence += 1;
    this.room.send(type, {
      ...payload,
      playerId: this.playerId,
      clientSequence: this.clientSequence,
    });
  }
}

function requireRoomId(roomId: string | undefined) {
  const normalized = roomId?.trim();
  if (!normalized) throw new Error("참가할 방 ID를 입력해 줘.");
  return normalized;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "협동 서버에 연결하지 못했어.";
}

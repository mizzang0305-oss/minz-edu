// @vitest-environment node

import { Client, type Room } from "@colyseus/sdk";
import { describe, expect, it } from "vitest";
import { startLearningBattleServer } from "../../../server/colyseus/app";
import type {
  ColyseusLearningRoomState,
  ColyseusLearningServerMessages,
} from "@/types/learningBattlePoc";

describe("Colyseus LearningBattleRoom 실제 왕복", () => {
  it("2개 SDK 클라이언트의 지연, 전투, 재접속, 스페셜을 서버 권한으로 동기화한다", async () => {
    const running = await startLearningBattleServer({ port: 0 });
    let roomA: Room | undefined;
    let roomB: Room | undefined;

    try {
      const health = await fetch(`${running.endpoint}/__healthcheck`, {
        headers: { Origin: "http://127.0.0.1:3105" },
      });
      expect(await health.text()).toBe("OK");
      expect(health.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:3105");

      const deniedOrigin = await fetch(`${running.endpoint}/__healthcheck`, {
        headers: { Origin: "https://untrusted.example" },
      });
      expect(deniedOrigin.headers.get("access-control-allow-origin")).toBe("null");

      const clientA = new Client(running.endpoint);
      const clientB = new Client(running.endpoint);
      roomA = await clientA.create("learning_battle", { displayName: "민즈" });
      configureFastReconnect(roomA);
      const assignmentA = waitForMessage<ColyseusLearningServerMessages["player:assigned"]>(roomA, "player:assigned");
      roomA.send("player:join", { displayName: "민즈" });
      expect(await assignmentA).toMatchObject({ playerId: "player-1", roomId: roomA.roomId });

      const readyForA = waitForSnapshot(roomA, (snapshot) => snapshot.connectionStatus === "ready");
      roomB = await clientB.joinById(roomA.roomId, { displayName: "친구" });
      configureFastReconnect(roomB);
      const assignmentB = waitForMessage<ColyseusLearningServerMessages["player:assigned"]>(roomB, "player:assigned");
      const readyForB = waitForSnapshot(roomB, (snapshot) => snapshot.connectionStatus === "ready");
      roomB.send("player:join", { displayName: "친구" });

      expect(await assignmentB).toMatchObject({ playerId: "player-2", roomId: roomA.roomId });
      const [initialA, initialB] = await Promise.all([readyForA, readyForB]);
      expect(initialA.battle).toEqual(initialB.battle);
      expect(initialA.connectedPlayerIds).toEqual(["player-1", "player-2"]);

      const wrongEvent = waitForMessage<ColyseusLearningServerMessages["answer:resolved"]>(roomA, "answer:resolved");
      const wrongSnapshot = waitForSnapshot(roomB, (snapshot) => snapshot.battle.wrongCount === 1);
      roomA.send("answer:submit", {
        playerId: "player-1",
        questionId: "linear-equation-core",
        answer: "19",
        clientSequence: 0,
      });
      expect(await wrongEvent).toMatchObject({ playerId: "player-1", correct: false });
      expect((await wrongSnapshot).battle.players[0]).toMatchObject({ hp: 100, shield: 10 });

      running.server.simulateLatency(120);
      const correctEvent = waitForMessage<ColyseusLearningServerMessages["answer:resolved"]>(roomB, "answer:resolved");
      const latencyStartedAt = performance.now();
      roomA.send("answer:submit", {
        playerId: "player-1",
        questionId: "linear-equation-core",
        answer: "20",
        clientSequence: 1,
      });
      expect(await correctEvent).toMatchObject({ correct: true });
      expect(performance.now() - latencyStartedAt).toBeGreaterThanOrEqual(45);
      running.server.simulateLatency(0);

      const chargedEvent = waitForMessage<ColyseusLearningServerMessages["attack:resolved"]>(roomB, "attack:resolved");
      roomA.send("attack:request", {
        playerId: "player-1",
        questionId: "linear-equation-core",
        charged: true,
        clientSequence: 2,
      });
      expect(await chargedEvent).toMatchObject({ playerId: "player-1", charged: true, damage: 40, bossHp: 140 });

      const reconnectingForA = waitForSnapshot(roomA, (snapshot) => snapshot.connectionStatus === "reconnecting");
      const dropForB = waitForSignal(roomB.onDrop);
      const reconnectForB = waitForSignal(roomB.onReconnect);
      roomB.connection.close();
      await dropForB;
      expect((await reconnectingForA).battle.bossHp).toBe(140);
      await reconnectForB;
      const readyAfterReconnect = waitForSnapshot(roomB, (snapshot) => snapshot.connectionStatus === "ready");
      roomB.send("player:join", { displayName: "친구" });
      expect((await readyAfterReconnect).battle.bossHp).toBe(140);

      await answerAndAttack(roomB, "player-2", "linear-equation-application", "5", 0, 1);

      const deepReady = waitForSnapshot(roomA, (snapshot) => snapshot.battle.phase === "special-ready");
      roomA.send("answer:submit", {
        playerId: "player-1",
        questionId: "linear-equation-deep",
        answer: "6",
        clientSequence: 3,
      });
      expect((await deepReady).battle.conceptGauge).toBe(100);

      const specialEvent = waitForMessage<ColyseusLearningServerMessages["special:resolved"]>(roomB, "special:resolved");
      const complete = waitForSnapshot(roomA, (snapshot) => snapshot.battle.phase === "complete");
      roomA.send("special:request", {
        playerId: "player-1",
        clientSequence: 4,
      });
      expect(await specialEvent).toMatchObject({ bossHp: 0 });
      expect((await complete).battle.bossHp).toBe(0);
    } finally {
      await roomB?.leave(true).catch(() => undefined);
      await roomA?.leave(true).catch(() => undefined);
      await running.stop();
    }
  }, 20_000);
});

function configureFastReconnect(room: Room) {
  room.reconnection.minUptime = 0;
  room.reconnection.minDelay = 10;
  room.reconnection.maxDelay = 30;
  room.reconnection.maxRetries = 5;
}

async function answerAndAttack(
  room: Room,
  playerId: string,
  questionId: string,
  answer: string,
  answerSequence: number,
  attackSequence: number,
) {
  const answerResolved = waitForMessage<ColyseusLearningServerMessages["answer:resolved"]>(room, "answer:resolved");
  room.send("answer:submit", { playerId, questionId, answer, clientSequence: answerSequence });
  expect(await answerResolved).toMatchObject({ playerId, correct: true });

  const attackResolved = waitForMessage<ColyseusLearningServerMessages["attack:resolved"]>(room, "attack:resolved");
  room.send("attack:request", { playerId, questionId, charged: false, clientSequence: attackSequence });
  expect(await attackResolved).toMatchObject({ playerId, damage: 28 });
}

function waitForSnapshot(room: Room, predicate: (snapshot: ColyseusLearningRoomState) => boolean) {
  return waitForMessage<ColyseusLearningRoomState>(room, "battle:snapshot", predicate);
}

function waitForMessage<T>(
  room: Room,
  type: string,
  predicate: (payload: T) => boolean = () => true,
  timeoutMs = 4_000,
) {
  return new Promise<T>((resolve, reject) => {
    let unsubscribe: () => void = () => undefined;
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timed out waiting for ${type}`));
    }, timeoutMs);
    unsubscribe = room.onMessage(type, (payload: T) => {
      if (!predicate(payload)) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(payload);
    });
  });
}

function waitForSignal(signal: { once: (callback: () => void) => unknown }, timeoutMs = 4_000) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for room signal")), timeoutMs);
    signal.once(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

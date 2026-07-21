// @vitest-environment node

import { Client, type Room } from "@colyseus/sdk";
import { describe, expect, it } from "vitest";
import { startLearningBattleServer } from "../../../server/colyseus/app";
import { issueRoomTicket } from "@/services/online/roomTicket";
import type { ColyseusLearningRoomState, ColyseusLearningServerMessages } from "@/types/learningBattlePoc";

const ROOM_TICKET_SECRET = "long-reconnect-integration-secret-with-32-plus-bytes";
const runLongDescribe = process.env.RUN_LONG_RECONNECT_TESTS === "true" ? describe : describe.skip;

runLongDescribe("CPD reconnect timing boundaries", () => {
  it("restores after 30s app suspension and 20s network loss, then rejects a 65s-expired seat", async () => {
    const running = await startLearningBattleServer({ port: 0, roomTicketSecret: ROOM_TICKET_SECRET });
    let roomA: Room | undefined;
    let roomB: Room | undefined;

    try {
      const clientA = new Client(running.endpoint);
      const createTicket = issueTestTicket("guardian-a", "민즈", "create");
      clientA.auth.token = createTicket.ticket;
      roomA = await clientA.create("learning_battle", {
        ticketId: createTicket.claims.ticketId,
        ticketIntent: "create",
      });
      const assignmentA = waitForMessage<ColyseusLearningServerMessages["player:assigned"]>(roomA, "player:assigned");
      roomA.send("player:join", {});
      expect(await assignmentA).toMatchObject({ playerId: "player-1" });

      const clientB = new Client(running.endpoint);
      const joinTicket = issueTestTicket("guardian-b", "친구", "join", roomA.roomId);
      clientB.auth.token = joinTicket.ticket;
      roomB = await clientB.joinById(roomA.roomId, {
        ticketId: joinTicket.claims.ticketId,
        ticketIntent: "join",
        roomId: roomA.roomId,
      });
      const assignmentB = waitForMessage<ColyseusLearningServerMessages["player:assigned"]>(roomB, "player:assigned");
      const initialReady = waitForSnapshot(roomA, (snapshot) => snapshot.connectionStatus === "ready");
      roomB.send("player:join", {});
      expect(await assignmentB).toMatchObject({ playerId: "player-2" });
      expect((await initialReady).connectedPlayerIds).toEqual(["player-1", "player-2"]);

      const wrongResolved = waitForMessage<ColyseusLearningServerMessages["answer:resolved"]>(roomB, "answer:resolved");
      roomA.send("answer:submit", {
        playerId: "player-1",
        questionId: "linear-equation-core",
        answer: "19",
        clientSequence: 0,
      });
      expect(await wrongResolved).toMatchObject({ correct: false });

      const sessionA = roomA.sessionId;
      const reconnectTokenA = roomA.reconnectionToken;
      const reconnectingAfterAppSwitch = waitForSnapshot(roomB, (snapshot) => snapshot.connectionStatus === "reconnecting");
      disableAutomaticReconnect(roomA);
      roomA.connection.close();
      expect((await reconnectingAfterAppSwitch).battle.wrongCount).toBe(1);
      const appSwitchStartedAt = Date.now();
      await sleep(30_000);
      const readyAfterAppSwitch = waitForSnapshot(roomB, (snapshot) => snapshot.connectionStatus === "ready");
      roomA = await new Client(running.endpoint).reconnect(reconnectTokenA);
      expect(Date.now() - appSwitchStartedAt).toBeGreaterThanOrEqual(30_000);
      expect(roomA.sessionId).toBe(sessionA);
      expect((await readyAfterAppSwitch).battle.wrongCount).toBe(1);
      const restoredLog = waitForMessage<ColyseusLearningServerMessages["learning:log"]>(
        roomA,
        "learning:log",
        (delivery) => delivery.log.totalAttempts === 1,
      );
      roomA.send("player:join", {});
      expect(await restoredLog).toMatchObject({ log: { totalAttempts: 1, totalHints: 1 } });

      const sessionB = roomB.sessionId;
      const reconnectTokenB = roomB.reconnectionToken;
      const reconnectingAfterNetworkLoss = waitForSnapshot(roomA, (snapshot) => snapshot.connectionStatus === "reconnecting");
      disableAutomaticReconnect(roomB);
      roomB.connection.close();
      await reconnectingAfterNetworkLoss;
      const networkLossStartedAt = Date.now();
      await sleep(20_000);
      const readyAfterNetworkLoss = waitForSnapshot(roomA, (snapshot) => snapshot.connectionStatus === "ready");
      roomB = await new Client(running.endpoint).reconnect(reconnectTokenB);
      expect(Date.now() - networkLossStartedAt).toBeGreaterThanOrEqual(20_000);
      expect(roomB.sessionId).toBe(sessionB);
      expect((await readyAfterNetworkLoss).battle.wrongCount).toBe(1);

      const expiredSessionA = roomA.sessionId;
      const expiredTokenA = roomA.reconnectionToken;
      const reconnectingBeforeExpiry = waitForSnapshot(roomB, (snapshot) => snapshot.connectionStatus === "reconnecting");
      disableAutomaticReconnect(roomA);
      roomA.connection.close();
      await reconnectingBeforeExpiry;
      const expiryStartedAt = Date.now();
      await sleep(65_000);
      await expect(new Client(running.endpoint).reconnect(expiredTokenA)).rejects.toBeTruthy();
      expect(Date.now() - expiryStartedAt).toBeGreaterThanOrEqual(65_000);

      const replacementClient = new Client(running.endpoint);
      const replacementTicket = issueTestTicket("guardian-a", "민즈", "join", roomB.roomId);
      replacementClient.auth.token = replacementTicket.ticket;
      roomA = await replacementClient.joinById(roomB.roomId, {
        ticketId: replacementTicket.claims.ticketId,
        ticketIntent: "join",
        roomId: roomB.roomId,
      });
      expect(roomA.sessionId).not.toBe(expiredSessionA);
      const replacementAssignment = waitForMessage<ColyseusLearningServerMessages["player:assigned"]>(roomA, "player:assigned");
      const replacementLog = waitForMessage<ColyseusLearningServerMessages["learning:log"]>(roomA, "learning:log");
      roomA.send("player:join", {});
      expect(await replacementAssignment).toMatchObject({ playerId: "player-1" });
      expect(await replacementLog).toMatchObject({ log: { totalAttempts: 0, totalHints: 0 } });
    } finally {
      await roomB?.leave(true).catch(() => undefined);
      await roomA?.leave(true).catch(() => undefined);
      await running.stop();
    }
  }, 150_000);
});

function issueTestTicket(
  guardianUid: string,
  displayName: string,
  intent: "create" | "join",
  roomId?: string,
) {
  return issueRoomTicket({
    guardianUid,
    childProfileId: "primary",
    displayName,
    intent,
    ...(roomId ? { roomId } : {}),
  }, ROOM_TICKET_SECRET);
}

function disableAutomaticReconnect(room: Room) {
  room.reconnection.enabled = false;
}

function waitForSnapshot(room: Room, predicate: (snapshot: ColyseusLearningRoomState) => boolean) {
  return waitForMessage<ColyseusLearningRoomState>(room, "battle:snapshot", predicate, 5_000);
}

function waitForMessage<T>(
  room: Room,
  type: string,
  predicate: (payload: T) => boolean = () => true,
  timeoutMs = 5_000,
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

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

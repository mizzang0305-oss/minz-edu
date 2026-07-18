import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyOnlineBattleCommand,
  createOnlineRoom,
  getOnlineRoom,
  heartbeatOnlineRoom,
  joinOnlineRoom,
} from "@/services/online/serverRoom";

const PROJECT_ID = "studymate-ai-v2";
const app = initializeApp({ projectId: PROJECT_ID }, "room-service-tests");
const firestore = getFirestore(app);

async function clearAdminFirestore() {
  const collections = await firestore.listCollections();
  for (const collection of collections) {
    await firestore.recursiveDelete(collection);
  }
}

async function seedChild(guardianUid: string, displayName: string, characterId: string) {
  await firestore
    .collection("guardians")
    .doc(guardianUid)
    .collection("children")
    .doc("primary")
    .set({
      displayName,
      schoolLevel: "elementary",
      grade: 2,
      characterId,
      friendCode: "ABCD2345",
      createdAt: Timestamp.fromMillis(1),
      updatedAt: Timestamp.fromMillis(1),
    });
}

beforeAll(async () => {
  await clearAdminFirestore();
});

beforeEach(async () => {
  await clearAdminFirestore();
  await seedChild("guardian-a", "민즈", "thunder-sword");
  await seedChild("guardian-b", "하람", "fire-mage");
});

afterAll(async () => {
  await clearAdminFirestore();
  await deleteApp(app);
});

describe("online room server authority", () => {
  it("creates a unique room and joins a second guardian", async () => {
    const created = await createOnlineRoom(firestore, "guardian-a", "primary", 1_000);
    expect(created.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(created.players.map((player) => player.displayName)).toEqual(["민즈"]);

    const joined = await joinOnlineRoom(
      firestore,
      "guardian-b",
      "primary",
      created.roomCode,
      2_000,
    );
    expect(joined.status).toBe("ready");
    expect(joined.players.map((player) => player.displayName)).toEqual(["민즈", "하람"]);
    expect(joined.revision).toBe(1);

    const hostView = await getOnlineRoom(firestore, "guardian-a", created.id, 2_000);
    expect(hostView.players).toHaveLength(2);
  });

  it("rejects a third guardian and expired room", async () => {
    await seedChild("guardian-c", "새별", "support-healer");
    const created = await createOnlineRoom(firestore, "guardian-a", "primary", 1_000);
    await joinOnlineRoom(firestore, "guardian-b", "primary", created.roomCode, 2_000);

    await expect(
      joinOnlineRoom(firestore, "guardian-c", "primary", created.roomCode, 3_000),
    ).rejects.toMatchObject({ code: "ROOM_FULL" });

    const expired = await createOnlineRoom(firestore, "guardian-a", "primary", 10_000);
    await expect(
      joinOnlineRoom(firestore, "guardian-b", "primary", expired.roomCode, 10_000 + 31 * 60 * 1000),
    ).rejects.toMatchObject({ code: "ROOM_EXPIRED" });
  });

  it("does not reveal a room to a non-member", async () => {
    const created = await createOnlineRoom(firestore, "guardian-a", "primary");
    await expect(getOnlineRoom(firestore, "guardian-b", created.id)).rejects.toMatchObject({
      code: "NOT_MEMBER",
    });
  });

  it("marks stale players offline and restores them within a new heartbeat", async () => {
    const created = await createOnlineRoom(firestore, "guardian-a", "primary", 1_000);
    await joinOnlineRoom(firestore, "guardian-b", "primary", created.roomCode, 2_000);

    const hostHeartbeat = await heartbeatOnlineRoom(
      firestore,
      "guardian-a",
      created.id,
      62_001,
    );
    expect(hostHeartbeat.players.map((player) => player.connected)).toEqual([true, false]);

    const friendReconnect = await heartbeatOnlineRoom(
      firestore,
      "guardian-b",
      created.id,
      63_000,
    );
    expect(friendReconnect.players.map((player) => player.connected)).toEqual([true, true]);
  });

  it("synchronizes ready, turn answers, hints, and idempotent commands through server revisions", async () => {
    const created = await createOnlineRoom(firestore, "guardian-a", "primary", 1_000);
    const joined = await joinOnlineRoom(firestore, "guardian-b", "primary", created.roomCode, 2_000);

    const hostReady = await applyOnlineBattleCommand(firestore, "guardian-a", created.id, {
      eventId: "ready-host",
      expectedRevision: joined.revision,
      type: "PLAYER_READY",
    }, 3_000);
    expect(hostReady.status).toBe("ready");

    const started = await applyOnlineBattleCommand(firestore, "guardian-b", created.id, {
      eventId: "ready-friend",
      expectedRevision: hostReady.revision,
      type: "PLAYER_READY",
    }, 4_000);
    expect(started).toMatchObject({ status: "battle", activePlayerSlot: 1, bossHp: 150, teamLinkGauge: 0 });
    expect(started.currentQuestion).toMatchObject({ id: "elementary-place-1" });
    expect(started.currentQuestion).not.toHaveProperty("answer");

    const hostAnswer = await applyOnlineBattleCommand(firestore, "guardian-a", created.id, {
      eventId: "answer-host-1",
      expectedRevision: started.revision,
      type: "ANSWER_SUBMIT",
      choice: "50",
    }, 5_000);
    expect(hostAnswer).toMatchObject({ activePlayerSlot: 2, bossHp: 125, teamLinkGauge: 25 });
    expect(hostAnswer.players[0].correctAnswers).toBe(1);
    const storedAnswerCommand = await firestore
      .collection("rooms")
      .doc(created.id)
      .collection("commands")
      .doc("answer-host-1")
      .get();
    expect(storedAnswerCommand.data()).toMatchObject({ type: "ANSWER_SUBMIT", payload: {} });
    expect(storedAnswerCommand.data()).not.toHaveProperty("payload.choice");

    const hint = await applyOnlineBattleCommand(firestore, "guardian-a", created.id, {
      eventId: "hint-host-1",
      expectedRevision: hostAnswer.revision,
      type: "HINT_SEND",
    }, 6_000);
    expect(hint.teamLinkGauge).toBe(30);
    expect(hint.players[0].hintsSent).toBe(1);

    const duplicate = await applyOnlineBattleCommand(firestore, "guardian-a", created.id, {
      eventId: "hint-host-1",
      expectedRevision: hostAnswer.revision,
      type: "HINT_SEND",
    }, 6_500);
    expect(duplicate.revision).toBe(hint.revision);
    expect(duplicate.players[0].hintsSent).toBe(1);

    await expect(applyOnlineBattleCommand(firestore, "guardian-a", created.id, {
      eventId: "out-of-turn",
      expectedRevision: hint.revision,
      type: "ANSWER_SUBMIT",
      choice: "45",
    }, 7_000)).rejects.toMatchObject({ code: "NOT_YOUR_TURN" });
  });

  it("requires both players for the synchronized team special", async () => {
    const created = await createOnlineRoom(firestore, "guardian-a", "primary", 1_000);
    const joined = await joinOnlineRoom(firestore, "guardian-b", "primary", created.roomCode, 2_000);
    const hostReady = await applyOnlineBattleCommand(firestore, "guardian-a", created.id, { eventId: "r1", expectedRevision: joined.revision, type: "PLAYER_READY" }, 3_000);
    let state = await applyOnlineBattleCommand(firestore, "guardian-b", created.id, { eventId: "r2", expectedRevision: hostReady.revision, type: "PLAYER_READY" }, 4_000);
    state = await applyOnlineBattleCommand(firestore, "guardian-a", created.id, { eventId: "a1", expectedRevision: state.revision, type: "ANSWER_SUBMIT", choice: "50" }, 5_000);
    state = await applyOnlineBattleCommand(firestore, "guardian-b", created.id, { eventId: "a2", expectedRevision: state.revision, type: "ANSWER_SUBMIT", choice: "45" }, 6_000);
    state = await applyOnlineBattleCommand(firestore, "guardian-a", created.id, { eventId: "a3", expectedRevision: state.revision, type: "ANSWER_SUBMIT", choice: "2/4" }, 7_000);
    expect(state.teamLinkGauge).toBe(75);

    state = await applyOnlineBattleCommand(firestore, "guardian-a", created.id, { eventId: "s1", expectedRevision: state.revision, type: "SPECIAL_READY" }, 8_000);
    expect(state.players[0].specialReady).toBe(true);
    const special = await applyOnlineBattleCommand(firestore, "guardian-b", created.id, { eventId: "s2", expectedRevision: state.revision, type: "SPECIAL_READY" }, 9_000);
    expect(special).toMatchObject({ status: "battle", bossHp: 25, teamLinkGauge: 0 });
    expect(special.players.every((player) => !player.specialReady)).toBe(true);
  });

  it("rejects presence heartbeats from non-members", async () => {
    const created = await createOnlineRoom(firestore, "guardian-a", "primary");
    await expect(
      heartbeatOnlineRoom(firestore, "guardian-b", created.id),
    ).rejects.toMatchObject({ code: "NOT_MEMBER" });
  });

  it("rejects expired room reads and malformed stored child identity", async () => {
    const created = await createOnlineRoom(firestore, "guardian-a", "primary", 1_000);
    await expect(
      getOnlineRoom(firestore, "guardian-a", created.id, 31 * 60 * 1000),
    ).rejects.toMatchObject({ code: "ROOM_EXPIRED" });

    await firestore
      .collection("guardians")
      .doc("guardian-a")
      .collection("children")
      .doc("primary")
      .update({ characterId: "../admin" });
    await expect(
      createOnlineRoom(firestore, "guardian-a", "primary"),
    ).rejects.toMatchObject({ code: "CHILD_NOT_FOUND" });

    await firestore
      .collection("guardians")
      .doc("guardian-a")
      .collection("children")
      .doc("primary")
      .update({ characterId: "thunder-sword", schoolLevel: "middle", grade: 4 });
    await expect(
      createOnlineRoom(firestore, "guardian-a", "primary"),
    ).rejects.toMatchObject({ code: "CHILD_NOT_FOUND" });
  });
});

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
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
      .update({ characterId: "thunder-sword", schoolLevel: "middle", grade: 2 });
    await expect(
      createOnlineRoom(firestore, "guardian-a", "primary"),
    ).rejects.toMatchObject({ code: "CHILD_NOT_FOUND" });
  });
});

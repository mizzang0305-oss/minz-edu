import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { issueLearningLogReceipt } from "@/services/online/learningLogReceipt";
import {
  deleteAllGuardianLearningLogs,
  deleteGuardianLearningLog,
  LEARNING_LOG_RETENTION_DAYS,
  listGuardianLearningLogs,
  saveGuardianLearningLog,
} from "@/services/online/learningLogStorage";

const app = initializeApp({ projectId: "studymate-ai-v2" }, "learning-log-storage-tests");
const firestore = getFirestore(app);
const SECRET = "learning-log-storage-test-secret-with-32-bytes";

async function clearAdminFirestore() {
  const collections = await firestore.listCollections();
  for (const collection of collections) await firestore.recursiveDelete(collection);
}

async function seedChild() {
  await firestore.collection("guardians").doc("guardian-a").collection("children").doc("primary").set({
    displayName: "민즈",
    createdAt: Timestamp.fromMillis(1),
    updatedAt: Timestamp.fromMillis(1),
  });
}

function claims(revision: number) {
  return issueLearningLogReceipt({
    guardianKey: "g".repeat(43),
    childKey: "c".repeat(43),
    roomId: "room-a",
    playerId: "player-1",
    revision,
    log: {
      roomId: "room-a",
      playerId: "player-1",
      questionLogs: [],
      totalAttempts: 0,
      totalHints: 0,
      totalElapsedMs: 0,
    },
  }, SECRET, 1_000_000).claims;
}

beforeAll(clearAdminFirestore);
beforeEach(async () => {
  await clearAdminFirestore();
  await seedChild();
});
afterAll(async () => {
  await clearAdminFirestore();
  await deleteApp(app);
});

describe("guardian learning-log storage", () => {
  it("stores only the validated log, applies 90-day expiry, and ignores stale revisions", async () => {
    expect(await saveGuardianLearningLog(firestore, "guardian-a", "primary", claims(2), 2_000_000)).toBe("saved");
    expect(await saveGuardianLearningLog(firestore, "guardian-a", "primary", claims(1), 2_000_001)).toBe("unchanged");

    const stored = await firestore.doc("guardians/guardian-a/children/primary/learningLogs/room-a_player-1").get();
    expect(stored.data()).not.toHaveProperty("guardianKey");
    expect(stored.data()).not.toHaveProperty("childKey");
    expect(stored.data()).not.toHaveProperty("receipt");
    expect(stored.data()?.expiresAt.toMillis()).toBe(2_000_000 + LEARNING_LOG_RETENTION_DAYS * 86_400_000);
    expect(await listGuardianLearningLogs(firestore, "guardian-a", "primary", 2_000_001)).toHaveLength(1);
    expect(await listGuardianLearningLogs(
      firestore,
      "guardian-a",
      "primary",
      2_000_000 + LEARNING_LOG_RETENTION_DAYS * 86_400_000,
    )).toEqual([]);
  });

  it("deletes one or all logs only below the selected child", async () => {
    await saveGuardianLearningLog(firestore, "guardian-a", "primary", claims(1), 2_000_000);
    expect(await deleteGuardianLearningLog(firestore, "guardian-a", "primary", "room-a_player-1")).toBe(true);
    expect(await listGuardianLearningLogs(firestore, "guardian-a", "primary")).toEqual([]);
    await saveGuardianLearningLog(firestore, "guardian-a", "primary", claims(2), 2_000_000);
    expect(await deleteAllGuardianLearningLogs(firestore, "guardian-a", "primary")).toBe(true);
    expect(await listGuardianLearningLogs(firestore, "guardian-a", "primary")).toEqual([]);
    expect(await saveGuardianLearningLog(firestore, "guardian-a", "missing", claims(3))).toBe("child-not-found");
  });
});

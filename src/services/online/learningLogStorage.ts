import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { LearningLogReceiptClaims } from "@/services/online/learningLogReceipt";
import type { LearningPlayerSessionLog, StoredLearningLogView } from "@/types/learningBattlePoc";

export const LEARNING_LOG_RETENTION_DAYS = 90;
export const MAX_LEARNING_LOGS_PER_CHILD = 200;
export const LEARNING_LOG_SCHEMA_VERSION = 1;

export async function saveGuardianLearningLog(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
  claims: LearningLogReceiptClaims,
  nowMs = Date.now(),
) {
  const childRef = firestore.collection("guardians").doc(guardianUid).collection("children").doc(childProfileId);
  const logRef = childRef.collection("learningLogs").doc(claims.recordId);
  const now = Timestamp.fromMillis(nowMs);
  const expiresAt = Timestamp.fromMillis(nowMs + LEARNING_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1_000);

  const result = await firestore.runTransaction(async (transaction) => {
    const [child, existing] = await Promise.all([transaction.get(childRef), transaction.get(logRef)]);
    if (!child.exists) return "child-not-found" as const;
    const existingRevision = existing.data()?.revision;
    if (Number.isSafeInteger(existingRevision) && Number(existingRevision) >= claims.revision) {
      return "unchanged" as const;
    }
    transaction.set(logRef, {
      schemaVersion: LEARNING_LOG_SCHEMA_VERSION,
      roomId: claims.roomId,
      playerId: claims.playerId,
      revision: claims.revision,
      log: claims.log,
      createdAt: existing.exists ? existing.data()?.createdAt ?? now : now,
      updatedAt: now,
      expiresAt,
    });
    return "saved" as const;
  });

  if (result === "saved") await pruneOldLearningLogs(firestore, guardianUid, childProfileId);
  return result;
}

export async function listGuardianLearningLogs(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
  nowMs = Date.now(),
) {
  const childRef = firestore.collection("guardians").doc(guardianUid).collection("children").doc(childProfileId);
  if (!(await childRef.get()).exists) return null;
  const snapshot = await childRef.collection("learningLogs")
    .orderBy("updatedAt", "desc")
    .limit(MAX_LEARNING_LOGS_PER_CHILD)
    .get();
  return snapshot.docs.flatMap((document) => {
    const data = document.data();
    if (!(data.updatedAt instanceof Timestamp) || !(data.expiresAt instanceof Timestamp)) return [];
    if (data.expiresAt.toMillis() <= nowMs) return [];
    if (
      data.schemaVersion !== LEARNING_LOG_SCHEMA_VERSION
      || typeof data.roomId !== "string"
      || typeof data.playerId !== "string"
      || !Number.isSafeInteger(data.revision)
      || typeof data.log !== "object"
      || data.log === null
    ) return [];
    return [{
      id: document.id,
      roomId: data.roomId,
      playerId: data.playerId,
      revision: data.revision,
      log: data.log as LearningPlayerSessionLog,
      updatedAt: data.updatedAt.toDate().toISOString(),
      expiresAt: data.expiresAt.toDate().toISOString(),
    } satisfies StoredLearningLogView];
  });
}

export async function deleteGuardianLearningLog(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
  recordId: string,
) {
  const childRef = firestore.collection("guardians").doc(guardianUid).collection("children").doc(childProfileId);
  if (!(await childRef.get()).exists) return false;
  await childRef.collection("learningLogs").doc(recordId).delete();
  return true;
}

export async function deleteAllGuardianLearningLogs(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
) {
  const childRef = firestore.collection("guardians").doc(guardianUid).collection("children").doc(childProfileId);
  if (!(await childRef.get()).exists) return false;
  await firestore.recursiveDelete(childRef.collection("learningLogs"));
  return true;
}

async function pruneOldLearningLogs(firestore: Firestore, guardianUid: string, childProfileId: string) {
  const collection = firestore.collection("guardians").doc(guardianUid)
    .collection("children").doc(childProfileId).collection("learningLogs");
  const overflow = await collection.orderBy("updatedAt", "desc").offset(MAX_LEARNING_LOGS_PER_CHILD).limit(100).get();
  if (overflow.empty) return;
  const batch = firestore.batch();
  overflow.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

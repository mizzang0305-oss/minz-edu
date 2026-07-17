import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  mergeGameSyncSnapshots,
  parseGameSyncSnapshot,
  type GameSyncSnapshot,
} from "@/services/online/gameStateSync";

type GameStateResult = {
  state: GameSyncSnapshot;
  revision: number;
};

function childReference(guardianUid: string, childProfileId: string) {
  return getFirebaseAdminFirestore()
    .collection("guardians")
    .doc(guardianUid)
    .collection("children")
    .doc(childProfileId);
}

function gameStateReference(guardianUid: string, childProfileId: string) {
  return childReference(guardianUid, childProfileId).collection("gameState").doc("current");
}

export async function readGuardianGameState(guardianUid: string, childProfileId: string): Promise<GameStateResult | null> {
  const [child, document] = await Promise.all([
    childReference(guardianUid, childProfileId).get(),
    gameStateReference(guardianUid, childProfileId).get(),
  ]);
  if (!child.exists || !document.exists) return null;
  const state = parseGameSyncSnapshot(document.data()?.state);
  if (!state) return null;
  const revision = document.data()?.revision;
  return { state, revision: Number.isSafeInteger(revision) && revision >= 0 ? revision : 0 };
}

export async function mergeGuardianGameState(
  guardianUid: string,
  childProfileId: string,
  incoming: GameSyncSnapshot,
): Promise<GameStateResult | "missing-child"> {
  const firestore = getFirebaseAdminFirestore();
  const childRef = childReference(guardianUid, childProfileId);
  const stateRef = gameStateReference(guardianUid, childProfileId);

  return firestore.runTransaction(async (transaction) => {
    const [child, existing] = await Promise.all([
      transaction.get(childRef),
      transaction.get(stateRef),
    ]);
    if (!child.exists) return "missing-child" as const;
    const stored = parseGameSyncSnapshot(existing.data()?.state);
    const state = stored ? mergeGameSyncSnapshots(stored, incoming) : incoming;
    const previousRevision = existing.data()?.revision;
    const revision = Number.isSafeInteger(previousRevision) && previousRevision >= 0
      ? previousRevision + 1
      : 1;
    transaction.set(stateRef, {
      schemaVersion: 1,
      revision,
      state,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { state, revision };
  });
}

import { randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { CSRF_COOKIE, isValidCsrfPair } from "@/lib/auth/session";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
import {
  parseChildProfileSyncRequest,
  readChildProfileCsrfToken,
  readSafeStoredFriendCode,
} from "@/services/online/childProfileSync";
import { allowChildProfileMutation } from "@/services/online/roomRateLimit";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const FRIEND_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createFriendCode() {
  return Array.from(
    { length: 8 },
    () => FRIEND_CODE_ALPHABET[randomInt(FRIEND_CODE_ALPHABET.length)],
  ).join("");
}

export async function POST(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStoreHeaders });
  }

  const bodyResult = await readLimitedJsonBody(request, 2_048);
  if (!bodyResult.ok) {
    return Response.json(
      { error: bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "잘못된 요청입니다." },
      { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders },
    );
  }
  const body = bodyResult.value;

  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, readChildProfileCsrfToken(body))) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }

  const input = parseChildProfileSyncRequest(body);
  if (!input) {
    return Response.json({ error: "자녀 프로필 정보가 올바르지 않습니다." }, { status: 400, headers: noStoreHeaders });
  }
  if (!allowChildProfileMutation(guardian.uid)) {
    return Response.json({ error: "요청이 너무 빠릅니다." }, { status: 429, headers: noStoreHeaders });
  }

  try {
    const firestore = getFirebaseAdminFirestore();
    const guardianRef = firestore.collection("guardians").doc(guardian.uid);
    const childRef = guardianRef.collection("children").doc("primary");
    const child = await firestore.runTransaction(async (transaction) => {
      const existing = await transaction.get(childRef);
      const friendCode = readSafeStoredFriendCode(existing.data()?.friendCode) ?? createFriendCode();
      const profile = {
        displayName: input.displayName,
        schoolLevel: input.schoolLevel,
        grade: input.grade,
        characterId: input.characterId,
        friendCode,
        updatedAt: FieldValue.serverTimestamp(),
        ...(!existing.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
      };
      transaction.set(childRef, profile, { merge: true });
      transaction.set(
        guardianRef,
        {
          displayName: guardian.displayName,
          childProfileIds: FieldValue.arrayUnion("primary"),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return {
        id: "primary",
        displayName: input.displayName,
        schoolLevel: input.schoolLevel,
        grade: input.grade,
        characterId: input.characterId,
        friendCode,
      };
    });

    return Response.json({ child }, { headers: noStoreHeaders });
  } catch {
    return Response.json(
      { error: "자녀 프로필을 동기화하지 못했습니다." },
      { status: 503, headers: noStoreHeaders },
    );
  }
}

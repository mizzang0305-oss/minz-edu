import { cookies } from "next/headers";
import { CSRF_COOKIE, isValidCsrfPair } from "@/lib/auth/session";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  LearningLogReceiptError,
  verifyLearningLogReceipt,
} from "@/services/online/learningLogReceipt";
import {
  deleteAllGuardianLearningLogs,
  deleteGuardianLearningLog,
  listGuardianLearningLogs,
  saveGuardianLearningLog,
} from "@/services/online/learningLogStorage";
import { allowLearningLogMutation } from "@/services/online/roomRateLimit";
import {
  deriveChildKey,
  deriveGuardianKey,
  opaqueKeysEqual,
  readRoomTicketSecret,
} from "@/services/online/roomTicket";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export async function GET(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) return jsonError("로그인이 필요합니다.", 401);
  const childProfileId = new URL(request.url).searchParams.get("childProfileId");
  if (!childProfileId || !ID_PATTERN.test(childProfileId)) return jsonError("자녀 프로필 정보가 올바르지 않습니다.", 400);

  try {
    const logs = await listGuardianLearningLogs(
      getFirebaseAdminFirestore(),
      guardian.uid,
      childProfileId,
    );
    if (logs === null) return jsonError("자녀 프로필을 찾을 수 없습니다.", 404);
    return Response.json({ logs }, { headers: noStoreHeaders });
  } catch {
    return jsonError("학습 로그를 불러오지 못했습니다.", 503);
  }
}

export async function POST(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) return jsonError("로그인이 필요합니다.", 401);
  const bodyResult = await readLimitedJsonBody(request, 100_000);
  if (!bodyResult.ok) return jsonError(bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "잘못된 요청입니다.", bodyResult.error === "too_large" ? 413 : 400);
  const body = bodyResult.value;
  if (!hasOnlyKeys(body, ["childProfileId", "csrfToken", "receipt"])) return jsonError("학습 로그 요청 형식이 올바르지 않습니다.", 400);
  if (!await hasValidCsrf(body.csrfToken)) return jsonError("보안 확인에 실패했습니다.", 403);
  if (typeof body.childProfileId !== "string" || !ID_PATTERN.test(body.childProfileId) || typeof body.receipt !== "string") {
    return jsonError("학습 로그 요청 형식이 올바르지 않습니다.", 400);
  }
  if (!allowLearningLogMutation(guardian.uid)) return jsonError("요청이 너무 잦습니다.", 429);

  try {
    const secret = readRoomTicketSecret();
    const claims = verifyLearningLogReceipt(body.receipt, secret);
    const expectedGuardianKey = deriveGuardianKey(secret, guardian.uid);
    const expectedChildKey = deriveChildKey(secret, guardian.uid, body.childProfileId);
    if (!opaqueKeysEqual(claims.guardianKey, expectedGuardianKey) || !opaqueKeysEqual(claims.childKey, expectedChildKey)) {
      return jsonError("이 학습 로그를 저장할 권한이 없습니다.", 403);
    }
    const result = await saveGuardianLearningLog(
      getFirebaseAdminFirestore(),
      guardian.uid,
      body.childProfileId,
      claims,
    );
    if (result === "child-not-found") return jsonError("자녀 프로필을 찾을 수 없습니다.", 404);
    return Response.json({ saved: result === "saved", revision: claims.revision }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof LearningLogReceiptError) return jsonError("학습 로그 서명을 확인할 수 없습니다.", 400);
    return jsonError("학습 로그를 저장하지 못했습니다.", 503);
  }
}

export async function DELETE(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) return jsonError("로그인이 필요합니다.", 401);
  const bodyResult = await readLimitedJsonBody(request, 1_024);
  if (!bodyResult.ok) return jsonError(bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "잘못된 요청입니다.", bodyResult.error === "too_large" ? 413 : 400);
  const body = bodyResult.value;
  if (!hasOnlyKeys(body, ["childProfileId", "csrfToken", "recordId", "all"])) return jsonError("삭제 요청 형식이 올바르지 않습니다.", 400);
  if (!await hasValidCsrf(body.csrfToken)) return jsonError("보안 확인에 실패했습니다.", 403);
  if (typeof body.childProfileId !== "string" || !ID_PATTERN.test(body.childProfileId)) return jsonError("자녀 프로필 정보가 올바르지 않습니다.", 400);
  const deleteAll = body.all === true && body.recordId === undefined;
  const recordId = typeof body.recordId === "string" && ID_PATTERN.test(body.recordId) && body.all === undefined
    ? body.recordId
    : null;
  if (!deleteAll && !recordId) return jsonError("삭제 대상을 하나만 지정해야 합니다.", 400);
  if (!allowLearningLogMutation(guardian.uid)) return jsonError("요청이 너무 잦습니다.", 429);

  try {
    const firestore = getFirebaseAdminFirestore();
    const found = deleteAll
      ? await deleteAllGuardianLearningLogs(firestore, guardian.uid, body.childProfileId)
      : await deleteGuardianLearningLog(firestore, guardian.uid, body.childProfileId, recordId!);
    if (!found) return jsonError("자녀 프로필을 찾을 수 없습니다.", 404);
    return Response.json({ deleted: true, all: deleteAll }, { headers: noStoreHeaders });
  } catch {
    return jsonError("학습 로그를 삭제하지 못했습니다.", 503);
  }
}

async function hasValidCsrf(value: unknown) {
  if (typeof value !== "string") return false;
  const cookieStore = await cookies();
  return isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: noStoreHeaders });
}

import { cookies } from "next/headers";
import { CSRF_COOKIE, isValidCsrfPair } from "@/lib/auth/session";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { createOnlineRoom, RoomServiceError } from "@/services/online/serverRoom";
import { allowRoomMutation } from "@/services/online/roomRateLimit";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";

export const dynamic = "force-dynamic";
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStoreHeaders });
  const bodyResult = await readLimitedJsonBody(request, 1_024);
  if (!bodyResult.ok) {
    return Response.json(
      { error: bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "잘못된 요청입니다." },
      { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders },
    );
  }
  const body = bodyResult.value as { childProfileId?: unknown; csrfToken?: unknown };

  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, body.csrfToken)) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }
  if (body.childProfileId !== "primary") {
    return Response.json({ error: "자녀 프로필이 올바르지 않습니다." }, { status: 400, headers: noStoreHeaders });
  }
  if (!allowRoomMutation(guardian.uid)) {
    return Response.json({ error: "요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: noStoreHeaders });
  }

  try {
    const room = await createOnlineRoom(getFirebaseAdminFirestore(), guardian.uid, "primary");
    return Response.json({ room }, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    const status = error instanceof RoomServiceError && error.code === "CHILD_NOT_FOUND" ? 409 : 503;
    return Response.json(
      { error: status === 409 ? "먼저 자녀 프로필을 동기화해 주세요." : "친구 방을 만들지 못했습니다." },
      { status, headers: noStoreHeaders },
    );
  }
}

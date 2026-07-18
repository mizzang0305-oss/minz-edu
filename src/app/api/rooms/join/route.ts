import { cookies } from "next/headers";
import { CSRF_COOKIE, isValidCsrfPair } from "@/lib/auth/session";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { isValidRoomCode } from "@/services/online/roomCode";
import { joinOnlineRoom, RoomServiceError } from "@/services/online/serverRoom";
import { allowRoomMutation } from "@/services/online/roomRateLimit";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
import { isValidChildProfileId } from "@/services/online/childProfileSync";

export const dynamic = "force-dynamic";
const noStoreHeaders = { "Cache-Control": "no-store" };

const errorStatus: Record<RoomServiceError["code"], number> = {
  CHILD_NOT_FOUND: 409,
  ROOM_NOT_FOUND: 404,
  ROOM_EXPIRED: 410,
  ROOM_FULL: 409,
  ROOM_CLOSED: 409,
  NOT_MEMBER: 403,
  CODE_COLLISION: 503,
  REVISION_CONFLICT: 409,
  INVALID_ACTION: 409,
  NOT_YOUR_TURN: 409,
  BATTLE_NOT_READY: 409,
};

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
  const body = bodyResult.value as { childProfileId?: unknown; roomCode?: unknown; csrfToken?: unknown };

  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, body.csrfToken)) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }
  if (!isValidChildProfileId(body.childProfileId) || typeof body.roomCode !== "string" || !isValidRoomCode(body.roomCode)) {
    return Response.json({ error: "6자리 참가 코드를 확인해 주세요." }, { status: 400, headers: noStoreHeaders });
  }
  if (!allowRoomMutation(guardian.uid)) {
    return Response.json({ error: "요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: noStoreHeaders });
  }

  try {
    const room = await joinOnlineRoom(
      getFirebaseAdminFirestore(),
      guardian.uid,
      body.childProfileId,
      body.roomCode,
    );
    return Response.json({ room }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      const messages: Record<RoomServiceError["code"], string> = {
        CHILD_NOT_FOUND: "먼저 자녀 프로필을 동기화해 주세요.",
        ROOM_NOT_FOUND: "참가 코드를 찾지 못했습니다.",
        ROOM_EXPIRED: "이 친구 방은 시간이 지나 닫혔습니다.",
        ROOM_FULL: "이미 두 명이 참가한 방입니다.",
        ROOM_CLOSED: "이미 모험이 시작된 방입니다.",
        NOT_MEMBER: "이 방을 볼 권한이 없습니다.",
        CODE_COLLISION: "잠시 후 다시 시도해 주세요.",
        REVISION_CONFLICT: "친구 방 상태가 바뀌었습니다. 다시 시도해 주세요.",
        INVALID_ACTION: "지금은 이 행동을 할 수 없습니다.",
        NOT_YOUR_TURN: "친구의 차례가 끝날 때까지 기다려 주세요.",
        BATTLE_NOT_READY: "두 용사가 준비된 뒤 시작할 수 있습니다.",
      };
      return Response.json({ error: messages[error.code] }, { status: errorStatus[error.code], headers: noStoreHeaders });
    }
    return Response.json({ error: "친구 방에 참가하지 못했습니다." }, { status: 503, headers: noStoreHeaders });
  }
}

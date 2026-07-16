import { getGuardianSession } from "@/lib/auth/guardianSession";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getOnlineRoom, RoomServiceError } from "@/services/online/serverRoom";

export const dynamic = "force-dynamic";
const noStoreHeaders = { "Cache-Control": "no-store" };
const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function statusForRoomError(error: unknown) {
  if (!(error instanceof RoomServiceError)) return 503;
  if (error.code === "NOT_MEMBER") return 403;
  if (error.code === "ROOM_EXPIRED") return 410;
  if (error.code === "ROOM_CLOSED") return 409;
  if (error.code === "ROOM_NOT_FOUND") return 404;
  return 503;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const guardian = await getGuardianSession();
  if (!guardian) return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStoreHeaders });
  const { roomId } = await context.params;
  if (!ROOM_ID_PATTERN.test(roomId)) {
    return Response.json({ error: "방 정보가 올바르지 않습니다." }, { status: 400, headers: noStoreHeaders });
  }

  try {
    const room = await getOnlineRoom(getFirebaseAdminFirestore(), guardian.uid, roomId);
    return Response.json({ room }, { headers: noStoreHeaders });
  } catch (error) {
    const status = statusForRoomError(error);
    const message = status === 403
      ? "이 방을 볼 권한이 없습니다."
      : status === 410
        ? "이 친구 방은 시간이 지나 닫혔습니다."
        : status === 409
          ? "이미 닫힌 친구 방입니다."
          : status === 404
            ? "친구 방을 찾지 못했습니다."
            : "친구 방을 확인하지 못했습니다.";
    return Response.json(
      { error: message },
      { status, headers: noStoreHeaders },
    );
  }
}

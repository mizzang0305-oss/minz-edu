import { cookies } from "next/headers";
import { CSRF_COOKIE, isValidCsrfPair } from "@/lib/auth/session";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  applyOnlineBattleCommand,
  ONLINE_BATTLE_COMMAND_TYPES,
  RoomServiceError,
  type OnlineBattleCommand,
  type OnlineBattleCommandType,
} from "@/services/online/serverRoom";
import { allowGameStateMutation } from "@/services/online/roomRateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };
const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCommandType(value: unknown): value is OnlineBattleCommandType {
  return typeof value === "string" && ONLINE_BATTLE_COMMAND_TYPES.some((type) => type === value);
}

function parseCommand(value: unknown): (OnlineBattleCommand & { csrfToken: string }) | null {
  if (!isRecord(value) || !Object.keys(value).every((key) => ["csrfToken", "eventId", "expectedRevision", "type", "choice"].includes(key))) return null;
  if (typeof value.csrfToken !== "string" || value.csrfToken.length < 1) return null;
  if (typeof value.eventId !== "string" || !EVENT_ID_PATTERN.test(value.eventId)) return null;
  if (!Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0 || Number(value.expectedRevision) > 1_000_000) return null;
  if (!isCommandType(value.type)) return null;
  if (value.type === "ANSWER_SUBMIT") {
    if (typeof value.choice !== "string" || value.choice.length < 1 || value.choice.length > 100 || CONTROL_CHARACTER_PATTERN.test(value.choice)) return null;
  } else if (value.choice !== undefined) {
    return null;
  }
  return {
    csrfToken: value.csrfToken,
    eventId: value.eventId,
    expectedRevision: Number(value.expectedRevision),
    type: value.type,
    ...(typeof value.choice === "string" ? { choice: value.choice } : {}),
  };
}

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

const errorMessage: Record<RoomServiceError["code"], string> = {
  CHILD_NOT_FOUND: "자녀 프로필을 확인하지 못했습니다.",
  ROOM_NOT_FOUND: "친구 방을 찾지 못했습니다.",
  ROOM_EXPIRED: "이 친구 방은 시간이 지나 닫혔습니다.",
  ROOM_FULL: "이미 두 명이 참가한 방입니다.",
  ROOM_CLOSED: "이미 닫힌 친구 방입니다.",
  NOT_MEMBER: "이 방의 참가자가 아닙니다.",
  CODE_COLLISION: "잠시 후 다시 시도해 주세요.",
  REVISION_CONFLICT: "친구의 최신 행동을 반영했습니다. 다시 눌러 주세요.",
  INVALID_ACTION: "지금은 이 행동을 할 수 없습니다.",
  NOT_YOUR_TURN: "친구의 차례가 끝날 때까지 기다려 주세요.",
  BATTLE_NOT_READY: "두 용사가 준비된 뒤 팀전을 시작할 수 있습니다.",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const guardian = await getGuardianSession();
  if (!guardian) return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStoreHeaders });
  const { roomId } = await context.params;
  if (!ROOM_ID_PATTERN.test(roomId)) {
    return Response.json({ error: "방 정보가 올바르지 않습니다." }, { status: 400, headers: noStoreHeaders });
  }

  const bodyResult = await readLimitedJsonBody(request, 2_048);
  if (!bodyResult.ok) {
    return Response.json(
      { error: bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "잘못된 요청입니다." },
      { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders },
    );
  }
  const command = parseCommand(bodyResult.value);
  if (!command) return Response.json({ error: "팀전 행동 형식이 올바르지 않습니다." }, { status: 400, headers: noStoreHeaders });

  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, command.csrfToken)) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }
  if (!allowGameStateMutation(guardian.uid)) {
    return Response.json({ error: "팀전 행동이 너무 빠릅니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: noStoreHeaders });
  }

  try {
    const room = await applyOnlineBattleCommand(
      getFirebaseAdminFirestore(),
      guardian.uid,
      roomId,
      command,
    );
    return Response.json({ room }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      return Response.json({ error: errorMessage[error.code] }, { status: errorStatus[error.code], headers: noStoreHeaders });
    }
    return Response.json({ error: "팀전 상태를 동기화하지 못했습니다." }, { status: 503, headers: noStoreHeaders });
  }
}

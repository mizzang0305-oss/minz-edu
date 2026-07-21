import { cookies } from "next/headers";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { CSRF_COOKIE, isValidCsrfPair } from "@/lib/auth/session";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { isValidChildProfileId, readSafeStoredChildProfile } from "@/services/online/childProfileSync";
import { allowRoomTicketIssue } from "@/services/online/roomRateLimit";
import {
  issueRoomTicket,
  readRoomTicketSecret,
  RoomTicketError,
  type RoomTicketIntent,
} from "@/services/online/roomTicket";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) {
    return Response.json({ error: "보호자 로그인이 필요합니다." }, { status: 401, headers: noStoreHeaders });
  }

  const bodyResult = await readLimitedJsonBody(request, 2_048);
  if (!bodyResult.ok) {
    return Response.json(
      { error: bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "올바르지 않은 요청입니다." },
      { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders },
    );
  }
  const input = parseRoomTicketRequest(bodyResult.value);
  if (!input) {
    return Response.json({ error: "방 참가 요청을 확인해 주세요." }, { status: 400, headers: noStoreHeaders });
  }

  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, input.csrfToken)) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }
  if (!allowRoomTicketIssue(guardian.uid)) {
    return Response.json({ error: "방 연결 요청이 너무 빠릅니다." }, { status: 429, headers: noStoreHeaders });
  }

  try {
    const childSnapshot = await getFirebaseAdminFirestore()
      .collection("guardians")
      .doc(guardian.uid)
      .collection("children")
      .doc(input.childProfileId)
      .get();
    const child = childSnapshot.exists
      ? readSafeStoredChildProfile(input.childProfileId, childSnapshot.data())
      : null;
    if (!child) {
      return Response.json({ error: "선택한 자녀 프로필을 확인할 수 없습니다." }, { status: 404, headers: noStoreHeaders });
    }

    const issued = issueRoomTicket({
      guardianUid: guardian.uid,
      childProfileId: child.id,
      displayName: child.displayName,
      intent: input.intent,
      ...(input.roomId ? { roomId: input.roomId } : {}),
    }, readRoomTicketSecret());
    return Response.json({
      ticket: issued.ticket,
      ticketId: issued.claims.ticketId,
      expiresAt: issued.claims.expiresAt,
      displayName: child.displayName,
    }, { headers: noStoreHeaders });
  } catch (error) {
    const code = error instanceof RoomTicketError ? error.code : "UNAVAILABLE";
    console.warn("colyseus_room_ticket_issue_failed", { code });
    return Response.json(
      { error: code === "CONFIG" ? "온라인 방 보안 설정이 아직 준비되지 않았습니다." : "방 연결권을 만들지 못했습니다." },
      { status: 503, headers: noStoreHeaders },
    );
  }
}

type ParsedRoomTicketRequest = {
  childProfileId: string;
  csrfToken: string;
  intent: RoomTicketIntent;
  roomId?: string;
};

function parseRoomTicketRequest(value: unknown): ParsedRoomTicketRequest | null {
  if (!isRecord(value) || !Object.keys(value).every((key) => ["childProfileId", "csrfToken", "intent", "roomId"].includes(key))) {
    return null;
  }
  if (
    !isValidChildProfileId(value.childProfileId)
    || typeof value.csrfToken !== "string"
    || value.csrfToken.length < 1
    || (value.intent !== "create" && value.intent !== "join")
  ) {
    return null;
  }
  if (value.intent === "create" && value.roomId !== undefined) return null;
  if (value.intent === "join" && (typeof value.roomId !== "string" || !ROOM_ID_PATTERN.test(value.roomId))) return null;
  return {
    childProfileId: value.childProfileId,
    csrfToken: value.csrfToken,
    intent: value.intent,
    ...(typeof value.roomId === "string" ? { roomId: value.roomId } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

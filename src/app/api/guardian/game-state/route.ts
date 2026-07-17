import { cookies } from "next/headers";
import { mergeGuardianGameState, readGuardianGameState } from "@/data/gameState";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { CSRF_COOKIE, isValidCsrfPair } from "@/lib/auth/session";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
import {
  parseGameStateSyncRequest,
  readGameStateSyncCsrfToken,
} from "@/services/online/gameStateSync";
import { allowGameStateMutation } from "@/services/online/roomRateLimit";
import { isValidChildProfileId } from "@/services/online/childProfileSync";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStoreHeaders });
  }
  const childProfileId = new URL(request.url).searchParams.get("childProfileId") ?? "primary";
  if (!isValidChildProfileId(childProfileId)) {
    return Response.json({ error: "자녀 프로필이 올바르지 않습니다." }, { status: 400, headers: noStoreHeaders });
  }
  try {
    const result = await readGuardianGameState(guardian.uid, childProfileId);
    if (!result) {
      return Response.json({ error: "동기화된 게임 기록이 없습니다." }, { status: 404, headers: noStoreHeaders });
    }
    return Response.json(result, { headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "게임 기록을 불러오지 못했습니다." }, { status: 503, headers: noStoreHeaders });
  }
}

export async function PUT(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStoreHeaders });
  }
  const bodyResult = await readLimitedJsonBody(request, 512 * 1_024);
  if (!bodyResult.ok) {
    return Response.json(
      { error: bodyResult.error === "too_large" ? "동기화 기록이 너무 큽니다." : "잘못된 요청입니다." },
      { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders },
    );
  }
  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, readGameStateSyncCsrfToken(bodyResult.value))) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }
  const input = parseGameStateSyncRequest(bodyResult.value);
  if (!input) {
    return Response.json({ error: "게임 기록 형식이 올바르지 않습니다." }, { status: 400, headers: noStoreHeaders });
  }
  if (!allowGameStateMutation(guardian.uid)) {
    return Response.json({ error: "동기화 요청이 너무 빠릅니다." }, { status: 429, headers: noStoreHeaders });
  }
  try {
    const result = await mergeGuardianGameState(guardian.uid, input.childProfileId, input.state);
    if (result === "missing-child") {
      return Response.json({ error: "자녀 프로필을 먼저 저장해 주세요." }, { status: 409, headers: noStoreHeaders });
    }
    return Response.json(result, { headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "게임 기록을 동기화하지 못했습니다." }, { status: 503, headers: noStoreHeaders });
  }
}

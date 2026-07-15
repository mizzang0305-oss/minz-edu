import { cookies } from "next/headers";
import { CSRF_COOKIE, isValidCsrfPair, SESSION_COOKIE } from "@/lib/auth/session";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
import { getFirebaseAdminAuth, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { allowGuardianAuthMutation } from "@/services/online/roomRateLimit";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!hasFirebaseAdminConfig()) {
    return Response.json(
      { error: "온라인 계정 서버가 아직 설정되지 않았습니다." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const bodyResult = await readLimitedJsonBody(request, 1_024);
  if (!bodyResult.ok) {
    return Response.json(
      { error: bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "잘못된 요청입니다." },
      { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders },
    );
  }

  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, bodyResult.value.csrfToken)) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStoreHeaders });
  }

  try {
    const adminAuth = getFirebaseAdminAuth();
    const session = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!allowGuardianAuthMutation(session.uid)) {
      return Response.json({ error: "요청이 너무 빠릅니다." }, { status: 429, headers: noStoreHeaders });
    }
    const customToken = await adminAuth.createCustomToken(session.uid);
    return Response.json({ customToken }, { headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "로그인 세션이 만료되었습니다." }, { status: 401, headers: noStoreHeaders });
  }
}

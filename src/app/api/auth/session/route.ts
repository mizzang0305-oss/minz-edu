import { cookies } from "next/headers";
import {
  CSRF_COOKIE,
  isRecentSignIn,
  isValidCsrfPair,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import { getFirebaseAdminAuth, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
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

  const bodyResult = await readLimitedJsonBody(request, 12_000);
  if (!bodyResult.ok) {
    return Response.json(
      { error: bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "잘못된 요청입니다." },
      { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders },
    );
  }
  const body = bodyResult.value as { idToken?: unknown; csrfToken?: unknown };

  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, body.csrfToken)) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }
  if (typeof body.idToken !== "string" || body.idToken.length > 10_000) {
    return Response.json({ error: "로그인 정보가 올바르지 않습니다." }, { status: 400, headers: noStoreHeaders });
  }

  try {
    const adminAuth = getFirebaseAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(body.idToken);
    if (!isRecentSignIn(decodedToken.auth_time)) {
      return Response.json({ error: "Google 로그인을 다시 시도해 주세요." }, { status: 401, headers: noStoreHeaders });
    }
    if (!allowGuardianAuthMutation(decodedToken.uid)) {
      return Response.json({ error: "요청이 너무 빠릅니다." }, { status: 429, headers: noStoreHeaders });
    }

    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      priority: "high",
    });
    cookieStore.delete(CSRF_COOKIE);

    return Response.json({ ok: true }, { headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "Google 로그인 확인에 실패했습니다." }, { status: 401, headers: noStoreHeaders });
  }
}

export async function DELETE(request: Request) {
  const bodyResult = await readLimitedJsonBody(request, 1_024);
  if (!bodyResult.ok) {
    return Response.json(
      { error: bodyResult.error === "too_large" ? "요청이 너무 큽니다." : "잘못된 요청입니다." },
      { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders },
    );
  }
  const body = bodyResult.value as { csrfToken?: unknown };

  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, body.csrfToken)) {
    return Response.json({ error: "보안 확인에 실패했습니다." }, { status: 403, headers: noStoreHeaders });
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
  return Response.json({ ok: true }, { headers: noStoreHeaders });
}

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { CSRF_COOKIE, isValidCsrfPair } from "@/lib/auth/session";
import { readLimitedJsonBody } from "@/lib/auth/safeRequest";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { readSafeStoredChildProfile } from "@/services/online/childProfileSync";
import { allowParentReportDelivery } from "@/services/online/roomRateLimit";
import {
  buildParentSessionReportEmail,
  parseParentSessionReportRequest,
  readParentSessionReportCsrfToken,
} from "@/services/reports/parentSessionReport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

function readEmailConfiguration() {
  const enabled = process.env.PARENT_REPORT_EMAIL_ENABLED?.trim() === "true";
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.PARENT_REPORT_FROM_EMAIL?.trim() ?? "";
  if (!enabled || apiKey.length < 10 || from.length < 3 || from.length > 200 || /[\r\n]/.test(from)) return null;
  return { apiKey, from };
}

export async function POST(request: Request) {
  const guardian = await getGuardianSession();
  if (!guardian) {
    return Response.json({ error: "보호자 로그인이 필요합니다.", code: "REPORT_AUTH_REQUIRED" }, { status: 401, headers: noStoreHeaders });
  }
  if (!guardian.email) {
    return Response.json({ error: "보호자 계정에 이메일 주소가 없습니다.", code: "REPORT_EMAIL_MISSING" }, { status: 409, headers: noStoreHeaders });
  }

  const bodyResult = await readLimitedJsonBody(request, 12 * 1_024);
  if (!bodyResult.ok) {
    return Response.json({ error: bodyResult.error === "too_large" ? "학습 요약이 너무 큽니다." : "잘못된 요청입니다.", code: "REPORT_REQUEST_INVALID" }, { status: bodyResult.error === "too_large" ? 413 : 400, headers: noStoreHeaders });
  }
  const cookieStore = await cookies();
  if (!isValidCsrfPair(cookieStore.get(CSRF_COOKIE)?.value, readParentSessionReportCsrfToken(bodyResult.value))) {
    return Response.json({ error: "보안 확인에 실패했습니다.", code: "REPORT_CSRF_REJECTED" }, { status: 403, headers: noStoreHeaders });
  }
  const input = parseParentSessionReportRequest(bodyResult.value);
  if (!input) {
    return Response.json({ error: "학습 요약 형식이 올바르지 않습니다.", code: "REPORT_SHAPE_INVALID" }, { status: 400, headers: noStoreHeaders });
  }

  const configuration = readEmailConfiguration();
  if (!configuration) {
    return Response.json({ error: "부모 리포트 메일 설정이 필요합니다.", code: "EMAIL_NOT_CONFIGURED" }, { status: 503, headers: noStoreHeaders });
  }
  if (!allowParentReportDelivery(guardian.uid)) {
    return Response.json({ error: "메일 요청이 너무 빠릅니다. 잠시 후 자동으로 다시 시도합니다.", code: "REPORT_RATE_LIMITED" }, { status: 429, headers: noStoreHeaders });
  }

  try {
    const childDocument = await getFirebaseAdminFirestore()
      .collection("guardians")
      .doc(guardian.uid)
      .collection("children")
      .doc(input.childProfileId)
      .get();
    const child = childDocument.exists ? readSafeStoredChildProfile(childDocument.id, childDocument.data()) : null;
    if (!child) {
      return Response.json({ error: "자녀 프로필을 먼저 동기화해 주세요.", code: "REPORT_CHILD_NOT_FOUND" }, { status: 409, headers: noStoreHeaders });
    }

    const email = buildParentSessionReportEmail(input, child.displayName);
    const idempotencyKey = createHash("sha256")
      .update(`${guardian.uid}:${input.childProfileId}:${input.report.id}`)
      .digest("hex");
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: configuration.from,
        to: [guardian.email],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!providerResponse.ok) {
      console.warn("parent_report_provider_rejected", { status: providerResponse.status });
      return Response.json({ error: "학습 요약 메일을 보내지 못했습니다.", code: "EMAIL_PROVIDER_REJECTED" }, { status: 502, headers: noStoreHeaders });
    }
    const deliveredAt = new Date().toISOString();
    return Response.json({ sent: true, reportId: input.report.id, deliveredAt }, { headers: noStoreHeaders });
  } catch (error) {
    console.warn("parent_report_delivery_failed", { code: error instanceof DOMException && error.name === "TimeoutError" ? "TIMEOUT" : "UNAVAILABLE" });
    return Response.json({ error: "학습 요약 메일 연결을 사용할 수 없습니다.", code: "EMAIL_DELIVERY_UNAVAILABLE" }, { status: 503, headers: noStoreHeaders });
  }
}

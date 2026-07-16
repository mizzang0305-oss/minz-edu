import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { CSRF_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE)?.value;
  const token = existingToken && /^[a-f0-9]{64}$/.test(existingToken)
    ? existingToken
    : randomBytes(32).toString("hex");

  if (token !== existingToken) {
    cookieStore.set(CSRF_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
      priority: "high",
    });
  }

  return Response.json(
    { csrfToken: token },
    { headers: { "Cache-Control": "no-store" } },
  );
}

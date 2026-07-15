import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./session";
import { getFirebaseAdminAuth, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

export type GuardianSession = {
  uid: string;
  displayName: string;
  email: string;
};

export async function getGuardianSession(): Promise<GuardianSession | null> {
  if (!hasFirebaseAdminConfig()) return null;
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      displayName:
        typeof decoded.name === "string" && decoded.name.trim()
          ? decoded.name
          : "보호자",
      email: typeof decoded.email === "string" ? decoded.email : "",
    };
  } catch {
    return null;
  }
}

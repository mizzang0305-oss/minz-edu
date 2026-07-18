import type { FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

export type FirebaseAppCheckBootstrapStatus =
  | "initialized"
  | "skipped-server"
  | "skipped-emulator"
  | "skipped-unconfigured"
  | "failed-open";

const bootstrapStatusByAppName = new Map<
  string,
  Extract<FirebaseAppCheckBootstrapStatus, "initialized" | "failed-open">
>();

function readSiteKey() {
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim();
  return siteKey && siteKey !== "replace-me" ? siteKey : null;
}

function isAlreadyInitialized(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "appCheck/already-initialized"
  );
}

function safeErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "unknown";
}

/**
 * Starts Firebase App Check attestation before Auth or Firestore is created.
 *
 * Request rejection is controlled separately in Firebase Console. During the
 * monitoring rollout this initializer deliberately fails open so a provider
 * outage cannot block guardian sign-in or an active room.
 */
export function bootstrapFirebaseAppCheckMonitoring(
  app: FirebaseApp,
): FirebaseAppCheckBootstrapStatus {
  if (typeof window === "undefined") return "skipped-server";
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    return "skipped-emulator";
  }

  const siteKey = readSiteKey();
  if (!siteKey) return "skipped-unconfigured";
  const previousStatus = bootstrapStatusByAppName.get(app.name);
  if (previousStatus) return previousStatus;

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    bootstrapStatusByAppName.set(app.name, "initialized");
    return "initialized";
  } catch (error) {
    // Next.js Fast Refresh can reload this module while the Firebase app keeps
    // its App Check instance. Treat that known state as initialized.
    if (isAlreadyInitialized(error)) {
      bootstrapStatusByAppName.set(app.name, "initialized");
      return "initialized";
    }

    console.warn(
      "[firebase-app-check] Attestation initialization failed; continuing in monitoring fail-open mode.",
      { code: safeErrorCode(error) },
    );
    bootstrapStatusByAppName.set(app.name, "failed-open");
    return "failed-open";
  }
}

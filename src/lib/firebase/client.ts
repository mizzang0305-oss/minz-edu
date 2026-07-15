import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserSessionPersistence,
  inMemoryPersistence,
  setPersistence,
  signInWithCustomToken,
} from "firebase/auth";

type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

function readPublicConfig(): FirebasePublicConfig | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (Object.values(config).some((value) => !value || value === "replace-me")) {
    return null;
  }

  return config as FirebasePublicConfig;
}

export function getFirebaseClientApp() {
  const config = readPublicConfig();
  if (!config) {
    throw new Error("Firebase public configuration is missing.");
  }
  return getApps().length ? getApp() : initializeApp(config);
}

export function hasFirebasePublicConfig() {
  return readPublicConfig() !== null;
}

export async function getGuardianGoogleAuth(redirectFlow = false) {
  const app = getFirebaseClientApp();
  const auth = getAuth(app);

  // Popup login stays in memory. Redirect fallback needs state across one page
  // navigation and uses session storage only until the HttpOnly exchange ends.
  // Never persist guardian credentials in localStorage or IndexedDB.
  await setPersistence(
    auth,
    redirectFlow ? browserSessionPersistence : inMemoryPersistence,
  );

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  return { auth, provider };
}

export async function bootstrapOnlineFirebaseAuth() {
  const auth = getAuth(getFirebaseClientApp());
  await setPersistence(auth, inMemoryPersistence);
  if (auth.currentUser) return auth;

  const csrfResponse = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!csrfResponse.ok) throw new Error("보안 확인을 시작할 수 없습니다.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const response = await fetch("/api/auth/client-token", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csrfToken }),
  });
  if (!response.ok) {
    throw new Error("보호자 세션을 확인할 수 없습니다.");
  }

  const { customToken } = (await response.json()) as { customToken: string };
  await signInWithCustomToken(auth, customToken);
  return auth;
}

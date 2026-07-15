import "server-only";

import { applicationDefault, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function hasFirebaseAdminConfig() {
  const hasInlineCredentials = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
  return hasInlineCredentials || Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

export function getFirebaseAdminApp() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error("Firebase Admin configuration is missing.");
  }

  const hasInlineCredentials = Boolean(
    process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY,
  );
  return getApps().length
    ? getApp()
    : initializeApp({
        credential: hasInlineCredentials
          ? cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            })
          : applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}

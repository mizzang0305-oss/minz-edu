import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type FirebaseWebConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
};

type FirebaseAdminKey = {
  project_id?: string;
};

const webConfigPath = path.join(process.cwd(), ".firebase-web-config.json");
const adminKeyPath = path.join(process.cwd(), ".firebase-admin-key.json");

function readLocalFirebaseConfig(): FirebaseWebConfig {
  if (!existsSync(webConfigPath)) return {};
  return JSON.parse(readFileSync(webConfigPath, "utf8")) as FirebaseWebConfig;
}

const localFirebase = readLocalFirebaseConfig();

function adminKeyMatchesProject() {
  if (!existsSync(adminKeyPath)) return false;
  const adminKey = JSON.parse(readFileSync(adminKeyPath, "utf8")) as FirebaseAdminKey;
  return Boolean(adminKey.project_id && adminKey.project_id === localFirebase.projectId);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && adminKeyMatchesProject()) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = adminKeyPath;
}
if (!process.env.FIREBASE_PROJECT_ID && localFirebase.projectId) {
  process.env.FIREBASE_PROJECT_ID = localFirebase.projectId;
}

const publicFirebaseEnv = Object.fromEntries(
  Object.entries({
    NEXT_PUBLIC_FIREBASE_API_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? localFirebase.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? localFirebase.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? localFirebase.projectId,
    NEXT_PUBLIC_FIREBASE_APP_ID:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? localFirebase.appId,
  }).filter((entry): entry is [string, string] => Boolean(entry[1])),
);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.45.120"],
  env: publicFirebaseEnv,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

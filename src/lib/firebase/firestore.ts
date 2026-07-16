import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getFirebaseClientApp } from "./client";

let emulatorConnected = false;

export function getOnlineFirestore() {
  const firestore = getFirestore(getFirebaseClientApp());

  if (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
    !emulatorConnected
  ) {
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    emulatorConnected = true;
  }

  return firestore;
}

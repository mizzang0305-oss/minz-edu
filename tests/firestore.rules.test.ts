import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "studymate-ai-v2";
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Existing StudyMate user boundary", () => {
  it("preserves owner-only access to users documents", async () => {
    const ownerDb = testEnv.authenticatedContext("user-a").firestore();
    const outsiderDb = testEnv.authenticatedContext("user-b").firestore();
    const userRef = doc(ownerDb, "users/user-a");

    await assertSucceeds(setDoc(userRef, { displayName: "보호자" }));
    await assertSucceeds(getDoc(userRef));
    await assertFails(getDoc(doc(outsiderDb, "users/user-a")));
    await assertFails(setDoc(doc(outsiderDb, "users/user-a"), { displayName: "변경" }));
  });
});

describe("Firestore guardian boundaries", () => {
  it("allows a guardian to manage only their own child profiles", async () => {
    const ownerDb = testEnv.authenticatedContext("guardian-a").firestore();
    const outsiderDb = testEnv.authenticatedContext("guardian-b").firestore();
    const childPath = "guardians/guardian-a/children/minz";
    const child = {
      displayName: "민즈",
      schoolLevel: "elementary",
      grade: 2,
      characterId: "thunder-sword",
      friendCode: "ABCD2345",
      createdAt: 1,
      updatedAt: 1,
    };

    await assertSucceeds(setDoc(doc(ownerDb, childPath), child));
    await assertSucceeds(getDoc(doc(ownerDb, childPath)));
    await assertFails(getDoc(doc(outsiderDb, childPath)));
  });

  it("rejects malformed or over-scoped child data", async () => {
    const ownerDb = testEnv.authenticatedContext("guardian-a").firestore();
    await assertFails(
      setDoc(doc(ownerDb, "guardians/guardian-a/children/minz"), {
        displayName: "민즈",
        schoolLevel: "middle",
        grade: 4,
        characterId: "thunder-sword",
        friendCode: "SHORT",
        createdAt: 1,
        updatedAt: 1,
        privateEmail: "child@example.com",
      }),
    );
  });

  it("accepts valid early-childhood and elementary stages and rejects middle school", async () => {
    const ownerDb = testEnv.authenticatedContext("guardian-a").firestore();
    const base = { characterId: "thunder-sword", friendCode: "ABCD2345", createdAt: 1, updatedAt: 1 };
    await assertSucceeds(setDoc(doc(ownerDb, "guardians/guardian-a/children/kind"), { ...base, displayName: "유아", schoolLevel: "kindergarten", grade: 6 }));
    await assertSucceeds(setDoc(doc(ownerDb, "guardians/guardian-a/children/elementary"), { ...base, displayName: "초등학생", schoolLevel: "elementary", grade: 3 }));
    await assertFails(setDoc(doc(ownerDb, "guardians/guardian-a/children/middle"), { ...base, displayName: "중학생", schoolLevel: "middle", grade: 3 }));
  });

  it("keeps immutable child identity fields and rejects unsafe character ids", async () => {
    const ownerDb = testEnv.authenticatedContext("guardian-a").firestore();
    const childRef = doc(ownerDb, "guardians/guardian-a/children/minz");
    const child = {
      displayName: "민즈",
      schoolLevel: "elementary",
      grade: 2,
      characterId: "thunder-sword",
      friendCode: "ABCD2345",
      createdAt: 1,
      updatedAt: 1,
    };

    await assertSucceeds(setDoc(childRef, child));
    await assertSucceeds(updateDoc(childRef, { displayName: "민즈 용사", updatedAt: 2 }));
    await assertFails(updateDoc(childRef, { friendCode: "WXYZ6789", updatedAt: 3 }));
    await assertFails(updateDoc(childRef, { createdAt: 2, updatedAt: 3 }));
    await assertFails(updateDoc(childRef, { characterId: "../admin", updatedAt: 3 }));
    await assertFails(
      setDoc(doc(ownerDb, "guardians/guardian-a/children/unsafe-code"), {
        ...child,
        friendCode: "ABCI2345",
      }),
    );
  });
});

describe("Firestore authoritative room boundaries", () => {
  it("allows a safe initial room but blocks client state mutation", async () => {
    const guardianDb = testEnv.authenticatedContext("guardian-a").firestore();
    const roomRef = doc(guardianDb, "rooms/room-a");
    await assertFails(
      setDoc(roomRef, {
        roomCode: "ABCD23",
        hostGuardianUid: "guardian-a",
        guardianUids: ["guardian-a"],
        status: "waiting",
        bossHp: 250,
        teamLinkGauge: 0,
        revision: 0,
        expiresAt: 100,
        createdAt: 1,
      }),
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "rooms/room-a"), {
        guardianUids: ["guardian-a"],
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      });
    });

    await assertSucceeds(getDoc(roomRef));
    await assertFails(updateDoc(roomRef, { bossHp: 0, revision: 1 }));
    await assertSucceeds(
      setDoc(doc(guardianDb, "rooms/room-a/commands/event-1"), {
        eventId: "event-1",
        playerId: "minz",
        expectedRevision: 0,
        type: "PLAYER_READY",
        payload: {},
        clientTimestamp: 1,
      }),
    );
  });

  it("never exposes room-code lookup documents to clients", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "roomCodes/ABCD23"), {
        roomId: "room-a",
      });
    });
    const guardianDb = testEnv.authenticatedContext("guardian-a").firestore();
    await assertFails(getDoc(doc(guardianDb, "roomCodes/ABCD23")));
  });

  it("blocks non-members from reading rooms or sending commands", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "rooms/room-a"), {
        guardianUids: ["guardian-a"],
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      });
    });
    const outsiderDb = testEnv.authenticatedContext("guardian-b").firestore();

    await assertFails(getDoc(doc(outsiderDb, "rooms/room-a")));
    await assertFails(
      setDoc(doc(outsiderDb, "rooms/room-a/commands/event-1"), {
        eventId: "event-1",
        playerId: "other-child",
        expectedRevision: 0,
        type: "PLAYER_READY",
        payload: {},
        clientTimestamp: 1,
      }),
    );
  });

  it("rejects oversized or malformed command envelopes", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "rooms/room-a"), {
        guardianUids: ["guardian-a"],
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      });
    });
    const guardianDb = testEnv.authenticatedContext("guardian-a").firestore();
    const base = {
      playerId: "minz",
      expectedRevision: 0,
      type: "PLAYER_READY",
      clientTimestamp: 1,
    };

    await assertFails(
      setDoc(doc(guardianDb, "rooms/room-a/commands/event-1"), {
        ...base,
        eventId: "event-1",
        payload: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9 },
      }),
    );
    await assertFails(
      setDoc(doc(guardianDb, "rooms/room-a/commands/event-2"), {
        ...base,
        eventId: "event-2",
        payload: {},
        clientTimestamp: "now",
      }),
    );
  });

  it("fails closed for unauthenticated and expired room access", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "rooms/active-room"), {
        guardianUids: ["guardian-a"],
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      });
      await setDoc(doc(context.firestore(), "rooms/expired-room"), {
        guardianUids: ["guardian-a"],
        expiresAt: Timestamp.fromMillis(Date.now() - 60_000),
      });
    });
    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    const guardianDb = testEnv.authenticatedContext("guardian-a").firestore();

    await assertFails(getDoc(doc(anonymousDb, "rooms/active-room")));
    await assertFails(getDoc(doc(guardianDb, "rooms/expired-room")));
    await assertFails(
      setDoc(doc(guardianDb, "rooms/expired-room/commands/event-1"), {
        eventId: "event-1",
        playerId: "minz",
        expectedRevision: 0,
        type: "PLAYER_READY",
        payload: {},
        clientTimestamp: 1,
      }),
    );
  });
});

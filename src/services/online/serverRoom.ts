import { randomInt, randomUUID } from "node:crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { normalizeRoomCode } from "./roomCode";
import { readSafeChildRoomIdentity } from "./childProfileSync";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_MS = 30 * 60 * 1000;
export const PRESENCE_TIMEOUT_MS = 60 * 1000;

export type ServerRoomPlayer = {
  guardianUid: string;
  childProfileId: string;
  displayName: string;
  characterId: string;
  ready: boolean;
  connected: boolean;
  lastSeenAt: Timestamp;
};

export type ServerRoom = {
  roomCode: string;
  hostGuardianUid: string;
  guardianUids: string[];
  players: ServerRoomPlayer[];
  status: "waiting" | "ready" | "battle" | "special" | "reward" | "closed";
  bossHp: number;
  teamLinkGauge: number;
  revision: number;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PublicRoom = {
  id: string;
  roomCode: string;
  status: ServerRoom["status"];
  players: Array<{
    slot: number;
    displayName: string;
    characterId: string;
    ready: boolean;
    connected: boolean;
  }>;
  bossHp: number;
  teamLinkGauge: number;
  revision: number;
  expiresAt: number;
};

export class RoomServiceError extends Error {
  constructor(
    public readonly code:
      | "CHILD_NOT_FOUND"
      | "ROOM_NOT_FOUND"
      | "ROOM_EXPIRED"
      | "ROOM_FULL"
      | "ROOM_CLOSED"
      | "NOT_MEMBER"
      | "CODE_COLLISION",
  ) {
    super(code);
  }
}

function generateRoomCode() {
  return Array.from(
    { length: 6 },
    () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
  ).join("");
}

function toPublicRoom(id: string, room: ServerRoom, now: number): PublicRoom {
  return {
    id,
    roomCode: room.roomCode,
    status: room.status,
    players: room.players.map((player, index) => ({
      slot: index + 1,
      displayName: player.displayName,
      characterId: player.characterId,
      ready: player.ready,
      connected:
        player.connected && now - player.lastSeenAt.toMillis() <= PRESENCE_TIMEOUT_MS,
    })),
    bossHp: room.bossHp,
    teamLinkGauge: room.teamLinkGauge,
    revision: room.revision,
    expiresAt: room.expiresAt.toMillis(),
  };
}

async function getChildProfile(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
) {
  const snapshot = await firestore
    .collection("guardians")
    .doc(guardianUid)
    .collection("children")
    .doc(childProfileId)
    .get();
  if (!snapshot.exists) throw new RoomServiceError("CHILD_NOT_FOUND");
  const child = readSafeChildRoomIdentity(snapshot.data());
  if (!child) throw new RoomServiceError("CHILD_NOT_FOUND");
  return child;
}

export async function createOnlineRoom(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
  now = Date.now(),
): Promise<PublicRoom> {
  const child = await getChildProfile(firestore, guardianUid, childProfileId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomId = randomUUID();
    const roomCode = generateRoomCode();
    const roomRef = firestore.collection("rooms").doc(roomId);
    const codeRef = firestore.collection("roomCodes").doc(roomCode);
    const timestamp = Timestamp.fromMillis(now);
    const room: ServerRoom = {
      roomCode,
      hostGuardianUid: guardianUid,
      guardianUids: [guardianUid],
      players: [
        {
          guardianUid,
          childProfileId,
          displayName: child.displayName,
          characterId: child.characterId,
          ready: false,
          connected: true,
          lastSeenAt: timestamp,
        },
      ],
      status: "waiting",
      bossHp: 250,
      teamLinkGauge: 0,
      revision: 0,
      expiresAt: Timestamp.fromMillis(now + ROOM_TTL_MS),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await firestore.runTransaction(async (transaction) => {
        const existingCode = await transaction.get(codeRef);
        if (existingCode.exists) throw new RoomServiceError("CODE_COLLISION");
        transaction.create(codeRef, { roomId, expiresAt: room.expiresAt });
        transaction.create(roomRef, room);
      });
      return toPublicRoom(roomId, room, now);
    } catch (error) {
      if (error instanceof RoomServiceError && error.code === "CODE_COLLISION") continue;
      throw error;
    }
  }

  throw new RoomServiceError("CODE_COLLISION");
}

export async function joinOnlineRoom(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
  rawRoomCode: string,
  now = Date.now(),
): Promise<PublicRoom> {
  const roomCode = normalizeRoomCode(rawRoomCode);
  const child = await getChildProfile(firestore, guardianUid, childProfileId);
  const codeRef = firestore.collection("roomCodes").doc(roomCode);
  const codeSnapshot = await codeRef.get();
  if (!codeSnapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");

  const roomId = String(codeSnapshot.data()?.roomId ?? "");
  const roomRef = firestore.collection("rooms").doc(roomId);
  const timestamp = Timestamp.fromMillis(now);

  const room = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");
    const current = snapshot.data() as ServerRoom;
    if (current.expiresAt.toMillis() <= now) throw new RoomServiceError("ROOM_EXPIRED");
    if (current.status !== "waiting" && current.status !== "ready") {
      throw new RoomServiceError("ROOM_CLOSED");
    }

    const existingIndex = current.guardianUids.indexOf(guardianUid);
    if (existingIndex >= 0) return current;
    if (current.guardianUids.length >= 2) throw new RoomServiceError("ROOM_FULL");

    const next: ServerRoom = {
      ...current,
      guardianUids: [...current.guardianUids, guardianUid],
      players: [
        ...current.players,
        {
          guardianUid,
          childProfileId,
          displayName: child.displayName,
          characterId: child.characterId,
          ready: false,
          connected: true,
          lastSeenAt: timestamp,
        },
      ],
      status: "ready",
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
    transaction.set(roomRef, next);
    return next;
  });

  return toPublicRoom(roomId, room, now);
}

export async function heartbeatOnlineRoom(
  firestore: Firestore,
  guardianUid: string,
  roomId: string,
  now = Date.now(),
): Promise<PublicRoom> {
  const roomRef = firestore.collection("rooms").doc(roomId);
  const timestamp = Timestamp.fromMillis(now);

  const room = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");
    const current = snapshot.data() as ServerRoom;
    if (!current.guardianUids.includes(guardianUid)) throw new RoomServiceError("NOT_MEMBER");
    if (current.expiresAt.toMillis() <= now) throw new RoomServiceError("ROOM_EXPIRED");
    if (current.status === "closed") throw new RoomServiceError("ROOM_CLOSED");

    const players = current.players.map((player) => {
      if (player.guardianUid === guardianUid) {
        return { ...player, connected: true, lastSeenAt: timestamp };
      }
      return {
        ...player,
        connected: now - player.lastSeenAt.toMillis() <= PRESENCE_TIMEOUT_MS,
      };
    });
    const next: ServerRoom = { ...current, players, updatedAt: timestamp };
    transaction.update(roomRef, { players, updatedAt: timestamp });
    return next;
  });

  return toPublicRoom(roomId, room, now);
}

export async function getOnlineRoom(
  firestore: Firestore,
  guardianUid: string,
  roomId: string,
  now = Date.now(),
): Promise<PublicRoom> {
  const snapshot = await firestore.collection("rooms").doc(roomId).get();
  if (!snapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");
  const room = snapshot.data() as ServerRoom;
  if (!room.guardianUids.includes(guardianUid)) throw new RoomServiceError("NOT_MEMBER");
  if (room.expiresAt.toMillis() <= now) throw new RoomServiceError("ROOM_EXPIRED");
  if (room.status === "closed") throw new RoomServiceError("ROOM_CLOSED");
  return toPublicRoom(roomId, room, now);
}

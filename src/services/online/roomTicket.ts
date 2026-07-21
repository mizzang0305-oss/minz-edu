import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const ROOM_TICKET_TTL_SECONDS = 90;
const MAX_TICKET_LENGTH = 2_048;
const MIN_SECRET_BYTES = 32;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export type RoomTicketIntent = "create" | "join";

export type RoomTicketClaims = {
  version: 1;
  ticketId: string;
  guardianKey: string;
  childKey: string;
  displayName: string;
  intent: RoomTicketIntent;
  roomId?: string;
  issuedAt: number;
  expiresAt: number;
};

type RoomTicketInput = {
  guardianUid: string;
  childProfileId: string;
  displayName: string;
  intent: RoomTicketIntent;
  roomId?: string;
};

export class RoomTicketError extends Error {
  constructor(public readonly code: "CONFIG" | "FORMAT" | "SIGNATURE" | "EXPIRED" | "CLAIMS") {
    super(code);
    this.name = "RoomTicketError";
  }
}

export function readRoomTicketSecret() {
  const secret = process.env.COLYSEUS_ROOM_TICKET_SECRET?.trim() ?? "";
  assertSecret(secret);
  return secret;
}

export function issueRoomTicket(
  input: RoomTicketInput,
  secret: string,
  nowMs = Date.now(),
) {
  assertSecret(secret);
  assertIssueInput(input);
  const issuedAt = Math.floor(nowMs / 1_000);
  const claims: RoomTicketClaims = {
    version: 1,
    ticketId: randomUUID(),
    guardianKey: deriveGuardianKey(secret, input.guardianUid),
    childKey: deriveChildKey(secret, input.guardianUid, input.childProfileId),
    displayName: input.displayName,
    intent: input.intent,
    ...(input.roomId ? { roomId: input.roomId } : {}),
    issuedAt,
    expiresAt: issuedAt + ROOM_TICKET_TTL_SECONDS,
  };
  assertClaims(claims);
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return {
    ticket: `${payload}.${sign(payload, secret)}`,
    claims,
  };
}

export function deriveGuardianKey(secret: string, guardianUid: string) {
  assertSecret(secret);
  return createHmac("sha256", secret).update(`guardian:${guardianUid}`).digest("base64url");
}

export function deriveChildKey(secret: string, guardianUid: string, childProfileId: string) {
  assertSecret(secret);
  return createHmac("sha256", secret)
    .update(`child:${guardianUid}:${childProfileId}`)
    .digest("base64url");
}

export function opaqueKeysEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function verifyRoomTicket(token: unknown, secret: string, nowMs = Date.now()): RoomTicketClaims {
  assertSecret(secret);
  if (typeof token !== "string" || token.length < 1 || token.length > MAX_TICKET_LENGTH) {
    throw new RoomTicketError("FORMAT");
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new RoomTicketError("FORMAT");
  const expected = Buffer.from(sign(parts[0], secret), "utf8");
  const actual = Buffer.from(parts[1], "utf8");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new RoomTicketError("SIGNATURE");
  }

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    throw new RoomTicketError("FORMAT");
  }
  assertClaims(claims);
  const nowSeconds = Math.floor(nowMs / 1_000);
  if (claims.expiresAt <= nowSeconds || claims.issuedAt > nowSeconds + 5) {
    throw new RoomTicketError("EXPIRED");
  }
  return claims;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function assertSecret(secret: string) {
  if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) throw new RoomTicketError("CONFIG");
}

function assertClaims(value: unknown): asserts value is RoomTicketClaims {
  if (!isRecord(value)) throw new RoomTicketError("CLAIMS");
  const keys = Object.keys(value);
  const allowedKeys = [
    "version",
    "ticketId",
    "guardianKey",
    "childKey",
    "displayName",
    "intent",
    "roomId",
    "issuedAt",
    "expiresAt",
  ];
  if (
    !keys.every((key) => allowedKeys.includes(key))
    || value.version !== 1
    || typeof value.ticketId !== "string"
    || !ID_PATTERN.test(value.ticketId)
    || typeof value.guardianKey !== "string"
    || !/^[A-Za-z0-9_-]{43}$/.test(value.guardianKey)
    || typeof value.childKey !== "string"
    || !/^[A-Za-z0-9_-]{43}$/.test(value.childKey)
    || typeof value.displayName !== "string"
    || value.displayName.trim().length < 1
    || value.displayName.length > 20
    || CONTROL_CHARACTER_PATTERN.test(value.displayName)
    || (value.intent !== "create" && value.intent !== "join")
    || !Number.isSafeInteger(value.issuedAt)
    || !Number.isSafeInteger(value.expiresAt)
    || Number(value.expiresAt) <= Number(value.issuedAt)
    || Number(value.expiresAt) - Number(value.issuedAt) > ROOM_TICKET_TTL_SECONDS
    || (value.intent === "create" && value.roomId !== undefined)
    || (value.intent === "join" && (typeof value.roomId !== "string" || !ID_PATTERN.test(value.roomId)))
  ) {
    throw new RoomTicketError("CLAIMS");
  }
}

function assertIssueInput(value: RoomTicketInput) {
  if (
    typeof value.guardianUid !== "string"
    || value.guardianUid.length < 1
    || value.guardianUid.length > 128
    || CONTROL_CHARACTER_PATTERN.test(value.guardianUid)
    || !ID_PATTERN.test(value.childProfileId)
    || typeof value.displayName !== "string"
    || value.displayName.trim().length < 1
    || value.displayName.length > 20
    || CONTROL_CHARACTER_PATTERN.test(value.displayName)
    || (value.intent !== "create" && value.intent !== "join")
    || (value.intent === "create" && value.roomId !== undefined)
    || (value.intent === "join" && (typeof value.roomId !== "string" || !ID_PATTERN.test(value.roomId)))
  ) {
    throw new RoomTicketError("CLAIMS");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

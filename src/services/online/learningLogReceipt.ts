import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  LearningPlayerSessionLog,
  LearningQuestionAttemptLog,
  LearningQuestionLog,
  LearningWrongAnswerType,
} from "@/types/learningBattlePoc";

export const LEARNING_LOG_RECEIPT_TTL_SECONDS = 10 * 60;
const MAX_RECEIPT_LENGTH = 96_000;
const MIN_SECRET_BYTES = 32;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const WRONG_ANSWER_TYPES: LearningWrongAnswerType[] = [
  "addition-calculation",
  "equation-balance",
  "distribution-order",
];

export type LearningLogReceiptClaims = {
  version: 1;
  recordId: string;
  guardianKey: string;
  childKey: string;
  roomId: string;
  playerId: string;
  revision: number;
  log: LearningPlayerSessionLog;
  issuedAt: number;
  expiresAt: number;
};

type ReceiptInput = Omit<LearningLogReceiptClaims, "version" | "recordId" | "issuedAt" | "expiresAt">;

export class LearningLogReceiptError extends Error {
  constructor(public readonly code: "CONFIG" | "FORMAT" | "SIGNATURE" | "EXPIRED" | "CLAIMS") {
    super(code);
    this.name = "LearningLogReceiptError";
  }
}

export function issueLearningLogReceipt(input: ReceiptInput, secret: string, nowMs = Date.now()) {
  assertSecret(secret);
  const issuedAt = Math.floor(nowMs / 1_000);
  const claims: LearningLogReceiptClaims = {
    version: 1,
    recordId: `${input.roomId}_${input.playerId}`,
    ...input,
    issuedAt,
    expiresAt: issuedAt + LEARNING_LOG_RECEIPT_TTL_SECONDS,
  };
  assertClaims(claims);
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return { receipt: `${payload}.${sign(payload, secret)}`, claims };
}

export function verifyLearningLogReceipt(token: unknown, secret: string, nowMs = Date.now()) {
  assertSecret(secret);
  if (typeof token !== "string" || token.length < 1 || token.length > MAX_RECEIPT_LENGTH) {
    throw new LearningLogReceiptError("FORMAT");
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new LearningLogReceiptError("FORMAT");
  const expected = Buffer.from(sign(parts[0], secret), "utf8");
  const actual = Buffer.from(parts[1], "utf8");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new LearningLogReceiptError("SIGNATURE");
  }

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    throw new LearningLogReceiptError("FORMAT");
  }
  assertClaims(claims);
  const nowSeconds = Math.floor(nowMs / 1_000);
  if (claims.expiresAt <= nowSeconds || claims.issuedAt > nowSeconds + 5) {
    throw new LearningLogReceiptError("EXPIRED");
  }
  return claims;
}

function assertClaims(value: unknown): asserts value is LearningLogReceiptClaims {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "version", "recordId", "guardianKey", "childKey", "roomId", "playerId", "revision", "log", "issuedAt", "expiresAt",
  ])) throw new LearningLogReceiptError("CLAIMS");
  if (
    value.version !== 1
    || typeof value.recordId !== "string"
    || !ID_PATTERN.test(value.recordId)
    || typeof value.guardianKey !== "string"
    || !KEY_PATTERN.test(value.guardianKey)
    || typeof value.childKey !== "string"
    || !KEY_PATTERN.test(value.childKey)
    || typeof value.roomId !== "string"
    || !ID_PATTERN.test(value.roomId)
    || typeof value.playerId !== "string"
    || !ID_PATTERN.test(value.playerId)
    || value.recordId !== `${value.roomId}_${value.playerId}`
    || !isBoundedInteger(value.revision, 0, Number.MAX_SAFE_INTEGER)
    || !Number.isSafeInteger(value.issuedAt)
    || !Number.isSafeInteger(value.expiresAt)
    || Number(value.expiresAt) <= Number(value.issuedAt)
    || Number(value.expiresAt) - Number(value.issuedAt) > LEARNING_LOG_RECEIPT_TTL_SECONDS
  ) throw new LearningLogReceiptError("CLAIMS");
  assertLearningLog(value.log, value.roomId, value.playerId);
}

function assertLearningLog(value: unknown, roomId: string, playerId: string): asserts value is LearningPlayerSessionLog {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "roomId", "playerId", "questionLogs", "totalAttempts", "totalHints", "totalElapsedMs",
  ])) throw new LearningLogReceiptError("CLAIMS");
  if (
    value.roomId !== roomId
    || value.playerId !== playerId
    || !Array.isArray(value.questionLogs)
    || value.questionLogs.length > 20
  ) throw new LearningLogReceiptError("CLAIMS");

  const questionLogs = value.questionLogs.map((entry) => parseQuestionLog(entry, playerId));
  const totalAttempts = questionLogs.reduce((sum, entry) => sum + entry.attemptCount, 0);
  const totalHints = questionLogs.reduce((sum, entry) => sum + entry.hintCount, 0);
  const totalElapsedMs = questionLogs.reduce((sum, entry) => sum + entry.elapsedMs, 0);
  if (
    value.totalAttempts !== totalAttempts
    || value.totalHints !== totalHints
    || value.totalElapsedMs !== totalElapsedMs
  ) throw new LearningLogReceiptError("CLAIMS");
}

function parseQuestionLog(value: unknown, playerId: string): LearningQuestionLog {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "questionId", "playerId", "attemptCount", "hintCount", "elapsedMs", "completed", "wrongAnswerTypes", "attempts",
  ])) throw new LearningLogReceiptError("CLAIMS");
  if (
    typeof value.questionId !== "string"
    || !ID_PATTERN.test(value.questionId)
    || value.playerId !== playerId
    || !Array.isArray(value.attempts)
    || value.attempts.length > 50
    || typeof value.completed !== "boolean"
    || !isRecord(value.wrongAnswerTypes)
    || !Object.keys(value.wrongAnswerTypes).every((key) => WRONG_ANSWER_TYPES.includes(key as LearningWrongAnswerType))
  ) throw new LearningLogReceiptError("CLAIMS");

  const storedWrongCounts = value.wrongAnswerTypes as Record<string, unknown>;
  const attempts = value.attempts.map(parseAttemptLog);
  const hintCount = attempts.filter((attempt) => attempt.hintProvided).length;
  const wrongCounts: Partial<Record<LearningWrongAnswerType, number>> = {};
  for (const attempt of attempts) {
    if (!attempt.correct && attempt.wrongAnswerType) {
      wrongCounts[attempt.wrongAnswerType] = (wrongCounts[attempt.wrongAnswerType] ?? 0) + 1;
    }
  }
  const wrongKeys = Object.keys(storedWrongCounts) as LearningWrongAnswerType[];
  const wrongCountsMatch = wrongKeys.length === Object.keys(wrongCounts).length
    && wrongKeys.every((key) => storedWrongCounts[key] === wrongCounts[key]);
  if (
    value.attemptCount !== attempts.length
    || value.hintCount !== hintCount
    || value.elapsedMs !== (attempts.at(-1)?.elapsedMs ?? 0)
    || value.completed !== attempts.some((attempt) => attempt.correct)
    || !wrongCountsMatch
  ) throw new LearningLogReceiptError("CLAIMS");

  return value as LearningQuestionLog;
}

function parseAttemptLog(value: unknown, index: number): LearningQuestionAttemptLog {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "attemptNumber", "correct", "elapsedMs", "hintProvided", "wrongAnswerType",
  ])) throw new LearningLogReceiptError("CLAIMS");
  if (
    value.attemptNumber !== index + 1
    || typeof value.correct !== "boolean"
    || !isBoundedInteger(value.elapsedMs, 0, 24 * 60 * 60 * 1_000)
    || typeof value.hintProvided !== "boolean"
    || (value.wrongAnswerType !== undefined && !WRONG_ANSWER_TYPES.includes(value.wrongAnswerType as LearningWrongAnswerType))
    || (value.correct && value.wrongAnswerType !== undefined)
    || (!value.correct && value.wrongAnswerType === undefined)
  ) throw new LearningLogReceiptError("CLAIMS");
  return value as LearningQuestionAttemptLog;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`learning-log:${payload}`).digest("base64url");
}

function assertSecret(secret: string) {
  if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) throw new LearningLogReceiptError("CONFIG");
}

function isBoundedInteger(value: unknown, min: number, max: number) {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { describe, expect, it } from "vitest";
import {
  issueLearningLogReceipt,
  LearningLogReceiptError,
  verifyLearningLogReceipt,
} from "./learningLogReceipt";

const SECRET = "test-learning-log-receipt-secret-at-least-32-bytes";
const BASE_INPUT = {
  guardianKey: "g".repeat(43),
  childKey: "c".repeat(43),
  roomId: "room-a",
  playerId: "player-1",
  revision: 7,
  log: {
    roomId: "room-a",
    playerId: "player-1",
    questionLogs: [{
      questionId: "linear-equation-core",
      playerId: "player-1",
      attemptCount: 2,
      hintCount: 1,
      elapsedMs: 2_000,
      completed: true,
      wrongAnswerTypes: { "equation-balance": 1 },
      attempts: [
        { attemptNumber: 1, correct: false, elapsedMs: 1_000, hintProvided: true, wrongAnswerType: "equation-balance" as const },
        { attemptNumber: 2, correct: true, elapsedMs: 2_000, hintProvided: false },
      ],
    }],
    totalAttempts: 2,
    totalHints: 1,
    totalElapsedMs: 2_000,
  },
};

describe("signed learning-log receipt", () => {
  it("round-trips a server-authoritative log without raw answers", () => {
    const issued = issueLearningLogReceipt(BASE_INPUT, SECRET, 1_000_000);
    expect(verifyLearningLogReceipt(issued.receipt, SECRET, 1_030_000)).toEqual(issued.claims);
    expect(issued.claims.recordId).toBe("room-a_player-1");
    expect(Buffer.from(issued.receipt.split(".")[0], "base64url").toString("utf8")).not.toContain("answer");
  });

  it("rejects tampering, expiry, and inconsistent aggregate fields", () => {
    const issued = issueLearningLogReceipt(BASE_INPUT, SECRET, 1_000_000);
    expect(() => verifyLearningLogReceipt(`${issued.receipt}x`, SECRET, 1_000_000)).toThrowError(
      expect.objectContaining({ code: "SIGNATURE" }),
    );
    expect(() => verifyLearningLogReceipt(issued.receipt, SECRET, 1_601_000)).toThrowError(
      expect.objectContaining({ code: "EXPIRED" }),
    );
    expect(() => issueLearningLogReceipt({
      ...BASE_INPUT,
      log: { ...BASE_INPUT.log, totalAttempts: 99 },
    }, SECRET)).toThrowError(expect.objectContaining({ code: "CLAIMS" }));
  });

  it("rejects unexpected fields that could smuggle a raw answer", () => {
    const unsafe = structuredClone(BASE_INPUT) as typeof BASE_INPUT & { log: { rawAnswer?: string } };
    unsafe.log.rawAnswer = "20";
    expect(() => issueLearningLogReceipt(unsafe, SECRET)).toThrowError(LearningLogReceiptError);
  });
});

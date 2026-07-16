import { describe, expect, it } from "vitest";
import { isValidRoomCode, normalizeRoomCode } from "./roomCode";

describe("online room code", () => {
  it("normalizes codes pasted from a guardian message", () => {
    expect(normalizeRoomCode(" ab-cd 23 ")).toBe("ABCD23");
  });

  it("accepts six unambiguous characters only", () => {
    expect(isValidRoomCode("ABCD23")).toBe(true);
    expect(isValidRoomCode("ABCD01")).toBe(false);
    expect(isValidRoomCode("ABCDE")).toBe(false);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import {
  allowChildProfileMutation,
  allowGameStateMutation,
  allowGuardianAuthMutation,
  allowRoomMutation,
  resetOnlineMutationRateLimitsForTests,
} from "./roomRateLimit";

beforeEach(() => resetOnlineMutationRateLimitsForTests());

describe("room mutation rate limit", () => {
  it("limits repeated room mutations and resets after one minute", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      expect(allowRoomMutation("rate-limit-guardian", 1_000)).toBe(true);
    }
    expect(allowRoomMutation("rate-limit-guardian", 1_000)).toBe(false);
    expect(allowRoomMutation("rate-limit-guardian", 61_001)).toBe(true);
  });

  it("keeps room, profile, and auth budgets independent", () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      expect(allowChildProfileMutation("guardian", 1_000)).toBe(true);
      expect(allowGuardianAuthMutation("guardian", 1_000)).toBe(true);
    }
    expect(allowChildProfileMutation("guardian", 1_000)).toBe(false);
    expect(allowGuardianAuthMutation("guardian", 1_000)).toBe(false);
    expect(allowRoomMutation("guardian", 1_000)).toBe(true);
    expect(allowGameStateMutation("guardian", 1_000)).toBe(true);
  });

  it("allows a short game session burst but limits runaway state writes", () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(allowGameStateMutation("guardian", 1_000)).toBe(true);
    }
    expect(allowGameStateMutation("guardian", 1_000)).toBe(false);
    expect(allowGameStateMutation("guardian", 61_001)).toBe(true);
  });

  it("fails closed instead of growing memory past the bucket limit", () => {
    for (let index = 0; index < 10_000; index += 1) {
      expect(allowRoomMutation(`guardian-${index}`, 1_000)).toBe(true);
    }
    expect(allowRoomMutation("guardian-overflow", 1_000)).toBe(false);
    expect(allowRoomMutation("guardian-0", 1_000)).toBe(true);
  });
});

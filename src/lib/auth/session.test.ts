import { describe, expect, it } from "vitest";
import { isRecentSignIn, isValidCsrfPair, RECENT_SIGN_IN_SECONDS } from "./session";

describe("guardian session guards", () => {
  it("accepts only matching sufficiently long CSRF tokens", () => {
    const token = "a".repeat(64);
    expect(isValidCsrfPair(token, token)).toBe(true);
    expect(isValidCsrfPair(token, `${token.slice(0, -1)}b`)).toBe(false);
    expect(isValidCsrfPair("short", "short")).toBe(false);
  });

  it("requires a recent Google sign-in before creating a session", () => {
    const now = 10_000;
    expect(isRecentSignIn(now - RECENT_SIGN_IN_SECONDS + 1, now)).toBe(true);
    expect(isRecentSignIn(now - RECENT_SIGN_IN_SECONDS - 1, now)).toBe(false);
    expect(isRecentSignIn(now + 1, now)).toBe(false);
  });
});

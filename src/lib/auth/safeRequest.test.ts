import { describe, expect, it } from "vitest";
import { readLimitedJsonBody } from "./safeRequest";

describe("limited JSON request reader", () => {
  it("reads a JSON object within the byte limit", async () => {
    const result = await readLimitedJsonBody(
      new Request("https://example.test", {
        method: "POST",
        body: JSON.stringify({ csrfToken: "a".repeat(64) }),
      }),
      128,
    );

    expect(result).toEqual({ ok: true, value: { csrfToken: "a".repeat(64) } });
  });

  it("rejects malformed and oversized bodies", async () => {
    await expect(
      readLimitedJsonBody(
        new Request("https://example.test", { method: "POST", body: "{" }),
      ),
    ).resolves.toEqual({ ok: false, error: "invalid_json" });

    await expect(
      readLimitedJsonBody(
        new Request("https://example.test", {
          method: "POST",
          body: JSON.stringify({ value: "한".repeat(20) }),
        }),
        32,
      ),
    ).resolves.toEqual({ ok: false, error: "too_large" });

    await expect(
      readLimitedJsonBody(
        new Request("https://example.test", { method: "POST", body: "null" }),
      ),
    ).resolves.toEqual({ ok: false, error: "invalid_json" });
  });

  it("rejects a declared oversized body without reading it", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "Content-Length": "10000" },
      body: "{}",
    });

    await expect(readLimitedJsonBody(request, 128)).resolves.toEqual({
      ok: false,
      error: "too_large",
    });
  });
});

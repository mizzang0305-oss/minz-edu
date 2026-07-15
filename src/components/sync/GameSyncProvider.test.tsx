import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameSyncProvider, useGameSyncStatus } from "./GameSyncProvider";

function StatusProbe() {
  return <span data-testid="sync-status">{useGameSyncStatus()}</span>;
}

afterEach(() => vi.restoreAllMocks());

describe("GameSyncProvider", () => {
  it("keeps playing locally when there is no guardian session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ authenticated: false }),
    ));
    render(<GameSyncProvider><StatusProbe /></GameSyncProvider>);
    expect(screen.getByText("모험 기록을 준비하고 있어요")).toBeInTheDocument();
    expect(await screen.findByTestId("sync-status")).toHaveTextContent("local");
  });

  it("creates the child boundary before uploading the first game state", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url === "/api/auth/session") {
        return Response.json({ authenticated: true });
      }
      if (url === "/api/guardian/game-state" && !init?.method) {
        return new Response(JSON.stringify({ error: "empty" }), { status: 404 });
      }
      if (url === "/api/auth/csrf") {
        return Response.json({ csrfToken: "a".repeat(64) });
      }
      if (url === "/api/guardian/children") {
        return Response.json({ child: { id: "primary" } });
      }
      if (url === "/api/guardian/game-state" && init?.method === "PUT") {
        const request = JSON.parse(String(init.body)) as { state: unknown };
        return Response.json({ state: request.state, revision: 1 });
      }
      return new Response(null, { status: 500 });
    }));

    render(<GameSyncProvider><StatusProbe /></GameSyncProvider>);
    await waitFor(() => expect(screen.getByTestId("sync-status")).toHaveTextContent("synced"));
    expect(calls).toEqual([
      "GET /api/auth/session",
      "GET /api/guardian/game-state",
      "GET /api/auth/csrf",
      "POST /api/guardian/children",
      "PUT /api/guardian/game-state",
    ]);
  });
});

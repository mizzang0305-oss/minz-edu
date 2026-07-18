import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameSyncProvider, useGameSyncStatus } from "./GameSyncProvider";
import { ACTIVE_CHILD_PROFILE_KEY } from "@/stores/storage";

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
    expect(screen.getByTestId("sync-status")).toHaveTextContent("checking");
    expect(await screen.findByTestId("sync-status")).toHaveTextContent("local");
  });

  it("renders the game immediately while the guardian session is still being checked", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));

    render(
      <GameSyncProvider>
        <div>바로 시작하는 모험</div>
        <StatusProbe />
      </GameSyncProvider>,
    );

    expect(screen.getByText("바로 시작하는 모험")).toBeVisible();
    expect(screen.getByTestId("sync-status")).toHaveTextContent("checking");
  });

  it("falls back quietly when the optional online session endpoint is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(null, { status: 404 }),
    ));

    render(
      <GameSyncProvider>
        <StatusProbe />
      </GameSyncProvider>,
    );

    expect(await screen.findByTestId("sync-status")).toHaveTextContent("local");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps the active child local while offline and resumes remote sync after reconnecting", async () => {
    let online = false;
    vi.spyOn(window.navigator, "onLine", "get").mockImplementation(() => online);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/session") return Response.json({ authenticated: true });
      if (url === "/api/guardian/children" && !init?.method) {
        return Response.json({ children: [{ id: "primary", displayName: "민표", schoolLevel: "elementary", grade: 5, characterId: "thunder-sword", friendCode: "ABCD2345" }] });
      }
      if (url === "/api/guardian/game-state?childProfileId=primary") return new Response(null, { status: 404 });
      if (url === "/api/auth/csrf") return Response.json({ csrfToken: "c".repeat(64) });
      if (url === "/api/guardian/children" && init?.method === "POST") return Response.json({ child: { id: "primary" } });
      if (url === "/api/guardian/game-state" && init?.method === "PUT") {
        const request = JSON.parse(String(init.body)) as { state: unknown };
        return Response.json({ state: request.state, revision: 1 });
      }
      return new Response(null, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<GameSyncProvider><StatusProbe /></GameSyncProvider>);
    expect(await screen.findByTestId("sync-status")).toHaveTextContent("local");
    expect(fetchMock).not.toHaveBeenCalled();

    online = true;
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(screen.getByTestId("sync-status")).toHaveTextContent("synced"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", expect.any(Object));
  });

  it("creates the child boundary before uploading the first game state", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url === "/api/auth/session") {
        return Response.json({ authenticated: true });
      }
      if (url === "/api/guardian/children" && !init?.method) {
        return Response.json({ children: [{ id: "primary", displayName: "민표", schoolLevel: "elementary", grade: 2, characterId: "thunder-sword", friendCode: "ABCD2345" }] });
      }
      if (url === "/api/guardian/game-state?childProfileId=primary" && !init?.method) {
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
      "GET /api/guardian/children",
      "GET /api/guardian/game-state?childProfileId=primary",
      "GET /api/auth/csrf",
      "POST /api/guardian/children",
      "PUT /api/guardian/game-state",
    ]);
  });

  it("selects an existing remote child before any legacy primary upload", async () => {
    const requests: Array<{ url: string; method: string; body?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      requests.push({ url, method, ...(typeof init?.body === "string" ? { body: init.body } : {}) });
      if (url === "/api/auth/session") return Response.json({ authenticated: true });
      if (url === "/api/guardian/children" && method === "GET") {
        return Response.json({ children: [{ id: "child_second", displayName: "하람", schoolLevel: "kindergarten", grade: 6, characterId: "thunder-sword", friendCode: "EFGH6789" }] });
      }
      if (url === "/api/guardian/game-state?childProfileId=child_second") {
        return new Response(JSON.stringify({ error: "empty" }), { status: 404 });
      }
      if (url === "/api/auth/csrf") return Response.json({ csrfToken: "b".repeat(64) });
      if (url === "/api/guardian/children" && method === "POST") {
        return Response.json({ child: { id: "child_second" } });
      }
      if (url === "/api/guardian/game-state" && method === "PUT") {
        const request = JSON.parse(String(init?.body)) as { state: unknown };
        return Response.json({ state: request.state, revision: 1 });
      }
      return new Response(null, { status: 500 });
    }));

    render(<GameSyncProvider><StatusProbe /></GameSyncProvider>);
    await waitFor(() => expect(screen.getByTestId("sync-status")).toHaveTextContent("synced"));

    expect(localStorage.getItem(ACTIVE_CHILD_PROFILE_KEY)).toBe("child_second");
    expect(requests.some(({ url }) => url.includes("childProfileId=primary"))).toBe(false);
    const profileUpload = requests.find(({ url, method }) => url === "/api/guardian/children" && method === "POST");
    expect(JSON.parse(profileUpload?.body ?? "{}")).toMatchObject({ childProfileId: "child_second" });
  });
});

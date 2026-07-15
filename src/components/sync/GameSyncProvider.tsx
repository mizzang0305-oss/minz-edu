"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { readGameData, writeGameData } from "@/stores/storage";
import {
  applyGameSyncSnapshot,
  createGameSyncSnapshot,
  GAME_DATA_CHANGED_EVENT,
  parseGameSyncSnapshot,
  type GameSyncSnapshot,
} from "@/services/online/gameStateSync";
import { createChildProfileSyncRequest } from "@/services/online/childProfileSync";

export type GameSyncStatus = "checking" | "local" | "syncing" | "synced" | "error";

const GameSyncContext = createContext<GameSyncStatus>("checking");
const SYNC_DELAY_MS = 1_200;
const REQUEST_TIMEOUT_MS = 6_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readResponseState(response: Response): Promise<GameSyncSnapshot | null> {
  const body = await response.json() as unknown;
  if (typeof body !== "object" || body === null || !("state" in body)) return null;
  return parseGameSyncSnapshot((body as { state: unknown }).state);
}

export function GameSyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GameSyncStatus>("checking");
  const authenticated = useRef(false);
  const csrfToken = useRef("");
  const syncedProfileSignature = useRef("");
  const timer = useRef<number | null>(null);
  const syncing = useRef(false);
  const dirtyGeneration = useRef(0);

  useEffect(() => {
    let active = true;

    const getCsrfToken = async () => {
      if (csrfToken.current) return csrfToken.current;
      const response = await fetchWithTimeout("/api/auth/csrf", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("csrf");
      const body = await response.json() as { csrfToken?: unknown };
      if (typeof body.csrfToken !== "string") throw new Error("csrf");
      csrfToken.current = body.csrfToken;
      return body.csrfToken;
    };

    const ensureChildProfile = async () => {
      const profile = readGameData().playerProfile;
      const signature = `${profile.displayName}\u0000${profile.schoolLevel}\u0000${profile.grade}`;
      if (syncedProfileSignature.current === signature) return;
      const token = await getCsrfToken();
      const response = await fetchWithTimeout("/api/guardian/children", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createChildProfileSyncRequest(profile, token)),
      });
      if (!response.ok) throw new Error("profile");
      syncedProfileSignature.current = signature;
    };

    const putState = async () => {
      if (!authenticated.current || syncing.current || !active) return;
      syncing.current = true;
      const generation = dirtyGeneration.current;
      setStatus("syncing");
      try {
        await ensureChildProfile();
        const token = await getCsrfToken();
        const response = await fetchWithTimeout("/api/guardian/game-state", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csrfToken: token, state: createGameSyncSnapshot(readGameData()) }),
        });
        if (response.status === 401) {
          authenticated.current = false;
          if (active) setStatus("local");
          return;
        }
        if (!response.ok) throw new Error("sync");
        const remote = await readResponseState(response);
        if (!remote) throw new Error("response");
        const merged = applyGameSyncSnapshot(readGameData(), remote);
        writeGameData(merged, false);
        if (active) setStatus("synced");
        if (dirtyGeneration.current !== generation) scheduleSync();
      } catch {
        if (active) setStatus("error");
      } finally {
        syncing.current = false;
      }
    };

    const scheduleSync = () => {
      if (!authenticated.current || !active) return;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void putState();
      }, SYNC_DELAY_MS);
    };

    const onGameDataChanged = () => {
      dirtyGeneration.current += 1;
      scheduleSync();
    };

    const onOnline = () => {
      csrfToken.current = "";
      scheduleSync();
    };

    const bootstrap = async () => {
      try {
        const sessionResponse = await fetchWithTimeout("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!sessionResponse.ok) throw new Error("session");
        const session = await sessionResponse.json() as { authenticated?: unknown };
        if (session.authenticated !== true) {
          if (active) setStatus("local");
          return;
        }
        const response = await fetchWithTimeout("/api/guardian/game-state", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (response.status === 401) {
          if (active) setStatus("local");
          return;
        }
        if (response.ok) {
          const remote = await readResponseState(response);
          if (!remote) throw new Error("response");
          writeGameData(applyGameSyncSnapshot(readGameData(), remote), false);
        } else if (response.status !== 404) {
          throw new Error("bootstrap");
        }

        authenticated.current = true;
        dirtyGeneration.current += 1;
        await putState();
      } catch {
        if (active) setStatus("error");
      }
    };

    window.addEventListener(GAME_DATA_CHANGED_EVENT, onGameDataChanged);
    window.addEventListener("online", onOnline);
    void bootstrap();
    return () => {
      active = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
      window.removeEventListener(GAME_DATA_CHANGED_EVENT, onGameDataChanged);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const contextValue = useMemo(() => status, [status]);
  return (
    <GameSyncContext.Provider value={contextValue}>
      {status === "checking" ? (
        <main className="game-sync-loading" aria-live="polite">
          <span aria-hidden="true">✦</span>
          <strong>모험 기록을 준비하고 있어요</strong>
        </main>
      ) : children}
      {(status === "syncing" || status === "error") && (
        <div className={`game-sync-toast ${status}`} role="status" aria-live="polite">
          {status === "syncing" ? "모험 기록을 안전하게 저장하는 중…" : "기록은 이 기기에 보관했어요. 인터넷이 연결되면 다시 저장할게요."}
        </div>
      )}
    </GameSyncContext.Provider>
  );
}

export function useGameSyncStatus() {
  return useContext(GameSyncContext);
}

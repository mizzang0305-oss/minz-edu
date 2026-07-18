"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIVE_CHILD_CHANGED_EVENT,
  activateChildProfile,
  getActiveChildProfileId,
  readGameData,
  writeGameData,
} from "@/stores/storage";
import {
  applyGameSyncSnapshot,
  createGameSyncSnapshot,
  GAME_DATA_CHANGED_EVENT,
  parseGameSyncSnapshot,
  type GameSyncSnapshot,
} from "@/services/online/gameStateSync";
import { createChildProfileSyncRequest, type SafeChildProfile } from "@/services/online/childProfileSync";

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

async function readSyncFailureCode(response: Response) {
  try {
    const body = await response.clone().json() as { code?: unknown };
    if (typeof body.code === "string" && /^SYNC_[A-Z_]+$/.test(body.code)) return body.code;
  } catch {
    // The status code remains enough for a privacy-safe fallback.
  }
  return `SYNC_HTTP_${response.status}`;
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

    const ensureChildProfile = async (childProfileId: string) => {
      const profile = readGameData(childProfileId).playerProfile;
      const signature = `${childProfileId}\u0000${profile.displayName}\u0000${profile.schoolLevel}\u0000${profile.grade}`;
      if (syncedProfileSignature.current === signature) return;
      const token = await getCsrfToken();
      const response = await fetchWithTimeout("/api/guardian/children", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createChildProfileSyncRequest(profile, token, "thunder-sword", childProfileId)),
      });
      if (!response.ok) throw new Error("profile");
      syncedProfileSignature.current = signature;
    };

    const putState = async () => {
      if (!authenticated.current || !active) return;
      if (syncing.current) {
        dirtyGeneration.current += 1;
        scheduleSync();
        return;
      }
      syncing.current = true;
      const childProfileId = getActiveChildProfileId();
      const generation = dirtyGeneration.current;
      setStatus("syncing");
      try {
        await ensureChildProfile(childProfileId);
        const token = await getCsrfToken();
        const response = await fetchWithTimeout("/api/guardian/game-state", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childProfileId,
            csrfToken: token,
            state: createGameSyncSnapshot(readGameData(childProfileId)),
          }),
        });
        if (response.status === 401) {
          authenticated.current = false;
          if (active) setStatus("local");
          return;
        }
        if (!response.ok) {
          const code = await readSyncFailureCode(response);
          console.warn("game_state_sync_rejected", { code, status: response.status });
          throw new Error(code);
        }
        const remote = await readResponseState(response);
        if (!remote) throw new Error("response");
        const merged = applyGameSyncSnapshot(readGameData(childProfileId), remote);
        writeGameData(merged, false, childProfileId);
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
      if (!authenticated.current) {
        void bootstrap();
        return;
      }
      scheduleSync();
    };

    const bootstrap = async () => {
      if (!window.navigator.onLine) {
        if (active) setStatus("local");
        return;
      }
      try {
        const sessionResponse = await fetchWithTimeout("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!sessionResponse.ok) {
          if ([401, 404, 503].includes(sessionResponse.status)) {
            if (active) setStatus("local");
            return;
          }
          throw new Error("session");
        }
        const session = await sessionResponse.json() as { authenticated?: unknown };
        if (session.authenticated !== true) {
          if (active) setStatus("local");
          return;
        }
        authenticated.current = true;
        let childProfileId = getActiveChildProfileId();
        const childrenResponse = await fetchWithTimeout("/api/guardian/children", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!childrenResponse.ok) throw new Error("children");
        const childList = await childrenResponse.json() as { children?: SafeChildProfile[] };
        const remoteChildren = Array.isArray(childList.children) ? childList.children : [];
        if (remoteChildren.length > 0 && !remoteChildren.some((child) => child.id === childProfileId)) {
          if (activateChildProfile(remoteChildren[0])) return;
          childProfileId = remoteChildren[0].id;
        }
        const response = await fetchWithTimeout(`/api/guardian/game-state?childProfileId=${encodeURIComponent(childProfileId)}`, {
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
          if (getActiveChildProfileId() !== childProfileId) return;
          writeGameData(applyGameSyncSnapshot(readGameData(childProfileId), remote), false, childProfileId);
        } else if (response.status !== 404) {
          throw new Error("bootstrap");
        }

        dirtyGeneration.current += 1;
        await putState();
      } catch {
        if (active) setStatus("error");
      }
    };

    const onActiveChildChanged = () => {
      syncedProfileSignature.current = "";
      dirtyGeneration.current += 1;
      if (active) setStatus("checking");
      void bootstrap();
    };

    window.addEventListener(GAME_DATA_CHANGED_EVENT, onGameDataChanged);
    window.addEventListener(ACTIVE_CHILD_CHANGED_EVENT, onActiveChildChanged);
    window.addEventListener("online", onOnline);
    void bootstrap();
    return () => {
      active = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
      window.removeEventListener(GAME_DATA_CHANGED_EVENT, onGameDataChanged);
      window.removeEventListener(ACTIVE_CHILD_CHANGED_EVENT, onActiveChildChanged);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const contextValue = useMemo(() => status, [status]);
  return (
    <GameSyncContext.Provider value={contextValue}>
      {children}
      {(status === "syncing" || status === "error") && (
        <div className={`game-sync-toast ${status}`} role="status" aria-live="polite" aria-atomic="true">
          {status === "syncing" ? "모험 기록을 안전하게 저장하는 중…" : "기록은 이 기기에 보관했어요. 인터넷이 연결되면 다시 저장할게요."}
        </div>
      )}
    </GameSyncContext.Provider>
  );
}

export function useGameSyncStatus() {
  return useContext(GameSyncContext);
}

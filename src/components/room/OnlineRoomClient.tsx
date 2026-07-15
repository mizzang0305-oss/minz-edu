"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { doc, onSnapshot, type Timestamp } from "firebase/firestore";
import { bootstrapOnlineFirebaseAuth } from "@/lib/firebase/client";
import { getOnlineFirestore } from "@/lib/firebase/firestore";
import { normalizeRoomCode } from "@/services/online/roomCode";
import type { PublicRoom } from "@/services/online/serverRoom";

type Props = {
  accountConnected: boolean;
};

type FirestoreRoomSnapshot = {
  roomCode: string;
  status: PublicRoom["status"];
  players: Array<{
    displayName: string;
    characterId: string;
    ready: boolean;
    connected: boolean;
  }>;
  bossHp: number;
  teamLinkGauge: number;
  revision: number;
  expiresAt: Timestamp;
};

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("보안 확인을 시작하지 못했습니다.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

function fromFirestore(id: string, value: FirestoreRoomSnapshot): PublicRoom {
  return {
    id,
    roomCode: value.roomCode,
    status: value.status,
    players: value.players.map((player, index) => ({
      slot: index + 1,
      displayName: player.displayName,
      characterId: player.characterId,
      ready: player.ready,
      connected: player.connected,
    })),
    bossHp: value.bossHp,
    teamLinkGauge: value.teamLinkGauge,
    revision: value.revision,
    expiresAt: value.expiresAt.toMillis(),
  };
}

async function readRoomError(response: Response, fallback: string) {
  try {
    const result = (await response.json()) as { error?: unknown };
    return typeof result.error === "string" && result.error ? result.error : fallback;
  } catch {
    return fallback;
  }
}

function isTerminalRoomStatus(status: number) {
  return status === 401 || status === 403 || status === 404 || status === 409 || status === 410;
}

export function OnlineRoomClient({ accountConnected }: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [message, setMessage] = useState("");
  const [realtimeState, setRealtimeState] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "error">("idle");

  useEffect(() => {
    if (!room?.id) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void bootstrapOnlineFirebaseAuth()
      .then(() => {
        if (!active) return;
        unsubscribe = onSnapshot(
          doc(getOnlineFirestore(), "rooms", room.id),
          (snapshot) => {
            if (!active) return;
            if (!snapshot.exists()) {
              setMessage("친구 방을 찾지 못했습니다. 새 방을 만들어 주세요.");
              setRealtimeState("error");
              setRoom(null);
              return;
            }
            try {
              const nextRoom = fromFirestore(snapshot.id, snapshot.data() as FirestoreRoomSnapshot);
              if (nextRoom.expiresAt <= Date.now()) {
                setMessage("친구 방의 30분 이용 시간이 끝났어요. 새 방을 만들어 주세요.");
                setRealtimeState("error");
                setRoom(null);
                return;
              }
              setRoom(nextRoom);
              setRealtimeState("connected");
            } catch {
              setRealtimeState("reconnecting");
            }
          },
          () => {
            if (active) setRealtimeState("reconnecting");
          },
        );
      })
      .catch(() => {
        if (active) setRealtimeState("reconnecting");
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [room?.id]);

  useEffect(() => {
    if (!room?.id) return;
    let active = true;
    let disconnectedAt: number | null = null;
    let heartbeatPending = false;

    const heartbeat = async () => {
      if (heartbeatPending) return;
      heartbeatPending = true;
      try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/rooms/${room.id}/presence`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csrfToken }),
        });
        if (!response.ok) {
          const errorMessage = await readRoomError(response, "친구 방 연결을 확인하지 못했습니다.");
          if (active && isTerminalRoomStatus(response.status)) {
            setMessage(errorMessage);
            setRealtimeState("error");
            setRoom(null);
            return;
          }
          throw new Error(errorMessage);
        }
        if (!active) return;
        disconnectedAt = null;
        setRealtimeState("connected");
      } catch {
        if (!active) return;
        disconnectedAt ??= Date.now();
        setRealtimeState(
          Date.now() - disconnectedAt >= 60_000 ? "error" : "reconnecting",
        );
      } finally {
        heartbeatPending = false;
      }
    };

    const handleOffline = () => {
      disconnectedAt ??= Date.now();
      setRealtimeState("reconnecting");
    };
    const handleOnline = () => void heartbeat();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void heartbeat();
    };

    void heartbeat();
    const interval = window.setInterval(() => void heartbeat(), 20_000);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [room?.id]);

  async function sendRoomRequest(endpoint: "/api/rooms" | "/api/rooms/join") {
    setBusy(endpoint === "/api/rooms" ? "create" : "join");
    setMessage("");
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childProfileId: "primary",
          ...(endpoint.endsWith("join") ? { roomCode } : {}),
          csrfToken,
        }),
      });
      const result = (await response.json()) as { room?: PublicRoom; error?: string };
      if (!response.ok || !result.room) throw new Error(result.error ?? "친구 방 요청에 실패했습니다.");
      setRealtimeState("connecting");
      setRoom(result.room);
      setRoomCode(result.room.roomCode);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "친구 방 요청에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  if (!accountConnected) {
    return (
      <main className="room-page">
        <span className="eyebrow">온라인 협동 · Phase 11-C</span>
        <h1>보호자 계정 연결 후 친구 방을 열 수 있어요</h1>
        <p>두 기기 모두 보호자 Google 계정으로 연결한 뒤, 한쪽에서 만든 6자리 참가 코드를 다른 기기에 입력합니다.</p>
        <div className="room-actions">
          <Link href="/login" className="primary-button">보호자 Google 로그인</Link>
          <Link href="/setup" className="secondary-button">로컬 협동 계속하기</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="room-page game-room-page">
      <section className="room-hero"><div><span className="eyebrow">ONLINE PARTY LOBBY</span><h1>친구와 파티를<br />만들어 모험을 시작해요</h1><p>한 명은 방을 만들고, 다른 친구는 6자리 코드를 입력하면 바로 같은 파티에 모입니다.</p></div><div className="room-hero-party" aria-hidden="true"><Image src="/game-assets/duelyst/hero-thunder.webp" alt="" width="420" height="304" /><Image src="/game-assets/duelyst/hero-magic.webp" alt="" width="420" height="304" /></div></section>

      {!room ? (
        <section className="online-room-controls">
          <article>
            <Image className="room-choice-hero" src="/game-assets/duelyst/hero-thunder.webp" alt="방을 만드는 번개 영웅" width="420" height="304" />
            <span className="room-choice-label">1P · 방장</span>
            <h2>내가 파티 만들기</h2>
            <p>버튼을 누르면 친구에게 보여 줄 6자리 코드가 나타나요.</p>
            <button
              type="button"
              className="primary-button wide"
              disabled={busy !== null}
              onClick={() => sendRoomRequest("/api/rooms")}
            >
              {busy === "create" ? "파티 만드는 중…" : "파티 코드 만들기"}
            </button>
          </article>
          <article>
            <Image className="room-choice-hero" src="/game-assets/duelyst/hero-magic.webp" alt="친구 파티에 합류하는 마법 영웅" width="420" height="304" />
            <span className="room-choice-label">2P · 친구</span>
            <h2>친구 파티에 합류</h2>
            <label htmlFor="room-code">친구 화면의 6자리 코드</label>
            <input
              id="room-code"
              value={roomCode}
              maxLength={8}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="예: ABCD23"
              onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
            />
            <button
              type="button"
              className="secondary-button wide"
              disabled={busy !== null || roomCode.length !== 6}
              onClick={() => sendRoomRequest("/api/rooms/join")}
            >
              {busy === "join" ? "합류하는 중…" : "파티에 합류하기"}
            </button>
          </article>
        </section>
      ) : (
        <section className="online-lobby" aria-live="polite">
          <div className="room-code-card">
            <span>친구에게 알려줄 코드</span>
            <strong>{room.roomCode}</strong>
            <small>30분 뒤 자동 만료</small>
          </div>
          <div className="realtime-chip" data-state={realtimeState}>
            {realtimeState === "connected"
              ? "실시간 연결됨"
              : realtimeState === "reconnecting"
                ? "재접속 중 · 60초 동안 보호"
                : realtimeState === "error"
                  ? "60초 초과 · 다시 연결해 주세요"
                  : "실시간 연결 중"}
          </div>
          <div className="lobby-players">
            {room.players.map((player) => (
              <article key={`${player.slot}-${player.displayName}`}>
                <span>{player.slot}P</span>
                <strong>{player.displayName}</strong>
                <small>{player.connected ? "기기 연결됨" : "재접속 기다리는 중"}</small>
              </article>
            ))}
            {room.players.length < 2 && (
              <article className="waiting-player">
                <span>2P</span>
                <strong>친구를 기다리는 중</strong>
                <small>다른 기기에서 코드를 입력해 주세요.</small>
              </article>
            )}
          </div>
          <p className="lobby-note">두 보호자가 확인된 뒤에만 전투 시작 버튼이 열립니다. 현재 단계에서는 방 입장과 실시간 동기화까지만 작동합니다.</p>
        </section>
      )}

      {message && <p className="login-error" role="alert">{message}</p>}
      <div className="room-safety-note"><strong>보호자 안심 설정</strong><p>친구 검색과 공개 채팅 없이, 서로 아는 보호자가 코드를 직접 전달할 때만 연결됩니다.</p></div>
    </main>
  );
}

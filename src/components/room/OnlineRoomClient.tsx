"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { doc, onSnapshot, type Timestamp } from "firebase/firestore";
import { bootstrapOnlineFirebaseAuth } from "@/lib/firebase/client";
import { getOnlineFirestore } from "@/lib/firebase/firestore";
import { normalizeRoomCode } from "@/services/online/roomCode";
import type { OnlineBattleCommandType, PublicRoom } from "@/services/online/serverRoom";
import { getActiveChildProfileId } from "@/stores/storage";

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
    specialReady?: boolean;
    correctAnswers?: number;
    hintsSent?: number;
  }>;
  bossHp: number;
  teamLinkGauge: number;
  activePlayerIndex?: number;
  questionId?: string;
  questionPrompt?: string;
  questionChoices?: string[];
  questionHint?: string;
  lastActionMessage?: string;
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

function fromFirestore(id: string, value: FirestoreRoomSnapshot, viewerSlot: number): PublicRoom {
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
      specialReady: player.specialReady ?? false,
      correctAnswers: player.correctAnswers ?? 0,
      hintsSent: player.hintsSent ?? 0,
    })),
    bossHp: value.bossHp,
    teamLinkGauge: value.teamLinkGauge,
    activePlayerSlot: (value.activePlayerIndex ?? 0) + 1,
    currentQuestion: value.status === "battle" && value.questionId && value.questionPrompt && Array.isArray(value.questionChoices)
      ? { id: value.questionId, prompt: value.questionPrompt, choices: value.questionChoices, hint: value.questionHint ?? "친구와 풀이 단서를 나눠 보세요." }
      : null,
    lastActionMessage: value.lastActionMessage ?? "친구 방 상태를 동기화하고 있어요.",
    viewerSlot,
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
  const [actionBusy, setActionBusy] = useState(false);
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
              const nextRoom = fromFirestore(snapshot.id, snapshot.data() as FirestoreRoomSnapshot, room.viewerSlot);
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
  }, [room?.id, room?.viewerSlot]);

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
          childProfileId: getActiveChildProfileId(),
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

  async function sendBattleAction(type: OnlineBattleCommandType, choice?: string) {
    if (!room || actionBusy) return;
    setActionBusy(true);
    setMessage("");
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/rooms/${room.id}/battle`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrfToken,
          eventId: crypto.randomUUID(),
          expectedRevision: room.revision,
          type,
          ...(choice ? { choice } : {}),
        }),
      });
      const result = (await response.json()) as { room?: PublicRoom; error?: string };
      if (!response.ok || !result.room) throw new Error(result.error ?? "팀전 행동을 동기화하지 못했습니다.");
      setRoom(result.room);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "팀전 행동을 동기화하지 못했습니다.");
    } finally {
      setActionBusy(false);
    }
  }

  if (!accountConnected) {
    return (
      <main className="room-page">
        <span className="eyebrow">온라인 파티 연결 · 보호자 승인 필요</span>
        <h1>보호자 계정 연결 후 친구 방을 열 수 있어요</h1>
        <p>보호자 계정으로 방을 만든 뒤 두 기기에서 준비하면 턴 기반 실시간 팀전을 시작할 수 있습니다.</p>
        <div className="room-actions">
          <Link href="/login" className="primary-button">보호자 Google 로그인</Link>
          <Link href="/setup" className="secondary-button">같은 화면 팀전 설정</Link>
        </div>
      </main>
    );
  }

  const viewerPlayer = room?.players.find((player) => player.slot === room.viewerSlot);
  const isMyTurn = room?.status === "battle" && room.activePlayerSlot === room.viewerSlot;

  return (
    <main className="room-page game-room-page">
      <section className="room-hero"><div><span className="eyebrow">ONLINE REALTIME TEAM BATTLE</span><h1>친구와 파티를<br />만들어 모험을 시작해요</h1><p>6자리 코드로 모인 뒤, 문제 차례와 팀 게이지가 두 기기에 같은 revision으로 동기화됩니다.</p></div><div className="room-hero-party" aria-hidden="true"><Image src="/game-assets/duelyst/hero-thunder.webp" alt="" width="420" height="304" /><Image src="/game-assets/duelyst/hero-magic.webp" alt="" width="420" height="304" /></div></section>

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
                <small>{player.connected ? `기기 연결됨 · 성공 ${player.correctAnswers} · 도움 ${player.hintsSent}` : "재접속 기다리는 중"}</small>
                {room.status !== "battle" && <em>{player.ready ? "준비 완료" : "준비 대기"}</em>}
                {room.status === "battle" && player.specialReady && <em>필살기 준비 완료</em>}
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
          {room.status === "battle" && room.currentQuestion ? (
            <section className="online-team-battle" aria-label="실시간 온라인 팀전">
              <div className="online-battle-gauges">
                <div><span>보스 HP</span><progress max="150" value={room.bossHp} /><strong>{room.bossHp} / 150</strong></div>
                <div><span>팀 링크</span><progress max="100" value={room.teamLinkGauge} /><strong>{room.teamLinkGauge} / 100</strong></div>
              </div>
              <div className="online-turn-card">
                <span>{isMyTurn ? "내 공격 차례" : `${room.activePlayerSlot}P 공격 차례`}</span>
                <h2>{room.currentQuestion.prompt}</h2>
                {isMyTurn ? (
                  <div className="online-answer-grid">
                    {room.currentQuestion.choices.map((choice) => (
                      <button key={choice} type="button" disabled={actionBusy} onClick={() => sendBattleAction("ANSWER_SUBMIT", choice)}>{choice}</button>
                    ))}
                  </div>
                ) : (
                  <button type="button" className="secondary-button" disabled={actionBusy} onClick={() => sendBattleAction("HINT_SEND")}>풀이 단서 보내기</button>
                )}
              </div>
              {room.teamLinkGauge >= 75 && (
                <div className="online-special-card">
                  <strong>팀 필살기 충전 완료</strong>
                  <p>두 기기에서 준비를 누르면 서버가 동시에 확인한 뒤 보스에게 큰 피해를 줍니다.</p>
                  <button type="button" className="primary-button" disabled={actionBusy || viewerPlayer?.specialReady} onClick={() => sendBattleAction("SPECIAL_READY")}>{viewerPlayer?.specialReady ? "친구 준비 기다리는 중" : "팀 필살기 준비"}</button>
                </div>
              )}
              <p className="online-action-log" role="status">{room.lastActionMessage}</p>
            </section>
          ) : room.status === "reward" ? (
            <section className="online-battle-result">
              <span>TEAM BATTLE COMPLETE</span>
              <h2>두 기기의 전투 상태가 끝까지 동기화됐어요!</h2>
              <p>{room.lastActionMessage}</p>
              <button type="button" className="primary-button" disabled={actionBusy || viewerPlayer?.ready} onClick={() => sendBattleAction("PLAYER_READY")}>{viewerPlayer?.ready ? "친구 재도전 준비 대기" : "다시 도전 준비"}</button>
            </section>
          ) : (
            <section className="online-ready-card">
              <h2>{room.players.length < 2 ? "친구가 들어오는 동안 먼저 준비할 수 있어요" : "두 용사가 준비하면 팀전이 자동 시작돼요"}</h2>
              <p>{room.lastActionMessage}</p>
              <button type="button" className="primary-button" disabled={actionBusy || viewerPlayer?.ready} onClick={() => sendBattleAction("PLAYER_READY")}>{viewerPlayer?.ready ? "준비 완료 · 친구 대기" : "온라인 팀전 준비"}</button>
            </section>
          )}
          <div className="room-actions"><Link href="/setup" className="secondary-button">같은 화면 팀전으로 전환</Link></div>
        </section>
      )}

      {message && <p className="login-error" role="alert">{message}</p>}
      <div className="room-safety-note"><strong>보호자 안심 설정</strong><p>친구 검색과 공개 채팅 없이, 서로 아는 보호자가 코드를 직접 전달할 때만 연결됩니다.</p></div>
    </main>
  );
}

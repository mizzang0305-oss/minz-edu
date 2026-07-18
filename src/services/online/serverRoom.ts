import { randomInt, randomUUID } from "node:crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { normalizeRoomCode } from "./roomCode";
import { readSafeStoredChildProfile } from "./childProfileSync";
import type { SchoolLevel } from "@/types/learning";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_MS = 30 * 60 * 1000;
export const PRESENCE_TIMEOUT_MS = 60 * 1000;

type OnlineBattleQuestion = {
  id: string;
  prompt: string;
  choices: [string, string, string];
  answer: string;
  hint: string;
};

const ONLINE_BATTLE_QUESTIONS: Record<"early" | "elementary" | "middle", OnlineBattleQuestion[]> = {
  early: [
    { id: "early-count-1", prompt: "별 2개와 별 1개를 모으면 몇 개일까요?", choices: ["2개", "3개", "4개"], answer: "3개", hint: "2 다음 수를 하나 더 세어 봐요." },
    { id: "early-shape-1", prompt: "뾰족한 꼭짓점이 3개인 모양은?", choices: ["세모", "네모", "동그라미"], answer: "세모", hint: "뾰족한 곳을 하나씩 세어 봐요." },
    { id: "early-pattern-1", prompt: "빨강, 파랑, 빨강 다음 색은?", choices: ["노랑", "파랑", "초록"], answer: "파랑", hint: "두 색이 번갈아 나와요." },
    { id: "early-story-1", prompt: "손을 씻을 때 가장 먼저 할 일은?", choices: ["물을 틀어요", "수건으로 닦아요", "밖으로 나가요"], answer: "물을 틀어요", hint: "손 씻기의 시작을 떠올려요." },
    { id: "early-count-2", prompt: "사과 5개에서 1개를 먹으면 몇 개가 남을까요?", choices: ["3개", "4개", "5개"], answer: "4개", hint: "5에서 하나 전 수를 말해 봐요." },
    { id: "early-word-1", prompt: "친구에게 장난감을 빌리고 싶을 때 알맞은 말은?", choices: ["빌려줄래?", "저리 가", "몰라"], answer: "빌려줄래?", hint: "친구가 알아듣기 좋은 말을 골라요." },
  ],
  elementary: [
    { id: "elementary-place-1", prompt: "352에서 5가 나타내는 값은?", choices: ["5", "50", "500"], answer: "50", hint: "5는 십의 자리에 있어요." },
    { id: "elementary-add-1", prompt: "28 + 17은?", choices: ["35", "45", "55"], answer: "45", hint: "8과 7을 더할 때 10을 먼저 만들어요." },
    { id: "elementary-fraction-1", prompt: "1/2과 같은 크기의 분수는?", choices: ["2/4", "2/3", "3/4"], answer: "2/4", hint: "분자와 분모에 같은 수를 곱해요." },
    { id: "elementary-main-1", prompt: "문단에서 가장 중요한 생각을 담은 문장은?", choices: ["중심 문장", "인사말", "쪽수"], answer: "중심 문장", hint: "다른 문장들이 설명하는 핵심을 찾아요." },
    { id: "elementary-english-1", prompt: "‘I played soccer yesterday.’의 뜻은?", choices: ["어제 축구를 했다", "내일 축구를 한다", "지금 책을 읽는다"], answer: "어제 축구를 했다", hint: "yesterday는 어제를 뜻해요." },
    { id: "elementary-ratio-1", prompt: "빨간 구슬 2개와 파란 구슬 3개의 비는?", choices: ["2:3", "3:2", "5:3"], answer: "2:3", hint: "말한 순서대로 두 수를 써요." },
  ],
  middle: [
    { id: "middle-integer-1", prompt: "(-4) + 7의 값은?", choices: ["-11", "3", "11"], answer: "3", hint: "수직선에서 -4에서 오른쪽으로 7칸 이동하세요." },
    { id: "middle-equation-1", prompt: "3x + 2 = 14일 때 x는?", choices: ["3", "4", "5"], answer: "4", hint: "양변에서 2를 뺀 뒤 3으로 나누세요." },
    { id: "middle-function-1", prompt: "y=2x+1에서 x=3일 때 y는?", choices: ["6", "7", "8"], answer: "7", hint: "x 자리에 3을 대입하세요." },
    { id: "middle-english-1", prompt: "‘The game was canceled because it snowed.’의 원인은?", choices: ["눈이 왔다", "게임이 어려웠다", "선수가 늦었다"], answer: "눈이 왔다", hint: "because 뒤가 원인입니다." },
    { id: "middle-real-1", prompt: "√49의 값은?", choices: ["6", "7", "14"], answer: "7", hint: "어떤 수를 제곱하면 49가 되는지 생각하세요." },
    { id: "middle-opinion-1", prompt: "주장을 더 설득력 있게 만드는 것은?", choices: ["관련된 근거와 예시", "같은 말만 반복", "출처 없는 소문"], answer: "관련된 근거와 예시", hint: "확인 가능하고 주장과 직접 관련된 내용을 찾으세요." },
  ],
};

export const ONLINE_BATTLE_COMMAND_TYPES = ["PLAYER_READY", "ANSWER_SUBMIT", "HINT_SEND", "SPECIAL_READY"] as const;
export type OnlineBattleCommandType = (typeof ONLINE_BATTLE_COMMAND_TYPES)[number];
export type OnlineBattleCommand = {
  eventId: string;
  expectedRevision: number;
  type: OnlineBattleCommandType;
  choice?: string;
};

export type ServerRoomPlayer = {
  guardianUid: string;
  childProfileId: string;
  displayName: string;
  schoolLevel: SchoolLevel;
  grade: number;
  characterId: string;
  ready: boolean;
  specialReady: boolean;
  correctAnswers: number;
  hintsSent: number;
  connected: boolean;
  lastSeenAt: Timestamp;
};

export type ServerRoom = {
  roomCode: string;
  hostGuardianUid: string;
  guardianUids: string[];
  players: ServerRoomPlayer[];
  status: "waiting" | "ready" | "battle" | "special" | "reward" | "closed";
  bossHp: number;
  teamLinkGauge: number;
  activePlayerIndex: number;
  questionIndex: number;
  questionId: string;
  questionPrompt: string;
  questionChoices: string[];
  questionHint: string;
  lastActionMessage: string;
  revision: number;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PublicRoom = {
  id: string;
  roomCode: string;
  status: ServerRoom["status"];
  players: Array<{
    slot: number;
    displayName: string;
    characterId: string;
    ready: boolean;
    connected: boolean;
    specialReady: boolean;
    correctAnswers: number;
    hintsSent: number;
  }>;
  bossHp: number;
  teamLinkGauge: number;
  activePlayerSlot: number;
  currentQuestion: {
    id: string;
    prompt: string;
    choices: string[];
    hint: string;
  } | null;
  lastActionMessage: string;
  viewerSlot: number;
  revision: number;
  expiresAt: number;
};

export class RoomServiceError extends Error {
  constructor(
    public readonly code:
      | "CHILD_NOT_FOUND"
      | "ROOM_NOT_FOUND"
      | "ROOM_EXPIRED"
      | "ROOM_FULL"
      | "ROOM_CLOSED"
      | "NOT_MEMBER"
      | "CODE_COLLISION"
      | "REVISION_CONFLICT"
      | "INVALID_ACTION"
      | "NOT_YOUR_TURN"
      | "BATTLE_NOT_READY",
  ) {
    super(code);
  }
}

function generateRoomCode() {
  return Array.from(
    { length: 6 },
    () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
  ).join("");
}

function questionTier(player: Pick<ServerRoomPlayer, "schoolLevel">) {
  if (player.schoolLevel === "kindergarten") return "early" as const;
  if (player.schoolLevel === "middle") return "middle" as const;
  return "elementary" as const;
}

function questionForPlayer(player: ServerRoomPlayer, questionIndex: number) {
  const questions = ONLINE_BATTLE_QUESTIONS[questionTier(player)];
  return questions[questionIndex % questions.length];
}

function currentQuestionFields(player: ServerRoomPlayer, questionIndex: number) {
  const question = questionForPlayer(player, questionIndex);
  return {
    questionId: question.id,
    questionPrompt: question.prompt,
    questionChoices: [...question.choices],
    questionHint: question.hint,
  };
}

function toPublicRoom(id: string, room: ServerRoom, now: number, viewerGuardianUid: string): PublicRoom {
  const viewerIndex = room.players.findIndex((player) => player.guardianUid === viewerGuardianUid);
  return {
    id,
    roomCode: room.roomCode,
    status: room.status,
    players: room.players.map((player, index) => ({
      slot: index + 1,
      displayName: player.displayName,
      characterId: player.characterId,
      ready: player.ready,
      specialReady: player.specialReady ?? false,
      correctAnswers: player.correctAnswers ?? 0,
      hintsSent: player.hintsSent ?? 0,
      connected:
        player.connected && now - player.lastSeenAt.toMillis() <= PRESENCE_TIMEOUT_MS,
    })),
    bossHp: room.bossHp,
    teamLinkGauge: room.teamLinkGauge,
    activePlayerSlot: (room.activePlayerIndex ?? 0) + 1,
    currentQuestion: room.status === "battle" && room.questionId
      ? {
          id: room.questionId,
          prompt: room.questionPrompt,
          choices: room.questionChoices,
          hint: room.questionHint,
        }
      : null,
    lastActionMessage: room.lastActionMessage ?? "친구를 기다리고 있어요.",
    viewerSlot: viewerIndex + 1,
    revision: room.revision,
    expiresAt: room.expiresAt.toMillis(),
  };
}

async function getChildProfile(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
) {
  const snapshot = await firestore
    .collection("guardians")
    .doc(guardianUid)
    .collection("children")
    .doc(childProfileId)
    .get();
  if (!snapshot.exists) throw new RoomServiceError("CHILD_NOT_FOUND");
  const child = readSafeStoredChildProfile(childProfileId, snapshot.data());
  if (!child) throw new RoomServiceError("CHILD_NOT_FOUND");
  return child;
}

export async function createOnlineRoom(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
  now = Date.now(),
): Promise<PublicRoom> {
  const child = await getChildProfile(firestore, guardianUid, childProfileId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomId = randomUUID();
    const roomCode = generateRoomCode();
    const roomRef = firestore.collection("rooms").doc(roomId);
    const codeRef = firestore.collection("roomCodes").doc(roomCode);
    const timestamp = Timestamp.fromMillis(now);
    const room: ServerRoom = {
      roomCode,
      hostGuardianUid: guardianUid,
      guardianUids: [guardianUid],
      players: [
        {
          guardianUid,
          childProfileId,
          displayName: child.displayName,
          schoolLevel: child.schoolLevel,
          grade: child.grade,
          characterId: child.characterId,
          ready: false,
          specialReady: false,
          correctAnswers: 0,
          hintsSent: 0,
          connected: true,
          lastSeenAt: timestamp,
        },
      ],
      status: "waiting",
      bossHp: 250,
      teamLinkGauge: 0,
      activePlayerIndex: 0,
      questionIndex: 0,
      questionId: "",
      questionPrompt: "",
      questionChoices: [],
      questionHint: "",
      lastActionMessage: "친구를 기다리고 있어요.",
      revision: 0,
      expiresAt: Timestamp.fromMillis(now + ROOM_TTL_MS),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await firestore.runTransaction(async (transaction) => {
        const existingCode = await transaction.get(codeRef);
        if (existingCode.exists) throw new RoomServiceError("CODE_COLLISION");
        transaction.create(codeRef, { roomId, expiresAt: room.expiresAt });
        transaction.create(roomRef, room);
      });
      return toPublicRoom(roomId, room, now, guardianUid);
    } catch (error) {
      if (error instanceof RoomServiceError && error.code === "CODE_COLLISION") continue;
      throw error;
    }
  }

  throw new RoomServiceError("CODE_COLLISION");
}

export async function joinOnlineRoom(
  firestore: Firestore,
  guardianUid: string,
  childProfileId: string,
  rawRoomCode: string,
  now = Date.now(),
): Promise<PublicRoom> {
  const roomCode = normalizeRoomCode(rawRoomCode);
  const child = await getChildProfile(firestore, guardianUid, childProfileId);
  const codeRef = firestore.collection("roomCodes").doc(roomCode);
  const codeSnapshot = await codeRef.get();
  if (!codeSnapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");

  const roomId = String(codeSnapshot.data()?.roomId ?? "");
  const roomRef = firestore.collection("rooms").doc(roomId);
  const timestamp = Timestamp.fromMillis(now);

  const room = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");
    const current = snapshot.data() as ServerRoom;
    if (current.expiresAt.toMillis() <= now) throw new RoomServiceError("ROOM_EXPIRED");
    if (current.status !== "waiting" && current.status !== "ready") {
      throw new RoomServiceError("ROOM_CLOSED");
    }

    const existingIndex = current.guardianUids.indexOf(guardianUid);
    if (existingIndex >= 0) return current;
    if (current.guardianUids.length >= 2) throw new RoomServiceError("ROOM_FULL");

    const next: ServerRoom = {
      ...current,
      guardianUids: [...current.guardianUids, guardianUid],
      players: [
        ...current.players,
        {
          guardianUid,
          childProfileId,
          displayName: child.displayName,
          schoolLevel: child.schoolLevel,
          grade: child.grade,
          characterId: child.characterId,
          ready: false,
          specialReady: false,
          correctAnswers: 0,
          hintsSent: 0,
          connected: true,
          lastSeenAt: timestamp,
        },
      ],
      status: "ready",
      lastActionMessage: `${child.displayName} 용사가 파티에 합류했어요.`,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
    transaction.set(roomRef, next);
    return next;
  });

  return toPublicRoom(roomId, room, now, guardianUid);
}

export async function heartbeatOnlineRoom(
  firestore: Firestore,
  guardianUid: string,
  roomId: string,
  now = Date.now(),
): Promise<PublicRoom> {
  const roomRef = firestore.collection("rooms").doc(roomId);
  const timestamp = Timestamp.fromMillis(now);

  const room = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");
    const current = snapshot.data() as ServerRoom;
    if (!current.guardianUids.includes(guardianUid)) throw new RoomServiceError("NOT_MEMBER");
    if (current.expiresAt.toMillis() <= now) throw new RoomServiceError("ROOM_EXPIRED");
    if (current.status === "closed") throw new RoomServiceError("ROOM_CLOSED");

    const players = current.players.map((player) => {
      if (player.guardianUid === guardianUid) {
        return { ...player, connected: true, lastSeenAt: timestamp };
      }
      return {
        ...player,
        connected: now - player.lastSeenAt.toMillis() <= PRESENCE_TIMEOUT_MS,
      };
    });
    const next: ServerRoom = { ...current, players, updatedAt: timestamp };
    transaction.update(roomRef, { players, updatedAt: timestamp });
    return next;
  });

  return toPublicRoom(roomId, room, now, guardianUid);
}

export async function getOnlineRoom(
  firestore: Firestore,
  guardianUid: string,
  roomId: string,
  now = Date.now(),
): Promise<PublicRoom> {
  const snapshot = await firestore.collection("rooms").doc(roomId).get();
  if (!snapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");
  const room = snapshot.data() as ServerRoom;
  if (!room.guardianUids.includes(guardianUid)) throw new RoomServiceError("NOT_MEMBER");
  if (room.expiresAt.toMillis() <= now) throw new RoomServiceError("ROOM_EXPIRED");
  if (room.status === "closed") throw new RoomServiceError("ROOM_CLOSED");
  return toPublicRoom(roomId, room, now, guardianUid);
}

function normalizeBattlePlayer(player: ServerRoomPlayer): ServerRoomPlayer {
  return {
    ...player,
    specialReady: player.specialReady ?? false,
    correctAnswers: player.correctAnswers ?? 0,
    hintsSent: player.hintsSent ?? 0,
  };
}

export async function applyOnlineBattleCommand(
  firestore: Firestore,
  guardianUid: string,
  roomId: string,
  command: OnlineBattleCommand,
  now = Date.now(),
): Promise<PublicRoom> {
  const roomRef = firestore.collection("rooms").doc(roomId);
  const commandRef = roomRef.collection("commands").doc(command.eventId);
  const timestamp = Timestamp.fromMillis(now);

  const room = await firestore.runTransaction(async (transaction) => {
    const commandSnapshot = await transaction.get(commandRef);
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists) throw new RoomServiceError("ROOM_NOT_FOUND");
    const current = roomSnapshot.data() as ServerRoom;
    if (!current.guardianUids.includes(guardianUid)) throw new RoomServiceError("NOT_MEMBER");
    if (current.expiresAt.toMillis() <= now) throw new RoomServiceError("ROOM_EXPIRED");
    if (current.status === "closed") throw new RoomServiceError("ROOM_CLOSED");
    if (commandSnapshot.exists) return current;
    if (current.revision !== command.expectedRevision) throw new RoomServiceError("REVISION_CONFLICT");

    const players = current.players.map(normalizeBattlePlayer);
    const actorIndex = players.findIndex((player) => player.guardianUid === guardianUid);
    if (actorIndex < 0) throw new RoomServiceError("NOT_MEMBER");
    let next: ServerRoom = { ...current, players };

    if (command.type === "PLAYER_READY") {
      if (!["waiting", "ready", "reward"].includes(current.status)) {
        throw new RoomServiceError("INVALID_ACTION");
      }
      const wasReward = current.status === "reward";
      const resetPlayers = wasReward
        ? players.map((player) => ({ ...player, ready: false, specialReady: false, correctAnswers: 0, hintsSent: 0 }))
        : players;
      const readyPlayers = resetPlayers.map((player, index) => index === actorIndex ? { ...player, ready: true } : player);
      const allReady = readyPlayers.length === 2 && readyPlayers.every((player) => player.ready);
      next = allReady
        ? {
            ...next,
            players: readyPlayers,
            status: "battle",
            bossHp: 150,
            teamLinkGauge: 0,
            activePlayerIndex: 0,
            questionIndex: 0,
            ...currentQuestionFields(readyPlayers[0], 0),
            lastActionMessage: `${readyPlayers[0].displayName} 용사부터 팀 공격을 시작해요.`,
          }
        : {
            ...next,
            players: readyPlayers,
            status: readyPlayers.length === 2 ? "ready" : "waiting",
            lastActionMessage: `${readyPlayers[actorIndex].displayName} 용사가 준비를 마쳤어요.`,
          };
    } else if (command.type === "ANSWER_SUBMIT") {
      if (current.status !== "battle" || players.length !== 2 || !current.questionId) {
        throw new RoomServiceError("BATTLE_NOT_READY");
      }
      if (actorIndex !== current.activePlayerIndex) throw new RoomServiceError("NOT_YOUR_TURN");
      if (typeof command.choice !== "string") throw new RoomServiceError("INVALID_ACTION");
      const question = questionForPlayer(players[actorIndex], current.questionIndex);
      if (question.id !== current.questionId) throw new RoomServiceError("REVISION_CONFLICT");
      if (command.choice !== question.answer) {
        next = {
          ...next,
          lastActionMessage: `${players[actorIndex].displayName} 용사가 단서를 다시 살펴보고 있어요.`,
        };
      } else {
        const updatedPlayers = players.map((player, index) => index === actorIndex
          ? { ...player, correctAnswers: player.correctAnswers + 1 }
          : player);
        const bossHp = Math.max(0, current.bossHp - 25);
        const teamLinkGauge = Math.min(100, current.teamLinkGauge + 25);
        if (bossHp === 0) {
          next = {
            ...next,
            players: updatedPlayers.map((player) => ({ ...player, ready: false, specialReady: false })),
            status: "reward",
            bossHp,
            teamLinkGauge,
            lastActionMessage: "두 용사의 지식 공격이 보스를 정화했어요!",
          };
        } else {
          const activePlayerIndex = (actorIndex + 1) % updatedPlayers.length;
          const questionIndex = current.questionIndex + 1;
          next = {
            ...next,
            players: updatedPlayers,
            bossHp,
            teamLinkGauge,
            activePlayerIndex,
            questionIndex,
            ...currentQuestionFields(updatedPlayers[activePlayerIndex], questionIndex),
            lastActionMessage: `${updatedPlayers[actorIndex].displayName} 용사의 공격 성공! 다음 용사에게 차례를 넘겼어요.`,
          };
        }
      }
    } else if (command.type === "HINT_SEND") {
      if (current.status !== "battle" || players.length !== 2 || !current.questionId) {
        throw new RoomServiceError("BATTLE_NOT_READY");
      }
      if (actorIndex === current.activePlayerIndex) throw new RoomServiceError("INVALID_ACTION");
      const updatedPlayers = players.map((player, index) => index === actorIndex
        ? { ...player, hintsSent: player.hintsSent + 1 }
        : player);
      next = {
        ...next,
        players: updatedPlayers,
        teamLinkGauge: Math.min(100, current.teamLinkGauge + 5),
        lastActionMessage: `${players[actorIndex].displayName} 용사의 도움: ${current.questionHint}`,
      };
    } else if (command.type === "SPECIAL_READY") {
      if (current.status !== "battle" || current.teamLinkGauge < 75) {
        throw new RoomServiceError("BATTLE_NOT_READY");
      }
      const updatedPlayers = players.map((player, index) => index === actorIndex
        ? { ...player, specialReady: true }
        : player);
      if (updatedPlayers.length === 2 && updatedPlayers.every((player) => player.specialReady)) {
        const bossHp = Math.max(0, current.bossHp - 50);
        next = {
          ...next,
          players: updatedPlayers.map((player) => ({ ...player, specialReady: false, ...(bossHp === 0 ? { ready: false } : {}) })),
          status: bossHp === 0 ? "reward" : "battle",
          bossHp,
          teamLinkGauge: 0,
          lastActionMessage: bossHp === 0
            ? "동시에 모은 팀 필살기로 보스를 정화했어요!"
            : "동시에 모은 팀 필살기가 보스에게 큰 피해를 주었어요!",
        };
      } else {
        next = {
          ...next,
          players: updatedPlayers,
          lastActionMessage: `${players[actorIndex].displayName} 용사가 팀 필살기를 준비했어요.`,
        };
      }
    } else {
      throw new RoomServiceError("INVALID_ACTION");
    }

    next = {
      ...next,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
    transaction.create(commandRef, {
      eventId: command.eventId,
      playerId: players[actorIndex].childProfileId,
      expectedRevision: command.expectedRevision,
      type: command.type,
      // The selected answer is used only for this server-side transaction.
      // Persisting it is unnecessary for idempotency and would retain raw
      // learning-response data in the command log.
      payload: {},
      clientTimestamp: now,
      serverTimestamp: timestamp,
    });
    transaction.set(roomRef, next);
    return next;
  });

  return toPublicRoom(roomId, room, now, guardianUid);
}

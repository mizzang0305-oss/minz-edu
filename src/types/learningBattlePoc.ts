export type LearningDifficulty = "core" | "application" | "deep";

export type LearningBattleQuestion = {
  id: string;
  grade: number;
  subject: string;
  concept: string;
  question: string;
  answer: string;
  explanation: string;
  difficulty: LearningDifficulty;
  skill_reward: number;
  hint: string;
};

export type LearningBattleMode = "solo" | "local-coop";
export type LearningBattlePhase = "question" | "attack-ready" | "special-ready" | "complete";

export type LearningBattlePlayer = {
  id: string;
  displayName: string;
  characterId: "thunder-sword" | "flame-mage";
  hp: number;
  shield: number;
};

export type LearningBattleFeedback = {
  kind: "idle" | "correct" | "wrong" | "attack" | "special";
  title: string;
  detail: string;
};

export type LearningBattlePocState = {
  mode: LearningBattleMode;
  players: LearningBattlePlayer[];
  activePlayerIndex: number;
  questionIndex: number;
  phase: LearningBattlePhase;
  bossHp: number;
  bossMaxHp: number;
  conceptGauge: number;
  skillGauge: number;
  correctCount: number;
  wrongCount: number;
  feedback: LearningBattleFeedback;
};

export type ColyseusLearningRoomState = {
  roomId: string;
  revision: number;
  battle: LearningBattlePocState;
  connectedPlayerIds: string[];
  connectionStatus: "waiting" | "ready" | "reconnecting";
};

export type ColyseusLearningClientMessages = {
  "player:join": { displayName: string };
  "answer:submit": { playerId: string; questionId: string; answer: string; clientSequence: number };
  "attack:request": { playerId: string; questionId: string; charged: boolean; clientSequence: number };
  "special:request": { playerId: string; clientSequence: number };
};

export type ColyseusLearningServerMessages = {
  "player:assigned": { playerId: string; roomId: string; reconnectSeconds: number };
  "battle:snapshot": ColyseusLearningRoomState;
  "answer:resolved": { playerId: string; playerIndex: number; questionId: string; correct: boolean; revision: number };
  "attack:resolved": { playerId: string; playerIndex: number; charged: boolean; damage: number; bossHp: number; revision: number };
  "special:resolved": { playerIds: string[]; damage: number; bossHp: number; revision: number };
  "room:error": { code: string; message: string };
};

export interface ColyseusLearningRoomContract {
  state: ColyseusLearningRoomState;
  send<TType extends keyof ColyseusLearningClientMessages>(
    type: TType,
    payload: ColyseusLearningClientMessages[TType],
  ): void;
  on<TType extends keyof ColyseusLearningServerMessages>(
    type: TType,
    handler: (payload: ColyseusLearningServerMessages[TType]) => void,
  ): () => void;
}

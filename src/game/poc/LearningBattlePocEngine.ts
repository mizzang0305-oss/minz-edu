import { GAME_POC_QUESTIONS } from "@/data/gamePocQuestions";
import type { LearningBattleMode, LearningBattlePocState } from "@/types/learningBattlePoc";

export const POC_NORMAL_ATTACK_DAMAGE = 28;
export const POC_CHARGED_ATTACK_DAMAGE = 40;
export const POC_SPECIAL_DAMAGE = 124;
export const POC_BOSS_COUNTER_DAMAGE = 15;

const clampGauge = (value: number) => Math.max(0, Math.min(100, value));

export function normalizeMathAnswer(value: string) {
  return value
    .trim()
    .replace(/\$/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\,/g, "")
    .replace(/\s+/g, "")
    .replace(/^x=/i, "")
    .replace(/[{}]/g, "");
}

export function createLearningBattlePocState(mode: LearningBattleMode = "solo"): LearningBattlePocState {
  return {
    mode,
    players: [
      { id: "player-1", displayName: "민즈", characterId: "thunder-sword", hp: 100, shield: 25 },
      ...(mode === "local-coop"
        ? [{ id: "player-2", displayName: "친구", characterId: "flame-mage" as const, hp: 100, shield: 25 }]
        : []),
    ],
    activePlayerIndex: 0,
    questionIndex: 0,
    phase: "question",
    bossHp: 180,
    bossMaxHp: 180,
    conceptGauge: 0,
    skillGauge: 0,
    correctCount: 0,
    wrongCount: 0,
    feedback: {
      kind: "idle",
      title: "첫 결계를 해독하자!",
      detail: "답을 입력하면 공격 버튼이 열려.",
    },
  };
}

export function submitLearningBattleAnswer(state: LearningBattlePocState, rawAnswer: string): LearningBattlePocState {
  if (state.phase !== "question") return state;
  const question = GAME_POC_QUESTIONS[state.questionIndex];
  if (!question) return state;
  const correct = normalizeMathAnswer(rawAnswer) === normalizeMathAnswer(question.answer);

  if (!correct) {
    const activePlayer = state.players[state.activePlayerIndex];
    const shieldDamage = Math.min(activePlayer.shield, POC_BOSS_COUNTER_DAMAGE);
    const hpDamage = POC_BOSS_COUNTER_DAMAGE - shieldDamage;
    return {
      ...state,
      players: state.players.map((player, index) => index === state.activePlayerIndex
        ? { ...player, shield: player.shield - shieldDamage, hp: Math.max(0, player.hp - hpDamage) }
        : player),
      wrongCount: state.wrongCount + 1,
      feedback: {
        kind: "wrong",
        title: `${activePlayer.displayName}, 방어막이 공격을 막았어!`,
        detail: `전투 힌트 · ${question.hint} ${question.explanation}`,
      },
    };
  }

  const conceptGauge = clampGauge(state.conceptGauge + question.skill_reward);
  const skillGauge = clampGauge(state.skillGauge + question.skill_reward);
  const specialReady = question.difficulty === "deep" && conceptGauge === 100;
  return {
    ...state,
    conceptGauge,
    skillGauge,
    correctCount: state.correctCount + 1,
    phase: specialReady ? "special-ready" : "attack-ready",
    feedback: {
      kind: "correct",
      title: specialReady ? "스페셜 룬 완성!" : "약점 발견! 공격 가능!",
      detail: question.explanation,
    },
  };
}

export function resolveLearningBattleAttack(state: LearningBattlePocState, charged = false): LearningBattlePocState {
  if (state.phase !== "attack-ready") return state;
  const nextQuestionIndex = Math.min(state.questionIndex + 1, GAME_POC_QUESTIONS.length - 1);
  const damage = charged ? POC_CHARGED_ATTACK_DAMAGE : POC_NORMAL_ATTACK_DAMAGE;
  return {
    ...state,
    bossHp: Math.max(0, state.bossHp - damage),
    questionIndex: nextQuestionIndex,
    activePlayerIndex: state.players.length === 2 ? (state.activePlayerIndex + 1) % 2 : 0,
    phase: "question",
    feedback: {
      kind: "attack",
      title: `${charged ? "차지 " : ""}정답 공격! -${damage}`,
      detail: "다음 결계가 나타났어. 전투를 이어 가자!",
    },
  };
}

export function resolveLearningBattleSpecial(state: LearningBattlePocState): LearningBattlePocState {
  if (state.phase !== "special-ready") return state;
  return {
    ...state,
    bossHp: Math.max(0, state.bossHp - POC_SPECIAL_DAMAGE),
    phase: "complete",
    feedback: {
      kind: "special",
      title: `개념 마스터 스페셜! -${POC_SPECIAL_DAMAGE}`,
      detail: "세 결계의 원리를 모두 읽어 수호자의 혼란을 풀었어!",
    },
  };
}

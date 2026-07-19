import type { BattleAction, BattleMode, CoopBattleState, CoopPlayer } from "@/types/battle";
import type { ParentSettings } from "@/types/progress";
import type { SchoolLevel } from "@/types/learning";
import type { WeeklyLearningGoal } from "@/types/curriculum";
import type { ExplorationStageId } from "@/types/exploration";
import { getLearningBattleProfile } from "@/learning/stages";
import { addGauge, isCoopSpecialReady, isSoloSpecialReady } from "./SkillGaugeSystem";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const TEN_FRAME_SKILLS = new Set(["make-ten", "number-composition"]);

export function supportsTenFrame(goal: WeeklyLearningGoal) {
  return goal.stageId === "number-forest" && TEN_FRAME_SKILLS.has(goal.skillTag);
}

export function resolveBattleSelection(
  goals: WeeklyLearningGoal[],
  requestedStage: string | null,
  requestedGoalId: string | null,
): { stageId: ExplorationStageId; goal: WeeklyLearningGoal } {
  const explicitStage: ExplorationStageId | null = requestedStage === "number-forest" || requestedStage === "word-island" || requestedStage === "story-castle"
    ? requestedStage
    : null;
  const requestedGoal = goals.find((goal) => goal.id === requestedGoalId);
  const preferredStage = explicitStage ?? requestedGoal?.stageId ?? "number-forest";
  const goal = requestedGoal?.stageId === preferredStage
    ? requestedGoal
    : goals.find((candidate) => candidate.stageId === preferredStage)
      ?? requestedGoal
      ?? goals[0];
  return { stageId: goal.stageId, goal };
}

function playerFromSettings(
  id: string,
  displayName: string,
  schoolLevel: SchoolLevel,
  grade: number,
  role: CoopPlayer["role"],
  characterId: string,
): CoopPlayer {
  return {
    id,
    displayName,
    schoolLevel,
    grade,
    levelProfile: { math: getLearningBattleProfile({ schoolLevel, grade }).conceptId },
    characterId,
    role,
    hp: 100,
    shield: 25,
    battleGauge: 0,
    conceptGauge: 0,
    ready: false,
  };
}

export function createBattleState(settings: ParentSettings): CoopBattleState {
  const players = [
    playerFromSettings("player-1", settings.playerName || "민표", settings.schoolLevel, settings.grade, settings.role, "thunder-swordsman"),
  ];
  if (settings.mode === "local-shared-screen") {
    players.push(
      playerFromSettings(
        "player-2",
        settings.friendName || "친구",
        settings.friendSchoolLevel,
        settings.friendGrade,
        settings.friendRole,
        "fire-mage",
      ),
    );
  }

  const coop = players.length === 2;
  return {
    mode: "local-shared-screen",
    players,
    activePlayerIndex: 0,
    teamLinkGauge: 0,
    teamCombo: 0,
    bossHp: coop ? 250 : 120,
    bossMaxHp: coop ? 250 : 120,
    bossShield: coop ? 50 : 30,
    battlePhase: "INTRO",
    specialSkillReady: false,
    attemptCount: 0,
    completedMissionIds: [],
    firstTryCorrectCount: 0,
    currentQuestionRetried: false,
    currentQuestionHintUsed: false,
    hintCount: 0,
    retryCount: 0,
    successfulDodges: 0,
    failedDodges: 0,
    dodgeStreak: 0,
    damageTaken: 0,
    message: coop ? "두 영웅 앞에 지역 수호자가 나타났어!" : "지역 수호자가 길을 헷갈리게 만들었어!",
    shakeIntensity: settings.shakeIntensity,
    soundVolume: settings.soundVolume,
    coopMetrics: {
      jointMissionsCompleted: 0,
      hintsShared: 0,
      explanationsShared: 0,
      retries: 0,
      specialActivations: 0,
      waitedTurns: 0,
      roleChanges: 0,
    },
  };
}

function updateActivePlayer(
  state: CoopBattleState,
  update: (player: CoopPlayer) => CoopPlayer,
): CoopPlayer[] {
  return state.players.map((player, index) => (index === state.activePlayerIndex ? update(player) : player));
}

function damageBoss(state: CoopBattleState, requestedDamage: number, requestedShieldMultiplier = 1) {
  const damage = Math.max(1, Math.round(requestedDamage));
  const shieldMultiplier = Math.max(1, requestedShieldMultiplier);
  const shieldDamage = Math.min(state.bossShield, Math.round(damage * shieldMultiplier));
  const damageSpentOnShield = Math.ceil(shieldDamage / shieldMultiplier);
  const hpDamage = Math.max(0, damage - damageSpentOnShield);
  return {
    bossShield: state.bossShield - shieldDamage,
    // Learning missions, not raw damage, decide when the boss is defeated.
    bossHp: state.bossHp <= 0 ? 0 : Math.max(1, state.bossHp - hpDamage),
  };
}

function damageActivePlayer(state: CoopBattleState, requestedDamage: number) {
  const damage = Math.max(0, Math.min(30, Math.round(requestedDamage)));
  let appliedDamage = 0;
  const players = state.players.map((player, index) => {
    if (index !== state.activePlayerIndex) return player;
    const shieldDamage = Math.min(player.shield, damage);
    const hpDamage = Math.min(Math.max(0, player.hp - 1), damage - shieldDamage);
    appliedDamage = shieldDamage + hpDamage;
    return {
      ...player,
      shield: player.shield - shieldDamage,
      hp: player.hp - hpDamage,
    };
  });
  return { players, appliedDamage };
}

function specialReady(state: CoopBattleState, players: CoopPlayer[], teamLinkGauge: number, deepComplete: boolean) {
  return players.length === 1
    ? isSoloSpecialReady(players[0].battleGauge, players[0].conceptGauge, deepComplete)
    : isCoopSpecialReady(players.map((player) => player.battleGauge), teamLinkGauge, deepComplete);
}

export function battleReducer(state: CoopBattleState, action: BattleAction): CoopBattleState {
  switch (action.type) {
    case "START":
      return { ...state, battlePhase: "PLAYER_MANIPULATE", message: `${state.players[0].displayName} 차례 · ${action.goalTitle ?? getLearningBattleProfile(state.players[0]).conceptName} 결계를 열어 보자!` };
    case "MANIPULATION_SUCCESS": {
      const missionId = action.missionId ?? "move-block-1";
      if (state.completedMissionIds.includes(missionId)) return state;
      const players = updateActivePlayer(state, (player) => ({
        ...player,
        battleGauge: addGauge(player.battleGauge, 40),
        conceptGauge: addGauge(player.conceptGauge, 40),
      }));
      const damage = damageBoss(state, action.damage ?? 24, action.shieldDamageMultiplier);
      const isCoop = players.length === 2;
      return {
        ...state,
        ...damage,
        players,
        activePlayerIndex: isCoop ? 1 : 0,
        teamLinkGauge: isCoop ? 25 : 0,
        teamCombo: state.teamCombo + 1,
        battlePhase: "PLAYER_ANSWER",
        pendingCoopMissionId: isCoop ? "friend-remaining-number" : "solo-application",
        completedMissionIds: [...state.completedMissionIds, missionId],
        firstTryCorrectCount: state.firstTryCorrectCount + (state.currentQuestionRetried || state.currentQuestionHintUsed ? 0 : 1),
        currentQuestionRetried: false,
        currentQuestionHintUsed: false,
        coopMetrics: isCoop
          ? { ...state.coopMetrics, waitedTurns: state.coopMetrics.waitedTurns + 1 }
          : state.coopMetrics,
        message: isCoop ? `${players[1].displayName} 차례 · 남은 불꽃 암호를 찾아 줘!` : "보호막이 깨졌어! 이제 번개 암호를 풀어 보자.",
      };
    }
    case "ANSWER_SUCCESS": {
      if (state.completedMissionIds.includes(action.missionId)) return state;
      const isDeep = action.deep === true || action.missionId === "deep-1";
      const players = updateActivePlayer(state, (player) => ({
        ...player,
        battleGauge: addGauge(player.battleGauge, isDeep ? 60 : 35),
        conceptGauge: addGauge(player.conceptGauge, isDeep ? 50 : 35),
      }));
      const teamLinkGauge = clamp(state.teamLinkGauge + (isDeep ? 50 : 25));
      const deepComplete = isDeep;
      const ready = specialReady(state, players, teamLinkGauge, deepComplete);
      const damage = damageBoss(state, action.damage ?? (isDeep ? 34 : 24), action.shieldDamageMultiplier);
      const coopFirstAnswer = players.length === 2 && state.activePlayerIndex === 1 && !isDeep;

      if (coopFirstAnswer) {
        return {
          ...state,
          ...damage,
          players,
          activePlayerIndex: 0,
          teamLinkGauge,
          teamCombo: state.teamCombo + 1,
          battlePhase: "SPECIAL_CHALLENGE",
          pendingCoopMissionId: "deep-1",
          completedMissionIds: [...state.completedMissionIds, action.missionId],
          firstTryCorrectCount: state.firstTryCorrectCount + (state.currentQuestionRetried || state.currentQuestionHintUsed ? 0 : 1),
          currentQuestionRetried: false,
          currentQuestionHintUsed: false,
          coopMetrics: {
            ...state.coopMetrics,
            waitedTurns: state.coopMetrics.waitedTurns + 1,
          },
          message: "함께 작전 세우기 · 서로 다른 두 길을 찾아 보자!",
        };
      }

      if (!isDeep) {
        return {
          ...state,
          ...damage,
          players: players.map((player) => ({
            ...player,
            battleGauge: Math.max(player.battleGauge, 70),
            conceptGauge: Math.max(player.conceptGauge, 70),
          })),
          battlePhase: "SPECIAL_CHALLENGE",
          pendingCoopMissionId: "deep-1",
          completedMissionIds: [...state.completedMissionIds, action.missionId],
          firstTryCorrectCount: state.firstTryCorrectCount + (state.currentQuestionRetried || state.currentQuestionHintUsed ? 0 : 1),
          currentQuestionRetried: false,
          currentQuestionHintUsed: false,
          message: "스페셜 작전 · 같은 답으로 가는 두 길을 찾아 보자!",
        };
      }

      const chargedPlayers = players.map((player) => ({
        ...player,
        battleGauge: 100,
        conceptGauge: Math.max(85, player.conceptGauge),
      }));
      const chargedTeamGauge = players.length === 2 ? 100 : teamLinkGauge;
      return {
        ...state,
        ...damage,
        players: chargedPlayers,
        teamLinkGauge: chargedTeamGauge,
        specialSkillReady: specialReady(state, chargedPlayers, chargedTeamGauge, true) || ready,
        battlePhase: "SPECIAL_READY",
        completedMissionIds: [...state.completedMissionIds, action.missionId],
        firstTryCorrectCount: state.firstTryCorrectCount + (state.currentQuestionRetried || state.currentQuestionHintUsed ? 0 : 1),
        currentQuestionRetried: false,
        currentQuestionHintUsed: false,
        coopMetrics: players.length === 2
          ? {
              ...state.coopMetrics,
              jointMissionsCompleted: state.coopMetrics.jointMissionsCompleted + 1,
              explanationsShared: state.coopMetrics.explanationsShared + 1,
            }
          : state.coopMetrics,
        message: players.length === 2 ? "합동 스킬 준비! 양쪽에서 힘을 모아 줘." : "민즈 썬더 드래곤 브레이크 준비 완료!",
      };
    }
    case "ANSWER_RETRY": {
      const attemptCount = state.attemptCount + 1;
      const activeProfile = getLearningBattleProfile(state.players[state.activePlayerIndex]);
      return {
        ...state,
        attemptCount,
        retryCount: state.retryCount + 1,
        currentQuestionRetried: true,
        teamLinkGauge: state.players.length === 2 ? state.teamLinkGauge : 0,
        coopMetrics: state.players.length === 2
          ? { ...state.coopMetrics, retries: state.coopMetrics.retries + 1 }
          : state.coopMetrics,
        message: attemptCount === 1
          ? "괜찮아, 아직 기회가 있어! 그림이나 단서를 한 번 더 천천히 살펴보자."
          : `좋은 도전이야. 힌트: ${action.hint ?? activeProfile.hint}`,
      };
    }
    case "DODGE_SUCCESS":
      return {
        ...state,
        successfulDodges: state.successfulDodges + 1,
        dodgeStreak: state.dodgeStreak + 1,
        message: `${state.players[state.activePlayerIndex].displayName}, 문제를 풀어 공격을 피했어! 반격하자!`,
      };
    case "DODGE_FAILED": {
      const retried = battleReducer(state, { type: "ANSWER_RETRY", hint: action.hint });
      const { players, appliedDamage } = damageActivePlayer(retried, action.damage);
      const target = players[retried.activePlayerIndex];
      return {
        ...retried,
        players,
        failedDodges: state.failedDodges + 1,
        dodgeStreak: 0,
        damageTaken: state.damageTaken + appliedDamage,
        message: target.shield > 0
          ? `${target.displayName}의 보호막이 공격을 막았어. 단서를 보고 다시 회피하자!`
          : `${target.displayName}, 공격을 맞았지만 괜찮아. 천천히 풀면 다음 공격은 피할 수 있어!`,
      };
    }
    case "FIELD_DODGE_SUCCESS":
      return {
        ...state,
        message: "쫄 몬스터의 반격을 직접 피했어! 지금이 마무리 공격 기회야.",
      };
    case "FIELD_HIT": {
      const { players, appliedDamage } = damageActivePlayer(state, action.damage);
      return {
        ...state,
        players,
        damageTaken: state.damageTaken + appliedDamage,
        message: "쫄 몬스터도 반격해! 보호막을 확인하고 다시 공격하자.",
      };
    }
    case "USE_HINT": {
      const activeProfile = getLearningBattleProfile(state.players[state.activePlayerIndex]);
      const firstHintForQuestion = !state.currentQuestionHintUsed;
      return {
        ...state,
        hintCount: state.hintCount + (firstHintForQuestion ? 1 : 0),
        currentQuestionHintUsed: true,
        teamLinkGauge: state.players.length === 2 && firstHintForQuestion ? clamp(state.teamLinkGauge + 10) : state.teamLinkGauge,
        coopMetrics: state.players.length === 2 && firstHintForQuestion
          ? { ...state.coopMetrics, hintsShared: state.coopMetrics.hintsShared + 1 }
          : state.coopMetrics,
        message: action.hint ?? activeProfile.hint,
      };
    }
    case "SPECIAL_CHALLENGE_SUCCESS":
      return battleReducer(state, {
        type: "ANSWER_SUCCESS",
        missionId: action.missionId ?? "deep-1",
        deep: true,
        damage: action.damage,
        shieldDamageMultiplier: action.shieldDamageMultiplier,
      });
    case "PLAYER_READY": {
      const players = state.players.map((player, index) => index === action.playerIndex ? { ...player, ready: true } : player);
      const allReady = players.every((player) => player.ready);
      return {
        ...state,
        players,
        battlePhase: allReady ? "SPECIAL_CUTSCENE" : state.battlePhase,
        message: allReady ? (players.length === 2 ? "두 힘이 하나로 합쳐졌어!" : "번개 에너지가 가득 모였어!") : `${players[action.playerIndex].displayName} 준비 완료 · 친구를 기다리는 중`,
      };
    }
    case "RESET_READY":
      return {
        ...state,
        players: state.players.map((player) => ({ ...player, ready: false })),
        message: "용의 기운이 다시 모였어. 천천히 함께 눌러 보자!",
      };
    case "SPECIAL_COMPLETE":
      return {
        ...state,
        bossHp: 0,
        bossShield: 0,
        battlePhase: "RESULT",
        coopMetrics: state.players.length === 2
          ? { ...state.coopMetrics, specialActivations: state.coopMetrics.specialActivations + 1 }
          : state.coopMetrics,
        message: "숫자 보스의 약점을 발견했어! 모험 완료!",
      };
    default:
      return state;
  }
}

export function battleModeFromPlayers(players: CoopPlayer[]): BattleMode {
  return players.length === 1 ? "solo" : "local-shared-screen";
}

import type { BattleAction, BattleMode, CoopBattleState, CoopPlayer } from "@/types/battle";
import type { ParentSettings } from "@/types/progress";
import { addGauge, isCoopSpecialReady, isSoloSpecialReady } from "./SkillGaugeSystem";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function playerFromSettings(
  id: string,
  displayName: string,
  grade: number,
  role: CoopPlayer["role"],
  characterId: string,
): CoopPlayer {
  return {
    id,
    displayName,
    grade,
    levelProfile: { math: grade === 2 ? "make-ten" : "carrying-addition" },
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
    playerFromSettings("player-1", settings.playerName || "민표", settings.grade, settings.role, "thunder-swordsman"),
  ];
  if (settings.mode === "local-shared-screen") {
    players.push(
      playerFromSettings(
        "player-2",
        settings.friendName || "친구",
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
    hintCount: 0,
    retryCount: 0,
    message: coop ? "쌍둥이 숫자 슬라임이 합체했어!" : "숫자 슬라임이 길을 막았어!",
    shakeIntensity: settings.shakeIntensity,
    soundVolume: settings.soundVolume,
  };
}

function updateActivePlayer(
  state: CoopBattleState,
  update: (player: CoopPlayer) => CoopPlayer,
): CoopPlayer[] {
  return state.players.map((player, index) => (index === state.activePlayerIndex ? update(player) : player));
}

function damageBoss(state: CoopBattleState, damage: number) {
  const shieldDamage = Math.min(state.bossShield, damage);
  return {
    bossShield: state.bossShield - shieldDamage,
    bossHp: Math.max(0, state.bossHp - (damage - shieldDamage)),
  };
}

function specialReady(state: CoopBattleState, players: CoopPlayer[], teamLinkGauge: number, deepComplete: boolean) {
  return players.length === 1
    ? isSoloSpecialReady(players[0].battleGauge, players[0].conceptGauge, deepComplete)
    : isCoopSpecialReady(players.map((player) => player.battleGauge), teamLinkGauge, deepComplete);
}

export function battleReducer(state: CoopBattleState, action: BattleAction): CoopBattleState {
  switch (action.type) {
    case "START":
      return { ...state, battlePhase: "PLAYER_MANIPULATE", message: `${state.players[0].displayName} 차례 · 10칸 방어막을 열어 보자!` };
    case "MANIPULATION_SUCCESS": {
      const players = updateActivePlayer(state, (player) => ({
        ...player,
        battleGauge: addGauge(player.battleGauge, 40),
        conceptGauge: addGauge(player.conceptGauge, 40),
      }));
      const damage = damageBoss(state, 24);
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
        completedMissionIds: [...state.completedMissionIds, "move-block-1"],
        message: isCoop ? `${players[1].displayName} 차례 · 남은 불꽃 암호를 찾아 줘!` : "보호막이 깨졌어! 이제 번개 암호를 풀어 보자.",
      };
    }
    case "ANSWER_SUCCESS": {
      const isDeep = action.missionId === "deep-1";
      const players = updateActivePlayer(state, (player) => ({
        ...player,
        battleGauge: addGauge(player.battleGauge, isDeep ? 60 : 35),
        conceptGauge: addGauge(player.conceptGauge, isDeep ? 50 : 35),
      }));
      const teamLinkGauge = clamp(state.teamLinkGauge + (isDeep ? 50 : 25));
      const deepComplete = isDeep;
      const ready = specialReady(state, players, teamLinkGauge, deepComplete);
      const damage = damageBoss(state, isDeep ? 34 : 24);
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
        message: players.length === 2 ? "합동 스킬 준비! 양쪽에서 힘을 모아 줘." : "민즈 썬더 드래곤 브레이크 준비 완료!",
      };
    }
    case "ANSWER_RETRY": {
      const attemptCount = state.attemptCount + 1;
      const shieldLoss = attemptCount >= 2 ? 5 : 0;
      const players = updateActivePlayer(state, (player) => ({ ...player, shield: Math.max(0, player.shield - shieldLoss) }));
      return {
        ...state,
        players,
        attemptCount,
        retryCount: state.retryCount + 1,
        teamLinkGauge: state.players.length === 2 ? state.teamLinkGauge : 0,
        message: attemptCount === 1
          ? "숫자 슬라임이 공격을 막았어! 다른 작전을 사용해 보자."
          : "동료가 보호막을 펼쳤어. 힌트로 약점을 찾아 보자!",
      };
    }
    case "USE_HINT":
      return {
        ...state,
        hintCount: state.hintCount + 1,
        teamLinkGauge: state.players.length === 2 ? clamp(state.teamLinkGauge + 10) : 0,
        message: "8에 2를 더하면 10이 돼. 7에서 2를 옮기면 5가 남아.",
      };
    case "SPECIAL_CHALLENGE_SUCCESS":
      return battleReducer(state, { type: "ANSWER_SUCCESS", missionId: "deep-1" });
    case "PLAYER_READY": {
      const players = state.players.map((player, index) => index === action.playerIndex ? { ...player, ready: true } : player);
      const allReady = players.every((player) => player.ready);
      return {
        ...state,
        players,
        battlePhase: allReady ? "SPECIAL_CUTSCENE" : state.battlePhase,
        message: allReady ? "힘이 하나로 합쳐졌어!" : `${players[action.playerIndex].displayName} 준비 완료 · 친구를 기다리는 중`,
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
        message: "숫자 보스의 약점을 발견했어! 모험 완료!",
      };
    default:
      return state;
  }
}

export function battleModeFromPlayers(players: CoopPlayer[]): BattleMode {
  return players.length === 1 ? "solo" : "local-shared-screen";
}

import { describe, expect, it } from "vitest";
import { battleReducer, createBattleState } from "./CombatSystem";
import { DEFAULT_SETTINGS } from "@/stores/storage";

describe("CombatSystem", () => {
  it("1인 모드를 플레이어 1명인 공통 모델로 만든다", () => {
    const state = createBattleState(DEFAULT_SETTINGS);
    expect(state.players).toHaveLength(1);
    expect(state.bossHp).toBe(120);
    expect(state.teamLinkGauge).toBe(0);
  });

  it("2인 모드에서 개인 게이지와 팀 링크를 분리한다", () => {
    const state = createBattleState({ ...DEFAULT_SETTINGS, mode: "local-shared-screen" });
    const started = battleReducer(state, { type: "START" });
    const manipulated = battleReducer(started, { type: "MANIPULATION_SUCCESS" });
    expect(manipulated.players).toHaveLength(2);
    expect(manipulated.players[0].battleGauge).toBe(40);
    expect(manipulated.players[1].battleGauge).toBe(0);
    expect(manipulated.activePlayerIndex).toBe(1);
    expect(manipulated.teamLinkGauge).toBe(25);
  });

  it("두 플레이어가 참여한 뒤에만 합동 스킬을 준비한다", () => {
    let state = createBattleState({ ...DEFAULT_SETTINGS, mode: "local-shared-screen" });
    state = battleReducer(state, { type: "START" });
    state = battleReducer(state, { type: "MANIPULATION_SUCCESS" });
    state = battleReducer(state, { type: "ANSWER_SUCCESS", missionId: "friend-remaining-number" });
    expect(state.battlePhase).toBe("SPECIAL_CHALLENGE");
    state = battleReducer(state, { type: "SPECIAL_CHALLENGE_SUCCESS" });
    expect(state.players.every((player) => player.battleGauge >= 70)).toBe(true);
    expect(state.teamLinkGauge).toBe(100);
    expect(state.specialSkillReady).toBe(true);
    expect(state.battlePhase).toBe("SPECIAL_READY");
  });

  it("한 명의 어려움이 팀 링크를 깎지 않는다", () => {
    const state = { ...createBattleState({ ...DEFAULT_SETTINGS, mode: "local-shared-screen" }), teamLinkGauge: 50 };
    const retried = battleReducer(state, { type: "ANSWER_RETRY" });
    expect(retried.teamLinkGauge).toBe(50);
    expect(retried.players[0].hp).toBe(100);
  });
});

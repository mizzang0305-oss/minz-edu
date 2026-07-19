import { describe, expect, it } from "vitest";
import { battleReducer, createBattleState, resolveBattleSelection, supportsTenFrame } from "./CombatSystem";
import { DEFAULT_SETTINGS } from "@/stores/storage";
import { getWeeklyLearningGoals } from "@/learning/curriculumCatalog";

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
    expect(state.coopMetrics.jointMissionsCompleted).toBe(1);
    expect(state.coopMetrics.explanationsShared).toBe(1);
    expect(state.coopMetrics.waitedTurns).toBe(2);
  });

  it("한 명의 어려움이 팀 링크를 깎지 않는다", () => {
    const state = { ...createBattleState({ ...DEFAULT_SETTINGS, mode: "local-shared-screen" }), teamLinkGauge: 50 };
    const retried = battleReducer(state, { type: "ANSWER_RETRY" });
    expect(retried.teamLinkGauge).toBe(50);
    expect(retried.players[0].hp).toBe(100);
    expect(retried.coopMetrics.retries).toBe(1);
  });

  it("일반 단서 요청은 아이의 체력과 보호막을 깎지 않는다", () => {
    const state = createBattleState(DEFAULT_SETTINGS);
    const firstTry = battleReducer(state, { type: "ANSWER_RETRY" });
    const secondTry = battleReducer(firstTry, { type: "ANSWER_RETRY" });
    expect(secondTry.players[0].hp).toBe(state.players[0].hp);
    expect(secondTry.players[0].shield).toBe(state.players[0].shield);
    expect(secondTry.message).toContain("힌트:");
  });

  it("회피 문제 오답은 현재 영웅의 보호막부터 줄이고 정답은 회피 연속을 올린다", () => {
    let state = createBattleState(DEFAULT_SETTINGS);
    state = battleReducer(state, { type: "DODGE_FAILED", damage: 8, hint: "숫자의 자리를 다시 봐요." });
    expect(state.players[0]).toMatchObject({ hp: 100, shield: 17 });
    expect(state).toMatchObject({ failedDodges: 1, dodgeStreak: 0, damageTaken: 8, retryCount: 1 });

    state = battleReducer(state, { type: "DODGE_SUCCESS" });
    expect(state).toMatchObject({ successfulDodges: 1, failedDodges: 1, dodgeStreak: 1 });
    expect(state.message).toContain("공격을 피했어");
  });

  it("보호막이 없을 때도 보스 공격으로 영웅의 HP가 1 아래로 내려가지 않는다", () => {
    const initial = createBattleState(DEFAULT_SETTINGS);
    const state = battleReducer({
      ...initial,
      players: initial.players.map((player) => ({ ...player, hp: 3, shield: 0 })),
    }, { type: "DODGE_FAILED", damage: 30 });
    expect(state.players[0]).toMatchObject({ hp: 1, shield: 0 });
    expect(state.damageTaken).toBe(2);
  });

  it("도움 단서와 합동 스킬을 협력 행동으로 기록한다", () => {
    let state = createBattleState({ ...DEFAULT_SETTINGS, mode: "local-shared-screen" });
    state = battleReducer(state, { type: "USE_HINT" });
    state = battleReducer(state, { type: "SPECIAL_COMPLETE" });
    expect(state.coopMetrics.hintsShared).toBe(1);
    expect(state.coopMetrics.specialActivations).toBe(1);
  });

  it("같은 문항의 연속 힌트와 빠른 정답 탭을 한 번만 기록한다", () => {
    let state = createBattleState({ ...DEFAULT_SETTINGS, mode: "local-shared-screen" });
    state = battleReducer(state, { type: "USE_HINT", hint: "첫 단서" });
    state = battleReducer(state, { type: "USE_HINT", hint: "첫 단서" });
    expect(state.hintCount).toBe(1);
    expect(state.coopMetrics.hintsShared).toBe(1);
    expect(state.teamLinkGauge).toBe(10);

    state = battleReducer(state, { type: "MANIPULATION_SUCCESS", missionId: "question-1" });
    const once = state;
    state = battleReducer(state, { type: "MANIPULATION_SUCCESS", missionId: "question-1" });
    expect(state).toEqual(once);
    expect(state.completedMissionIds).toEqual(["question-1"]);
    expect(state.firstTryCorrectCount).toBe(0);
  });

  it("여러 번 틀린 한 문항 때문에 다른 첫 성공까지 깎지 않는다", () => {
    let state = battleReducer(createBattleState(DEFAULT_SETTINGS), { type: "START" });
    state = battleReducer(state, { type: "ANSWER_RETRY" });
    state = battleReducer(state, { type: "ANSWER_RETRY" });
    state = battleReducer(state, { type: "MANIPULATION_SUCCESS", missionId: "question-1" });
    state = battleReducer(state, { type: "ANSWER_SUCCESS", missionId: "question-2" });
    state = battleReducer(state, { type: "SPECIAL_CHALLENGE_SUCCESS", missionId: "question-3" });
    expect(state.retryCount).toBe(2);
    expect(state.completedMissionIds).toHaveLength(3);
    expect(state.firstTryCorrectCount).toBe(2);
  });

  it("현재 국어 문항이 전달한 힌트를 수학 기본 힌트 대신 보여준다", () => {
    let state = createBattleState(DEFAULT_SETTINGS);
    state = battleReducer(state, { type: "USE_HINT", hint: "인물의 말과 행동을 찾아봐요." });
    expect(state.message).toBe("인물의 말과 행동을 찾아봐요.");
    state = battleReducer(state, { type: "ANSWER_RETRY", hint: "사건이 일어난 순서를 살펴봐요." });
    state = battleReducer(state, { type: "ANSWER_RETRY", hint: "사건이 일어난 순서를 살펴봐요." });
    expect(state.message).toContain("사건이 일어난 순서");
  });

  it("START 문구에 선택한 국어 단원명을 사용한다", () => {
    const state = battleReducer(createBattleState(DEFAULT_SETTINGS), { type: "START", goalTitle: "중요 내용 찾기" });
    expect(state.message).toContain("중요 내용 찾기 결계");
    expect(state.message).not.toContain("10 만들기");
  });

  it("명시한 스테이지와 실제 목표를 항상 같은 경로로 맞춘다", () => {
    const goals = getWeeklyLearningGoals({ schoolLevel: "elementary", grade: 2 }, 2);
    const koreanGoal = goals.find((goal) => goal.id === "elementary-2-s2-korean-w9");
    const fromGoal = resolveBattleSelection(goals, null, koreanGoal?.id ?? null);
    expect(fromGoal).toMatchObject({ stageId: "word-island", goal: { id: koreanGoal?.id } });

    const replaced = resolveBattleSelection(goals, "story-castle", "elementary-2-s2-math-w8");
    expect(replaced.stageId).toBe("story-castle");
    expect(replaced.goal.stageId).toBe("story-castle");
    expect(replaced.goal.id).toContain("-korean-");

    const wordIsland = resolveBattleSelection(goals, "word-island", "elementary-2-s2-math-w8");
    expect(wordIsland).toMatchObject({ stageId: "word-island", goal: { stageId: "word-island", unitTitle: "중요 내용 찾기" } });
  });

  it("숫자 숲에서도 목표 기술이 맞을 때만 TenFrame을 사용한다", () => {
    const gradeOne = getWeeklyLearningGoals({ schoolLevel: "elementary", grade: 1 }, 2);
    const makeTen = gradeOne.find((goal) => goal.skillTag === "make-ten");
    const placeValue = gradeOne.find((goal) => goal.skillTag === "place-value");
    expect(makeTen && supportsTenFrame(makeTen)).toBe(true);
    expect(placeValue && supportsTenFrame(placeValue)).toBe(false);

    const kindergarten = getWeeklyLearningGoals({ schoolLevel: "kindergarten", grade: 6 }, 2);
    expect(supportsTenFrame(kindergarten.find((goal) => goal.skillTag === "number-composition")!)).toBe(true);
  });

  it("완료 기록에 실제 선택 목표의 문항 ID를 남긴다", () => {
    let state = battleReducer(createBattleState(DEFAULT_SETTINGS), { type: "START", goalTitle: "세 자리 수" });
    state = battleReducer(state, { type: "MANIPULATION_SUCCESS", missionId: "e12-math-1" });
    state = battleReducer(state, { type: "ANSWER_SUCCESS", missionId: "e12-math-2" });
    state = battleReducer(state, { type: "SPECIAL_CHALLENGE_SUCCESS", missionId: "e12-math-3" });
    expect(state.completedMissionIds).toEqual(["e12-math-1", "e12-math-2", "e12-math-3"]);
  });

  it("강화 공격 피해와 방패 파괴 배율을 보스 상태에 반영한다", () => {
    const started = battleReducer(createBattleState(DEFAULT_SETTINGS), { type: "START" });
    const attacked = battleReducer(
      { ...started, bossHp: 100, bossShield: 20 },
      { type: "MANIPULATION_SUCCESS", missionId: "charged-1", damage: 30, shieldDamageMultiplier: 1.8 },
    );

    expect(attacked.bossShield).toBe(0);
    expect(attacked.bossHp).toBe(82);
  });

  it("강한 장비라도 문제 결계를 건너뛰어 보스를 조기 처치하지 않는다", () => {
    const started = battleReducer(createBattleState(DEFAULT_SETTINGS), { type: "START" });
    const attacked = battleReducer(
      { ...started, bossHp: 20, bossShield: 0 },
      { type: "MANIPULATION_SUCCESS", missionId: "gated-1", damage: 999 },
    );

    expect(attacked.bossHp).toBe(1);
    expect(attacked.battlePhase).toBe("PLAYER_ANSWER");
  });

  it("쫄 몬스터도 반격하지만 아이의 HP를 1 아래로 떨어뜨리지 않는다", () => {
    const state = createBattleState(DEFAULT_SETTINGS);
    const hit = battleReducer({
      ...state,
      players: state.players.map((player) => ({ ...player, hp: 3, shield: 0 })),
    }, { type: "FIELD_HIT", damage: 9 });

    expect(hit.players[0].hp).toBe(1);
    expect(hit.damageTaken).toBe(2);
    expect(hit.retryCount).toBe(0);
  });
});

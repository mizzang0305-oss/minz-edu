import { describe, expect, it } from "vitest";
import {
  createDefaultGameData,
  parseStoredGameData,
  readGameData,
  saveAdventure,
  saveObservation,
  selectLearningGoal,
  saveSettings,
  saveTrainingAttempt,
  STORAGE_KEY,
  ACTIVE_CHILD_PROFILE_KEY,
  activateChildProfile,
  getChildStorageKey,
  removeChildProfileData,
  upgradeOwnedItem,
} from "./storage";

describe("versioned local storage", () => {
  it("자녀별 게임 기록을 별도 저장소로 분리하고 primary 기록은 그대로 유지한다", () => {
    const primary = createDefaultGameData();
    primary.inventory.coins = 35;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(primary));

    activateChildProfile({ id: "child_second", displayName: "하람", schoolLevel: "kindergarten", grade: 6 });
    expect(localStorage.getItem(ACTIVE_CHILD_PROFILE_KEY)).toBe("child_second");
    expect(readGameData().playerProfile.displayName).toBe("하람");
    expect(readGameData().inventory.coins).toBe(0);
    expect(localStorage.getItem(getChildStorageKey("child_second"))).not.toBeNull();

    activateChildProfile({ id: "primary", displayName: "민즈", schoolLevel: "elementary", grade: 2 });
    expect(readGameData().inventory.coins).toBe(35);
  });

  it("보조 자녀를 정리하면 해당 로컬 기록만 지우고 기본 자녀로 복구한다", () => {
    const primary = createDefaultGameData();
    primary.inventory.coins = 70;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(primary));
    activateChildProfile({ id: "child_second", displayName: "전환테스트", schoolLevel: "kindergarten", grade: 5 });
    const childKey = getChildStorageKey("child_second");
    expect(localStorage.getItem(childKey)).not.toBeNull();

    expect(removeChildProfileData("child_second", { id: "primary", displayName: "민표", schoolLevel: "elementary", grade: 5 })).toBe(true);
    expect(localStorage.getItem(childKey)).toBeNull();
    expect(localStorage.getItem(ACTIVE_CHILD_PROFILE_KEY)).toBe("primary");
    expect(readGameData().inventory.coins).toBe(70);
    expect(removeChildProfileData("primary")).toBe(false);
  });

  it("깨진 데이터와 알 수 없는 버전을 기본값으로 복구한다", () => {
    expect(parseStoredGameData("not-json")).toEqual(createDefaultGameData());
    expect(parseStoredGameData(JSON.stringify({ version: 99 }))).toEqual(createDefaultGameData());
  });

  it("v1 데이터를 잃지 않고 v7 장비 강화·세션 스키마로 옮긴다", () => {
    const migrated = parseStoredGameData(JSON.stringify({
      version: 1,
      inventory: { coins: 42, badges: ["용기 배지"] },
    }));
    expect(migrated.version).toBe(7);
    expect(migrated.stageProgress["number-forest"].status).toBe("available");
    expect(migrated.playerProfile).toMatchObject({ schoolLevel: "elementary", grade: 2 });
    expect(migrated.inventory.coins).toBe(42);
    expect(migrated.observationRecords).toEqual([]);
    expect(migrated.trainingHistory).toEqual([]);
    expect(migrated.inventory.upgradeLevels).toMatchObject({ "training-sword": 1, "thunder-strike": 1 });
  });

  it("보호자 설정과 친구 임시 프로필을 저장한다", () => {
    const settings = { ...createDefaultGameData().parentSettings, mode: "local-shared-screen" as const, friendName: "하람" };
    saveSettings(settings);
    const stored = readGameData();
    expect(stored.version).toBe(7);
    expect(stored.friendProfiles[0].displayName).toBe("하람");
    expect(stored.friendProfiles[0].schoolLevel).toBe("elementary");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").localCoopSettings.enabled).toBe(true);
  });

  it("캐릭터를 바꾸면 그 캐릭터의 기본 스킬을 실제 전투 목록에 해금한다", () => {
    const settings = { ...createDefaultGameData().parentSettings, characterId: "flame-mage" as const, selectedSkillId: "flame-burst" as const };
    saveSettings(settings);
    const stored = readGameData();
    expect(stored.playerProfile.characterId).toBe("flame-mage");
    expect(stored.inventory.unlockedSkillIds).toContain("flame-burst");
    expect(stored.inventory.ownedItemIds).toContain("flame-burst");
    expect(stored.inventory.ownedItemIds).toContain("apprentice-wand");
    expect(stored.inventory.equippedWeaponId).toBe("apprentice-wand");
    expect(stored.inventory.upgradeLevels["apprentice-wand"]).toBe(1);
  });

  it("중앙 저장 시 동기화 이벤트를 보내고 원격 병합 저장은 다시 보내지 않는다", () => {
    let events = 0;
    window.addEventListener("minz:game-data-changed", () => { events += 1; });
    const data = createDefaultGameData();
    saveSettings(data.parentSettings);
    expect(events).toBe(1);
  });

  it("유아와 중등 학습 단계를 그대로 보존한다", () => {
    const settings = { ...createDefaultGameData().parentSettings, schoolLevel: "kindergarten" as const, grade: 6, friendSchoolLevel: "kindergarten" as const, friendGrade: 5, mode: "local-shared-screen" as const };
    saveSettings(settings);
    const stored = readGameData();
    expect(stored.playerProfile).toMatchObject({ schoolLevel: "kindergarten", grade: 6 });
    expect(stored.friendProfiles[0]).toMatchObject({ schoolLevel: "kindergarten", grade: 5 });

    const migrated = parseStoredGameData(JSON.stringify({ version: 5, parentSettings: { schoolLevel: "middle", grade: 3 }, playerProfile: { schoolLevel: "middle", grade: 2 } }));
    expect(migrated.parentSettings).toMatchObject({ schoolLevel: "middle", grade: 3 });
    expect(migrated.playerProfile).toMatchObject({ schoolLevel: "middle", grade: 2 });
    expect(migrated.parentSettings.selectedLearningGoalId).toBe("middle-3-s2-math-w8");
  });

  it("협동 보상과 이력을 같은 기록으로 보존한다", () => {
    saveAdventure({ id: "a1", completedAt: "2026-07-12T00:00:00.000Z", mode: "local-shared-screen", playerNames: ["민표", "하람"], completedMissions: 3, retryCount: 1, hintCount: 1, specialSkill: "민즈 트윈 드래곤 브레이크", coins: 60, badges: ["용기 배지"], teamRewards: ["우정 코인"] });
    const stored = readGameData();
    expect(stored.coopBattleHistory).toHaveLength(1);
    expect(stored.teamRewards).toContain("우정 코인");
    expect(stored.unlockedTeamSkills).toContain("민즈 트윈 드래곤 브레이크");
  });

  it("같은 Stage 1 반복으로 Stage 3가 열리지 않는다", () => {
    const record = { id: "s1", completedAt: "2026-07-12T00:00:00.000Z", mode: "solo" as const, playerNames: ["민표"], completedMissions: 3, retryCount: 0, hintCount: 0, specialSkill: "브레이크", coins: 35, badges: ["개념 조각"], teamRewards: [], stageId: "number-forest" as const };
    saveAdventure(record);
    saveAdventure({ ...record, id: "s1-retry" });
    let stored = readGameData();
    expect(stored.stageProgress["word-island"].status).toBe("available");
    expect(stored.stageProgress["story-castle"].status).toBe("locked");
    saveAdventure({ ...record, id: "s2", stageId: "word-island" });
    stored = readGameData();
    expect(stored.stageProgress["story-castle"].status).toBe("available");
  });

  it("같은 협동 모험의 관찰 기록을 최신 값으로 교체한다", () => {
    const base = {
      adventureId: "coop-1",
      observedAt: "2026-07-12T00:00:00.000Z",
      turnClarity: 4 as const,
      waitComfort: 3 as const,
      helpOccurred: "partly" as const,
      specialSatisfaction: 5 as const,
      askedToReplay: true,
      notes: "서로 차례를 기다림",
    };
    saveObservation({ id: "o1", ...base });
    saveObservation({ id: "o2", ...base, notes: "두 번째 관찰" });
    const stored = readGameData();
    expect(stored.observationRecords).toHaveLength(1);
    expect(stored.observationRecords[0].notes).toBe("두 번째 관찰");
  });

  it("진단 결과를 목표별 누적하고 스테이지 잠금은 바꾸지 않는다", () => {
    const before = readGameData().stageProgress["word-island"].status;
    saveTrainingAttempt({ id: "t1", goalId: "elementary-2-s2-math-w8", mode: "diagnostic", completedAt: "2026-07-13T00:00:00.000Z", questionCount: 3, firstTryCorrect: 3, retryCount: 0, hintCount: 0, passed: true });
    const stored = readGameData();
    expect(stored.learningGoalProgress["elementary-2-s2-math-w8"].status).toBe("mastered");
    expect(stored.trainingHistory).toHaveLength(1);
    expect(stored.conceptProgress["place-value"]).toBe("자유롭게 사용");
    expect(stored.stageProgress["word-island"].status).toBe(before);
  });

  it("국어 목표를 직접 고르면 앞선 경로를 완료 처리하지 않고 입장만 연다", () => {
    const selected = selectLearningGoal("elementary-2-s2-korean-w12");
    expect(selected.parentSettings.selectedLearningGoalId).toBe("elementary-2-s2-korean-w12");
    expect(selected.stageProgress["number-forest"].status).toBe("available");
    expect(selected.stageProgress["word-island"].status).toBe("available");
    expect(selected.stageProgress["story-castle"].status).toBe("available");
    expect(selected.learningGoalProgress["elementary-2-s2-korean-w12"].status).toBe("ready");
    expect(selected.conceptProgress["main-idea"]).toBe("발견 중");
  });

  it("단어섬 목표 선택은 이야기 성까지 미리 열지 않는다", () => {
    const selected = selectLearningGoal("elementary-2-s2-korean-w9");
    expect(selected.stageProgress["word-island"].status).toBe("available");
    expect(selected.stageProgress["story-castle"].status).toBe("locked");
  });

  it("알 수 없는 목표는 선택하거나 훈련 기록으로 저장하지 않는다", () => {
    const before = readGameData();
    expect(selectLearningGoal("unknown-goal")).toEqual(before);
    expect(saveTrainingAttempt({ id: "bad", goalId: "unknown-goal", mode: "practice", completedAt: "2026-07-13T00:00:00.000Z", questionCount: 3, firstTryCorrect: 0, retryCount: 3, hintCount: 0, passed: false })).toEqual(before);
  });

  it("진단 통과 상태는 이후 연습이나 모험으로 낮아지지 않는다", () => {
    const goalId = "elementary-2-s2-math-w8";
    saveTrainingAttempt({ id: "master", goalId, mode: "diagnostic", completedAt: "2026-07-13T00:00:00.000Z", questionCount: 3, firstTryCorrect: 3, retryCount: 0, hintCount: 0, passed: true });
    saveTrainingAttempt({ id: "practice", goalId, mode: "practice", completedAt: "2026-07-13T00:05:00.000Z", questionCount: 3, firstTryCorrect: 1, retryCount: 2, hintCount: 1, passed: false });
    saveAdventure({ id: "adventure", learningGoalId: goalId, completedAt: "2026-07-13T00:10:00.000Z", mode: "solo", playerNames: ["민표"], completedMissions: 3, retryCount: 1, hintCount: 0, specialSkill: "브레이크", coins: 10, badges: [], teamRewards: [], stageId: "number-forest" });
    expect(readGameData().learningGoalProgress[goalId].status).toBe("mastered");
  });

  it("일부 스테이지 진행만 남은 이전 저장값에서 다음 스테이지를 복구한다", () => {
    const migrated = parseStoredGameData(JSON.stringify({ version: 4, stageProgress: { "number-forest": { stageId: "number-forest", status: "cleared", completedQuestIds: [], discoveredSecretIds: [] } }, learningGoalProgress: null, trainingHistory: null }));
    expect(migrated.stageProgress["number-forest"].status).toBe("cleared");
    expect(migrated.stageProgress["word-island"].status).toBe("available");
    expect(migrated.learningGoalProgress).toEqual({});
    expect(migrated.trainingHistory).toEqual([]);
  });

  it("깨진 이전 배열과 인벤토리를 빈 안전값으로 복구한다", () => {
    const migrated = parseStoredGameData(JSON.stringify({
      version: 4,
      inventory: { coins: -10, badges: null },
      playHistory: null,
      rewardHistory: {},
      friendProfiles: "broken",
      teamRewards: null,
      stageProgress: { "number-forest": { status: "wrong", completedQuestIds: null } },
    }));
    expect(migrated.inventory).toMatchObject({ coins: 0, badges: [], equippedWeaponId: "training-sword" });
    expect(migrated.inventory.ownedItemIds).toEqual(expect.arrayContaining(["training-sword", "thunder-strike"]));
    expect(migrated.playHistory).toEqual([]);
    expect(migrated.rewardHistory).toEqual([]);
    expect(migrated.friendProfiles).toEqual([]);
    expect(migrated.teamRewards).toEqual([]);
    expect(migrated.stageProgress["number-forest"]).toMatchObject({ status: "available", completedQuestIds: [] });
  });

  it("모험 성과는 선택 목표 기술과 실제 첫 성공 수로 기록한다", () => {
    const goalId = "elementary-2-s2-math-w8";
    saveAdventure({ id: "exact", learningGoalId: goalId, completedAt: "2026-07-13T01:00:00.000Z", mode: "solo", playerNames: ["민표"], completedMissions: 3, firstTryCorrect: 5, retryCount: 4, hintCount: 1, specialSkill: "브레이크", coins: 10, badges: [], teamRewards: [], stageId: "number-forest" });
    const stored = readGameData();
    expect(stored.learningGoalProgress[goalId].firstTryCorrect).toBe(5);
    expect(stored.learningGoalProgress[goalId].questionCount).toBe(5);
    expect(stored.conceptProgress["place-value"]).toBe("익히는 중");
    expect(stored.conceptProgress["make-ten"]).toBeUndefined();
  });

  it("보유 장비를 코인으로 강화하고 레벨을 저장한다", () => {
    const data = createDefaultGameData();
    data.inventory.coins = 100;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const upgraded = upgradeOwnedItem("training-sword");

    expect(upgraded.ok).toBe(true);
    expect(upgraded.data.inventory.upgradeLevels["training-sword"]).toBe(2);
    expect(upgraded.data.inventory.coins).toBe(80);
  });

  it("v6 저장 데이터의 보유 물품을 모두 Lv.1로 안전하게 마이그레이션한다", () => {
    const migrated = parseStoredGameData(JSON.stringify({
      version: 6,
      inventory: {
        coins: 50,
        badges: [],
        ownedItemIds: ["training-sword", "thunder-strike", "forest-armor"],
        equippedWeaponId: "training-sword",
        equippedArmorId: "forest-armor",
        unlockedSkillIds: ["thunder-strike"],
      },
    }));

    expect(migrated.version).toBe(7);
    expect(migrated.inventory.upgradeLevels).toMatchObject({
      "training-sword": 1,
      "thunder-strike": 1,
      "forest-armor": 1,
    });
  });
});

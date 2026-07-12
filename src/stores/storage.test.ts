import { describe, expect, it } from "vitest";
import { createDefaultGameData, parseStoredGameData, readGameData, saveAdventure, saveSettings, STORAGE_KEY } from "./storage";

describe("versioned local storage", () => {
  it("깨진 데이터와 알 수 없는 버전을 기본값으로 복구한다", () => {
    expect(parseStoredGameData("not-json")).toEqual(createDefaultGameData());
    expect(parseStoredGameData(JSON.stringify({ version: 99 }))).toEqual(createDefaultGameData());
  });

  it("보호자 설정과 친구 임시 프로필을 저장한다", () => {
    const settings = { ...createDefaultGameData().parentSettings, mode: "local-shared-screen" as const, friendName: "하람" };
    saveSettings(settings);
    const stored = readGameData();
    expect(stored.version).toBe(1);
    expect(stored.friendProfiles[0].displayName).toBe("하람");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").localCoopSettings.enabled).toBe(true);
  });

  it("협동 보상과 이력을 같은 기록으로 보존한다", () => {
    saveAdventure({ id: "a1", completedAt: "2026-07-12T00:00:00.000Z", mode: "local-shared-screen", playerNames: ["민표", "하람"], completedMissions: 3, retryCount: 1, hintCount: 1, specialSkill: "민즈 트윈 드래곤 브레이크", coins: 60, badges: ["용기 배지"], teamRewards: ["우정 코인"] });
    const stored = readGameData();
    expect(stored.coopBattleHistory).toHaveLength(1);
    expect(stored.teamRewards).toContain("우정 코인");
    expect(stored.unlockedTeamSkills).toContain("민즈 트윈 드래곤 브레이크");
  });
});

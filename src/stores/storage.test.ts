import { describe, expect, it } from "vitest";
import {
  createDefaultGameData,
  parseStoredGameData,
  readGameData,
  saveAdventure,
  saveObservation,
  saveSettings,
  STORAGE_KEY,
} from "./storage";

describe("versioned local storage", () => {
  it("깨진 데이터와 알 수 없는 버전을 기본값으로 복구한다", () => {
    expect(parseStoredGameData("not-json")).toEqual(createDefaultGameData());
    expect(parseStoredGameData(JSON.stringify({ version: 99 }))).toEqual(createDefaultGameData());
  });

  it("v1 데이터를 잃지 않고 v2 관찰 스키마로 옮긴다", () => {
    const migrated = parseStoredGameData(JSON.stringify({
      version: 1,
      inventory: { coins: 42, badges: ["용기 배지"] },
    }));
    expect(migrated.version).toBe(2);
    expect(migrated.inventory.coins).toBe(42);
    expect(migrated.observationRecords).toEqual([]);
  });

  it("보호자 설정과 친구 임시 프로필을 저장한다", () => {
    const settings = { ...createDefaultGameData().parentSettings, mode: "local-shared-screen" as const, friendName: "하람" };
    saveSettings(settings);
    const stored = readGameData();
    expect(stored.version).toBe(2);
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
});

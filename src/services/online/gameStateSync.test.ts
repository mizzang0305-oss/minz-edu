import { describe, expect, it } from "vitest";
import { createDefaultGameData } from "@/stores/storage";
import {
  applyGameSyncSnapshot,
  createGameSyncSnapshot,
  mergeGameSyncSnapshots,
  parseGameStateSyncRequest,
  parseGameSyncSnapshot,
} from "./gameStateSync";
import type { AdventureRecord } from "@/types/progress";

function adventure(id: string, coins: number, completedAt: string): AdventureRecord {
  return {
    id,
    completedAt,
    mode: "solo",
    playerNames: ["민즈"],
    completedMissions: 3,
    firstTryCorrect: 2,
    retryCount: 1,
    hintCount: 0,
    specialSkill: "번개 베기",
    coins,
    badges: [`${id} 배지`],
    teamRewards: [],
    stageId: "number-forest",
    learningGoalId: "elementary-2-s2-math-w8",
  };
}

function gameWith(records: AdventureRecord[]) {
  const data = createDefaultGameData();
  data.playerProfile.displayName = "민즈";
  data.playHistory = records;
  data.rewardHistory = records;
  data.inventory = {
    coins: 100 + records.reduce((sum, item) => sum + item.coins, 0),
    badges: ["이전 배지", ...records.flatMap((item) => item.badges)],
  };
  return data;
}

describe("guardian game state sync boundary", () => {
  it("deduplicates the same adventure so rewards are granted only once", () => {
    const record = adventure("run-1", 35, "2026-07-15T01:00:00.000Z");
    const left = createGameSyncSnapshot(gameWith([record]));
    const right = createGameSyncSnapshot(gameWith([record]));
    const merged = mergeGameSyncSnapshots(left, right);
    const restored = applyGameSyncSnapshot(createDefaultGameData(), merged);

    expect(merged.adventures).toHaveLength(1);
    expect(restored.inventory.coins).toBe(135);
    expect(restored.inventory.badges).toEqual(expect.arrayContaining(["이전 배지", "run-1 배지"]));
  });

  it("combines different offline adventures without losing either device result", () => {
    const left = createGameSyncSnapshot(gameWith([adventure("phone", 20, "2026-07-15T01:00:00.000Z")]));
    const right = createGameSyncSnapshot(gameWith([adventure("tablet", 30, "2026-07-15T02:00:00.000Z")]));
    const merged = mergeGameSyncSnapshots(left, right);
    const restored = applyGameSyncSnapshot(createDefaultGameData(), merged);

    expect(merged.adventures.map((item) => item.id)).toEqual(["phone", "tablet"]);
    expect(restored.inventory.coins).toBe(150);
    expect(restored.learningGoalProgress["elementary-2-s2-math-w8"]).toMatchObject({
      attempts: 2,
      firstTryCorrect: 4,
      questionCount: 6,
    });
  });

  it("keeps private child writing and guardian observations out of the cloud snapshot", () => {
    const data = gameWith([adventure("private", 10, "2026-07-15T03:00:00.000Z")]);
    data.playHistory[0].thought = "내가 쓴 자유 문장";
    data.opinionEntries = [{ id: "private", text: "내가 쓴 자유 문장", createdAt: "2026-07-15T03:01:00.000Z" }];
    data.observationRecords = [{ id: "observation", adventureId: "private", observedAt: "2026-07-15T03:02:00.000Z", turnClarity: 4, waitComfort: 4, helpOccurred: "yes", specialSatisfaction: 5, askedToReplay: true, notes: "보호자 메모" }];

    const serialized = JSON.stringify(createGameSyncSnapshot(data));
    expect(serialized).not.toContain("내가 쓴 자유 문장");
    expect(serialized).not.toContain("보호자 메모");
  });

  it("rejects malformed, oversized, and privilege-shaped payloads", () => {
    const valid = createGameSyncSnapshot(createDefaultGameData());
    expect(parseGameStateSyncRequest({ csrfToken: "token", state: valid })).not.toBeNull();
    expect(parseGameSyncSnapshot({ ...valid, schemaVersion: 99 })).toBeNull();
    expect(parseGameSyncSnapshot({ ...valid, adventures: [{ id: "../admin" }] })).toBeNull();
    expect(parseGameSyncSnapshot({ ...valid, legacyInventory: { coins: 99_000_000, badges: [] } })).toBeNull();
    expect(parseGameStateSyncRequest({ csrfToken: "token", state: { ...valid, guardianUid: "other" } })).toBeNull();
  });

  it("does not overwrite local-only fields when applying remote progress", () => {
    const local = gameWith([]);
    local.opinionEntries = [{ id: "note", text: "기기 전용", createdAt: "2026-07-15T04:00:00.000Z" }];
    local.parentSettings.soundVolume = 20;
    const remote = createGameSyncSnapshot(gameWith([adventure("remote", 15, "2026-07-15T04:10:00.000Z")]));
    const restored = applyGameSyncSnapshot(local, remote);

    expect(restored.opinionEntries[0].text).toBe("기기 전용");
    expect(restored.parentSettings.soundVolume).toBe(20);
    expect(restored.playHistory[0].playerNames).toEqual(["민즈"]);
  });
});

import { describe, expect, it } from "vitest";
import { createDefaultGameData } from "@/stores/storage";
import {
  applyGameSyncSnapshot,
  createGameSyncSnapshot,
  getGameStateSyncValidationCode,
  getGameSyncSnapshotValidationCode,
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
    expect(parseGameStateSyncRequest({ childProfileId: "primary", csrfToken: "token", state: valid })).not.toBeNull();
    expect(parseGameSyncSnapshot({ ...valid, schemaVersion: 99 })).toBeNull();
    expect(parseGameSyncSnapshot({ ...valid, adventures: [{ id: "../admin" }] })).toBeNull();
    expect(parseGameSyncSnapshot({ ...valid, legacyInventory: { coins: 99_000_000, badges: [] } })).toBeNull();
    expect(parseGameStateSyncRequest({ childProfileId: "primary", csrfToken: "token", state: { ...valid, guardianUid: "other" } })).toBeNull();
    expect(parseGameStateSyncRequest({ childProfileId: "../other", csrfToken: "token", state: valid })).toBeNull();
  });

  it("normalizes legacy goal totals before cloud sync", () => {
    const data = createDefaultGameData();
    data.learningGoalProgress["elementary-5-s2-math-w8"] = {
      goalId: "elementary-5-s2-math-w8",
      status: "in-progress",
      attempts: 1,
      firstTryCorrect: 5,
      questionCount: 3,
      retryCount: 0,
      hintCount: 0,
      updatedAt: "2026-07-15T01:00:00.000Z",
    };

    const snapshot = createGameSyncSnapshot(data);

    expect(snapshot.learningGoalProgress["elementary-5-s2-math-w8"].questionCount).toBe(5);
    expect(parseGameSyncSnapshot(snapshot)).not.toBeNull();
  });

  it("returns privacy-safe reason codes without echoing rejected values", () => {
    const valid = createGameSyncSnapshot(createDefaultGameData());
    const privateValue = "private-child-name";
    const malformed = {
      ...valid,
      adventures: [{ id: privateValue }],
    };

    const stateCode = getGameSyncSnapshotValidationCode(malformed);
    const requestCode = getGameStateSyncValidationCode({
      childProfileId: `../${privateValue}`,
      csrfToken: "token",
      state: valid,
    });

    expect(stateCode).toBe("SYNC_ADVENTURE_ITEM");
    expect(requestCode).toBe("SYNC_CHILD_PROFILE_ID");
    expect(JSON.stringify({ stateCode, requestCode })).not.toContain(privateValue);
  });

  it("normalizes every cloud-synced section of a malformed legacy snapshot", () => {
    const data = createDefaultGameData();
    (data as unknown as { playHistory: unknown[] }).playHistory = [{
      id: "../legacy-child-private",
      completedAt: "not-a-date",
      mode: "legacy-mode",
      completedMissions: 2.8,
      firstTryCorrect: 5.9,
      retryCount: -2,
      hintCount: Number.POSITIVE_INFINITY,
      specialSkill: " ",
      coins: 35.9,
      badges: ["첫 모험", "", 123],
      teamRewards: ["협동 보상", "협동 보상"],
      stageId: "unknown-stage",
      completedQuestIds: ["quest-1", ""],
      discoveredSecretIds: ["secret-1"],
      learningGoalId: "elementary-5-s2-math-w8",
    }];
    (data as unknown as { trainingHistory: unknown[] }).trainingHistory = [{
      id: "../legacy-training",
      goalId: "elementary-5-s2-math-w8",
      mode: "old-practice",
      completedAt: "invalid",
      questionCount: 2,
      firstTryCorrect: 4,
      retryCount: -1,
      hintCount: 1.9,
      passed: "yes",
    }];
    (data as unknown as { inventory: unknown }).inventory = {
      coins: 35.9,
      badges: ["첫 모험", "", 123],
    };
    (data as unknown as { stageProgress: Record<string, unknown> }).stageProgress = {
      "number-forest": { status: "cleared", completedQuestIds: ["forest-1"], discoveredSecretIds: [], clearedAt: "not-a-date" },
      "word-island": { status: "available", completedQuestIds: [], discoveredSecretIds: [] },
      "story-castle": { status: "broken", completedQuestIds: null, discoveredSecretIds: null },
    };
    (data as unknown as { learningGoalProgress: Record<string, unknown> }).learningGoalProgress = {
      "elementary-5-s2-math-w8": {
        status: "old-status",
        attempts: 1.9,
        firstTryCorrect: 5,
        questionCount: 2,
        retryCount: -3,
        hintCount: Number.NaN,
        updatedAt: "invalid",
      },
      "../private-goal": { attempts: 99 },
    };
    (data as unknown as { teamRewards: unknown }).teamRewards = ["협동 보상", "", 123];
    (data as unknown as { unlockedTeamSkills: unknown }).unlockedTeamSkills = ["번개", "번개", null];

    const snapshot = createGameSyncSnapshot(data);
    const restored = applyGameSyncSnapshot(createDefaultGameData(), snapshot);

    expect(getGameSyncSnapshotValidationCode(snapshot)).toBeNull();
    expect(parseGameSyncSnapshot(snapshot)).not.toBeNull();
    expect(snapshot.adventures).toHaveLength(1);
    expect(snapshot.adventures[0].id).toMatch(/^legacy-adventure-/);
    expect(snapshot.trainingAttempts).toHaveLength(1);
    expect(snapshot.trainingAttempts[0].questionCount).toBe(4);
    expect(snapshot.stageProgress["number-forest"].status).toBe("cleared");
    expect(snapshot.stageProgress["word-island"].status).toBe("available");
    expect(snapshot.stageProgress["story-castle"].status).toBe("locked");
    expect(snapshot.learningGoalProgress["elementary-5-s2-math-w8"]).toMatchObject({
      status: "ready",
      firstTryCorrect: 5,
      questionCount: 5,
    });
    expect(snapshot.learningGoalProgress).not.toHaveProperty("../private-goal");
    expect(snapshot.teamRewards).toEqual(["협동 보상"]);
    expect(snapshot.unlockedTeamSkills).toEqual(["번개"]);
    expect(restored.inventory.coins).toBe(35);
    expect(restored.inventory.badges).toEqual(["첫 모험"]);
  });

  it("keeps merged question totals valid when old first-try counts exceed mission counts", () => {
    const oldAdventure = adventure("old-run", 0, "2026-07-15T05:00:00.000Z");
    oldAdventure.completedMissions = 1;
    oldAdventure.firstTryCorrect = 5;
    const merged = mergeGameSyncSnapshots(
      createGameSyncSnapshot(createDefaultGameData()),
      createGameSyncSnapshot(gameWith([oldAdventure])),
    );
    const goal = merged.learningGoalProgress["elementary-2-s2-math-w8"];

    expect(goal.firstTryCorrect).toBe(5);
    expect(goal.questionCount).toBeGreaterThanOrEqual(goal.firstTryCorrect);
    expect(parseGameSyncSnapshot(merged)).not.toBeNull();
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

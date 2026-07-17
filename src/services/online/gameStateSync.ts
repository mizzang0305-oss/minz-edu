import type { TrainingAttemptRecord } from "@/types/curriculum";
import type { AdventureRecord, StageProgress, StoredGameData } from "@/types/progress";
import { isValidChildProfileId } from "@/services/online/childProfileSync";

export const GAME_SYNC_SCHEMA_VERSION = 1 as const;
export const GAME_DATA_CHANGED_EVENT = "minz:game-data-changed";

const STAGE_IDS = ["number-forest", "word-island", "story-castle"] as const;
const MAX_ADVENTURES = 240;
const MAX_TRAINING_ATTEMPTS = 400;
const MAX_GOALS = 240;
const MAX_ARCHIVED_ADVENTURE_IDS = 2_000;
const MAX_LIST_ITEMS = 80;
const MAX_TEXT_LENGTH = 80;
const MAX_COUNTER = 1_000_000;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;

type SyncedAdventure = Omit<
  AdventureRecord,
  "playerNames" | "thought" | "coopMetrics" | "mapId"
>;

export type GameSyncSnapshot = {
  schemaVersion: typeof GAME_SYNC_SCHEMA_VERSION;
  legacyInventory: { coins: number; badges: string[] };
  archivedAdventureIds: string[];
  adventures: SyncedAdventure[];
  trainingAttempts: TrainingAttemptRecord[];
  stageProgress: StoredGameData["stageProgress"];
  learningGoalProgress: StoredGameData["learningGoalProgress"];
  teamRewards: string[];
  unlockedTeamSkills: string[];
};

export type GameStateSyncRequest = {
  childProfileId: string;
  csrfToken: string;
  state: GameSyncSnapshot;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
}

function isSafeInteger(value: unknown, maximum = MAX_COUNTER): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 20 || value.length > 40) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.now() + 86_400_000;
}

function parseTextList(value: unknown, maximum = MAX_LIST_ITEMS): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length < 1 || item.length > MAX_TEXT_LENGTH) return null;
    result.push(item);
  }
  return Array.from(new Set(result));
}

function parseAdventure(value: unknown): SyncedAdventure | null {
  if (!isRecord(value) || !isSafeId(value.id) || !isIsoTimestamp(value.completedAt)) return null;
  if (!hasOnlyKeys(value, ["id", "completedAt", "mode", "completedMissions", "firstTryCorrect", "retryCount", "hintCount", "specialSkill", "coins", "badges", "teamRewards", "stageId", "completedQuestIds", "discoveredSecretIds", "learningGoalId"])) return null;
  if (value.mode !== "solo" && value.mode !== "local-shared-screen") return null;
  if (
    !isSafeInteger(value.completedMissions, 100) ||
    !isSafeInteger(value.retryCount, 1_000) ||
    !isSafeInteger(value.hintCount, 1_000) ||
    !isSafeInteger(value.coins, 10_000) ||
    (value.firstTryCorrect !== undefined && !isSafeInteger(value.firstTryCorrect, 100)) ||
    typeof value.specialSkill !== "string" ||
    value.specialSkill.length < 1 ||
    value.specialSkill.length > MAX_TEXT_LENGTH
  ) return null;

  const badges = parseTextList(value.badges, 20);
  const teamRewards = parseTextList(value.teamRewards, 20);
  const completedQuestIds = value.completedQuestIds === undefined ? undefined : parseTextList(value.completedQuestIds, 40);
  const discoveredSecretIds = value.discoveredSecretIds === undefined ? undefined : parseTextList(value.discoveredSecretIds, 40);
  if (!badges || !teamRewards || completedQuestIds === null || discoveredSecretIds === null) return null;
  if (value.stageId !== undefined && !STAGE_IDS.includes(value.stageId as StageProgress["stageId"])) return null;
  if (value.learningGoalId !== undefined && !isSafeId(value.learningGoalId)) return null;

  return {
    id: value.id,
    completedAt: value.completedAt,
    mode: value.mode,
    completedMissions: value.completedMissions,
    ...(value.firstTryCorrect !== undefined ? { firstTryCorrect: value.firstTryCorrect } : {}),
    retryCount: value.retryCount,
    hintCount: value.hintCount,
    specialSkill: value.specialSkill,
    coins: value.coins,
    badges,
    teamRewards,
    ...(value.stageId ? { stageId: value.stageId as StageProgress["stageId"] } : {}),
    ...(completedQuestIds ? { completedQuestIds } : {}),
    ...(discoveredSecretIds ? { discoveredSecretIds } : {}),
    ...(value.learningGoalId ? { learningGoalId: value.learningGoalId } : {}),
  };
}

function parseTrainingAttempt(value: unknown): TrainingAttemptRecord | null {
  if (!isRecord(value) || !isSafeId(value.id) || !isSafeId(value.goalId) || !isIsoTimestamp(value.completedAt)) return null;
  if (!hasOnlyKeys(value, ["id", "goalId", "mode", "completedAt", "questionCount", "firstTryCorrect", "retryCount", "hintCount", "passed"])) return null;
  if (value.mode !== "practice" && value.mode !== "diagnostic") return null;
  if (
    !isSafeInteger(value.questionCount, 100) ||
    !isSafeInteger(value.firstTryCorrect, 100) ||
    !isSafeInteger(value.retryCount, 1_000) ||
    !isSafeInteger(value.hintCount, 1_000) ||
    typeof value.passed !== "boolean" ||
    value.firstTryCorrect > value.questionCount
  ) return null;
  return value as TrainingAttemptRecord;
}

function parseStageProgress(value: unknown): GameSyncSnapshot["stageProgress"] | null {
  if (!isRecord(value)) return null;
  const parsed = {} as GameSyncSnapshot["stageProgress"];
  for (const stageId of STAGE_IDS) {
    const candidate = value[stageId];
    if (!isRecord(candidate) || candidate.stageId !== stageId) return null;
    if (!hasOnlyKeys(candidate, ["stageId", "status", "completedQuestIds", "discoveredSecretIds", "clearedAt"])) return null;
    if (candidate.status !== "locked" && candidate.status !== "available" && candidate.status !== "cleared") return null;
    const completedQuestIds = parseTextList(candidate.completedQuestIds, 60);
    const discoveredSecretIds = parseTextList(candidate.discoveredSecretIds, 60);
    if (!completedQuestIds || !discoveredSecretIds) return null;
    if (candidate.clearedAt !== undefined && !isIsoTimestamp(candidate.clearedAt)) return null;
    parsed[stageId] = {
      stageId,
      status: candidate.status,
      completedQuestIds,
      discoveredSecretIds,
      ...(candidate.clearedAt ? { clearedAt: candidate.clearedAt as string } : {}),
    };
  }
  return parsed;
}

function parseGoalProgress(value: unknown): GameSyncSnapshot["learningGoalProgress"] | null {
  if (!isRecord(value) || Object.keys(value).length > MAX_GOALS) return null;
  const parsed: GameSyncSnapshot["learningGoalProgress"] = {};
  for (const [goalId, candidate] of Object.entries(value)) {
    if (!isSafeId(goalId) || !isRecord(candidate) || candidate.goalId !== goalId) return null;
    if (!hasOnlyKeys(candidate, ["goalId", "status", "attempts", "firstTryCorrect", "questionCount", "retryCount", "hintCount", "updatedAt"])) return null;
    if (!["ready", "in-progress", "mastered", "needs-practice"].includes(String(candidate.status))) return null;
    if (
      !isSafeInteger(candidate.attempts) ||
      !isSafeInteger(candidate.firstTryCorrect) ||
      !isSafeInteger(candidate.questionCount) ||
      !isSafeInteger(candidate.retryCount) ||
      !isSafeInteger(candidate.hintCount) ||
      !isIsoTimestamp(candidate.updatedAt) ||
      candidate.firstTryCorrect > candidate.questionCount
    ) return null;
    parsed[goalId] = candidate as GameSyncSnapshot["learningGoalProgress"][string];
  }
  return parsed;
}

export function parseGameSyncSnapshot(value: unknown): GameSyncSnapshot | null {
  if (!isRecord(value) || value.schemaVersion !== GAME_SYNC_SCHEMA_VERSION) return null;
  if (!hasOnlyKeys(value, ["schemaVersion", "legacyInventory", "archivedAdventureIds", "adventures", "trainingAttempts", "stageProgress", "learningGoalProgress", "teamRewards", "unlockedTeamSkills"])) return null;
  if (!isRecord(value.legacyInventory) || !isSafeInteger(value.legacyInventory.coins, 10_000_000)) return null;
  if (!hasOnlyKeys(value.legacyInventory, ["coins", "badges"])) return null;
  const legacyBadges = parseTextList(value.legacyInventory.badges);
  const archivedAdventureIds = parseTextList(value.archivedAdventureIds, MAX_ARCHIVED_ADVENTURE_IDS);
  const teamRewards = parseTextList(value.teamRewards);
  const unlockedTeamSkills = parseTextList(value.unlockedTeamSkills);
  const stageProgress = parseStageProgress(value.stageProgress);
  const learningGoalProgress = parseGoalProgress(value.learningGoalProgress);
  if (!legacyBadges || !archivedAdventureIds || !teamRewards || !unlockedTeamSkills || !stageProgress || !learningGoalProgress) return null;
  if (archivedAdventureIds.some((id) => !isSafeId(id))) return null;
  if (!Array.isArray(value.adventures) || value.adventures.length > MAX_ADVENTURES) return null;
  if (!Array.isArray(value.trainingAttempts) || value.trainingAttempts.length > MAX_TRAINING_ATTEMPTS) return null;
  const adventures = value.adventures.map(parseAdventure);
  const trainingAttempts = value.trainingAttempts.map(parseTrainingAttempt);
  if (adventures.some((item) => !item) || trainingAttempts.some((item) => !item)) return null;
  return {
    schemaVersion: GAME_SYNC_SCHEMA_VERSION,
    legacyInventory: { coins: value.legacyInventory.coins, badges: legacyBadges },
    archivedAdventureIds,
    adventures: adventures as SyncedAdventure[],
    trainingAttempts: trainingAttempts as TrainingAttemptRecord[],
    stageProgress,
    learningGoalProgress,
    teamRewards,
    unlockedTeamSkills,
  };
}

export function parseGameStateSyncRequest(value: unknown): GameStateSyncRequest | null {
  if (!isRecord(value) || typeof value.csrfToken !== "string" || !isValidChildProfileId(value.childProfileId)) return null;
  if (!hasOnlyKeys(value, ["childProfileId", "csrfToken", "state"])) return null;
  const state = parseGameSyncSnapshot(value.state);
  return state ? { childProfileId: value.childProfileId, csrfToken: value.csrfToken, state } : null;
}

export function readGameStateSyncCsrfToken(value: unknown): unknown {
  return isRecord(value) ? value.csrfToken : undefined;
}

function uniqueTexts(values: string[], maximum = MAX_LIST_ITEMS) {
  return Array.from(new Set(values)).slice(0, maximum);
}

function dedupeById<T extends { id: string; completedAt: string }>(items: T[]) {
  const byId = new Map<string, T>();
  for (const item of items) {
    const current = byId.get(item.id);
    if (!current || current.completedAt <= item.completedAt) byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

const STAGE_RANK = { locked: 0, available: 1, cleared: 2 } as const;

function mergeStages(left: GameSyncSnapshot["stageProgress"], right: GameSyncSnapshot["stageProgress"]) {
  return Object.fromEntries(STAGE_IDS.map((stageId) => {
    const a = left[stageId];
    const b = right[stageId];
    const winner = STAGE_RANK[a.status] >= STAGE_RANK[b.status] ? a : b;
    const clearedAt = [a.clearedAt, b.clearedAt].filter((item): item is string => Boolean(item)).sort()[0];
    return [stageId, {
      stageId,
      status: winner.status,
      completedQuestIds: uniqueTexts([...a.completedQuestIds, ...b.completedQuestIds], 60),
      discoveredSecretIds: uniqueTexts([...a.discoveredSecretIds, ...b.discoveredSecretIds], 60),
      ...(clearedAt ? { clearedAt } : {}),
    }];
  })) as GameSyncSnapshot["stageProgress"];
}

function mergeGoalProgress(
  left: GameSyncSnapshot["learningGoalProgress"],
  right: GameSyncSnapshot["learningGoalProgress"],
  adventures: SyncedAdventure[],
  trainingAttempts: TrainingAttemptRecord[],
) {
  const result: GameSyncSnapshot["learningGoalProgress"] = {};
  const goalIds = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const adventure of adventures) if (adventure.learningGoalId) goalIds.add(adventure.learningGoalId);
  for (const attempt of trainingAttempts) goalIds.add(attempt.goalId);

  for (const goalId of Array.from(goalIds).slice(0, MAX_GOALS)) {
    const a = left[goalId];
    const b = right[goalId];
    const relevantAdventures = adventures.filter((item) => item.learningGoalId === goalId);
    const relevantTraining = trainingAttempts.filter((item) => item.goalId === goalId);
    const events = [
      ...relevantAdventures.map((item) => ({ completedAt: item.completedAt, status: "in-progress" as const })),
      ...relevantTraining.map((item) => ({
        completedAt: item.completedAt,
        status: item.mode === "diagnostic" && item.passed
          ? "mastered" as const
          : item.passed ? "in-progress" as const : "needs-practice" as const,
      })),
    ].sort((x, y) => x.completedAt.localeCompare(y.completedAt));
    const mastered = a?.status === "mastered" || b?.status === "mastered" || events.some((item) => item.status === "mastered");
    const baseline = !a ? b : !b ? a : a.updatedAt >= b.updatedAt ? a : b;
    const latest = events.at(-1);
    const updatedAt = [a?.updatedAt, b?.updatedAt, latest?.completedAt].filter((item): item is string => Boolean(item)).sort().at(-1);
    if (!updatedAt) continue;
    const eventTotals = {
      attempts: relevantAdventures.length + relevantTraining.length,
      firstTryCorrect: relevantAdventures.reduce((sum, item) => sum + (item.firstTryCorrect ?? Math.max(0, item.completedMissions - item.retryCount)), 0) + relevantTraining.reduce((sum, item) => sum + item.firstTryCorrect, 0),
      questionCount: relevantAdventures.reduce((sum, item) => sum + Math.max(1, item.completedMissions), 0) + relevantTraining.reduce((sum, item) => sum + item.questionCount, 0),
      retryCount: relevantAdventures.reduce((sum, item) => sum + item.retryCount, 0) + relevantTraining.reduce((sum, item) => sum + item.retryCount, 0),
      hintCount: relevantAdventures.reduce((sum, item) => sum + item.hintCount, 0) + relevantTraining.reduce((sum, item) => sum + item.hintCount, 0),
    };
    result[goalId] = {
      goalId,
      status: mastered ? "mastered" : latest?.status ?? baseline?.status ?? "ready",
      attempts: Math.max(a?.attempts ?? 0, b?.attempts ?? 0, eventTotals.attempts),
      firstTryCorrect: Math.max(a?.firstTryCorrect ?? 0, b?.firstTryCorrect ?? 0, eventTotals.firstTryCorrect),
      questionCount: Math.max(a?.questionCount ?? 0, b?.questionCount ?? 0, eventTotals.questionCount),
      retryCount: Math.max(a?.retryCount ?? 0, b?.retryCount ?? 0, eventTotals.retryCount),
      hintCount: Math.max(a?.hintCount ?? 0, b?.hintCount ?? 0, eventTotals.hintCount),
      updatedAt,
    };
  }
  return result;
}

export function mergeGameSyncSnapshots(left: GameSyncSnapshot, right: GameSyncSnapshot): GameSyncSnapshot {
  const previouslyArchived = new Set([...left.archivedAdventureIds, ...right.archivedAdventureIds]);
  const allAdventures = dedupeById([...left.adventures, ...right.adventures])
    .filter((item) => !previouslyArchived.has(item.id));
  const droppedAdventures = allAdventures.slice(0, Math.max(0, allAdventures.length - MAX_ADVENTURES));
  const adventures = allAdventures.slice(-MAX_ADVENTURES);
  const archivedAdventureIds = uniqueTexts(
    [...previouslyArchived, ...droppedAdventures.map((item) => item.id)],
    MAX_ARCHIVED_ADVENTURE_IDS,
  );
  const allTraining = dedupeById([...left.trainingAttempts, ...right.trainingAttempts]);
  const trainingAttempts = allTraining.slice(-MAX_TRAINING_ATTEMPTS);
  const legacyBadges = uniqueTexts([
    ...left.legacyInventory.badges,
    ...right.legacyInventory.badges,
    ...droppedAdventures.flatMap((item) => item.badges),
  ]);
  const legacyCoins = Math.min(
    10_000_000,
    Math.max(left.legacyInventory.coins, right.legacyInventory.coins) + droppedAdventures.reduce((sum, item) => sum + item.coins, 0),
  );
  return {
    schemaVersion: GAME_SYNC_SCHEMA_VERSION,
    legacyInventory: { coins: legacyCoins, badges: legacyBadges },
    archivedAdventureIds,
    adventures,
    trainingAttempts,
    stageProgress: mergeStages(left.stageProgress, right.stageProgress),
    learningGoalProgress: mergeGoalProgress(left.learningGoalProgress, right.learningGoalProgress, adventures, trainingAttempts),
    teamRewards: uniqueTexts([...left.teamRewards, ...right.teamRewards, ...allAdventures.flatMap((item) => item.teamRewards)]),
    unlockedTeamSkills: uniqueTexts([...left.unlockedTeamSkills, ...right.unlockedTeamSkills]),
  };
}

export function createGameSyncSnapshot(data: StoredGameData): GameSyncSnapshot {
  const adventures = dedupeById(data.playHistory.map((record) => ({
    id: record.id,
    completedAt: record.completedAt,
    mode: record.mode,
    completedMissions: record.completedMissions,
    ...(record.firstTryCorrect !== undefined ? { firstTryCorrect: record.firstTryCorrect } : {}),
    retryCount: record.retryCount,
    hintCount: record.hintCount,
    specialSkill: record.specialSkill,
    coins: record.coins,
    badges: uniqueTexts(record.badges, 20),
    teamRewards: uniqueTexts(record.teamRewards, 20),
    ...(record.stageId ? { stageId: record.stageId } : {}),
    ...(record.completedQuestIds ? { completedQuestIds: uniqueTexts(record.completedQuestIds, 40) } : {}),
    ...(record.discoveredSecretIds ? { discoveredSecretIds: uniqueTexts(record.discoveredSecretIds, 40) } : {}),
    ...(record.learningGoalId ? { learningGoalId: record.learningGoalId } : {}),
  }))).slice(-MAX_ADVENTURES);
  const representedCoins = adventures.reduce((sum, item) => sum + item.coins, 0);
  const representedBadges = new Set(adventures.flatMap((item) => item.badges));
  const learningGoalProgress = Object.fromEntries(
    Object.entries(data.learningGoalProgress).map(([goalId, progress]) => [goalId, {
      ...progress,
      questionCount: Math.max(progress.questionCount, progress.firstTryCorrect),
    }]),
  );
  return {
    schemaVersion: GAME_SYNC_SCHEMA_VERSION,
    legacyInventory: {
      coins: Math.max(0, data.inventory.coins - representedCoins),
      badges: data.inventory.badges.filter((badge) => !representedBadges.has(badge)).slice(0, MAX_LIST_ITEMS),
    },
    archivedAdventureIds: [],
    adventures,
    trainingAttempts: dedupeById(data.trainingHistory).slice(-MAX_TRAINING_ATTEMPTS),
    stageProgress: data.stageProgress,
    learningGoalProgress,
    teamRewards: uniqueTexts(data.teamRewards),
    unlockedTeamSkills: uniqueTexts(data.unlockedTeamSkills),
  };
}

export function applyGameSyncSnapshot(local: StoredGameData, remote: GameSyncSnapshot): StoredGameData {
  const merged = mergeGameSyncSnapshots(createGameSyncSnapshot(local), remote);
  const localById = new Map(local.playHistory.map((item) => [item.id, item]));
  const playHistory: AdventureRecord[] = merged.adventures.map((item) => localById.get(item.id) ?? {
    ...item,
    playerNames: [local.playerProfile.displayName],
  });
  const badges = uniqueTexts([
    ...merged.legacyInventory.badges,
    ...playHistory.flatMap((item) => item.badges),
  ]);
  return {
    ...local,
    inventory: {
      coins: merged.legacyInventory.coins + playHistory.reduce((sum, item) => sum + item.coins, 0),
      badges,
    },
    rewardHistory: playHistory,
    playHistory,
    coopBattleHistory: playHistory.filter((item) => item.mode === "local-shared-screen"),
    teamRewards: merged.teamRewards,
    unlockedTeamSkills: merged.unlockedTeamSkills,
    stageProgress: merged.stageProgress,
    learningGoalProgress: merged.learningGoalProgress,
    trainingHistory: merged.trainingAttempts,
  };
}

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

export type GameSyncValidationCode =
  | "SYNC_REQUEST_SHAPE"
  | "SYNC_CHILD_PROFILE_ID"
  | "SYNC_CSRF_SHAPE"
  | "SYNC_STATE_SHAPE"
  | "SYNC_SCHEMA_VERSION"
  | "SYNC_STATE_KEYS"
  | "SYNC_LEGACY_INVENTORY"
  | "SYNC_ARCHIVED_IDS"
  | "SYNC_ADVENTURES_SHAPE"
  | "SYNC_ADVENTURE_ITEM"
  | "SYNC_TRAINING_SHAPE"
  | "SYNC_TRAINING_ITEM"
  | "SYNC_STAGE_PROGRESS"
  | "SYNC_LEARNING_PROGRESS"
  | "SYNC_TEAM_REWARDS"
  | "SYNC_UNLOCKED_SKILLS";

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

export function getGameSyncSnapshotValidationCode(value: unknown): GameSyncValidationCode | null {
  if (!isRecord(value)) return "SYNC_STATE_SHAPE";
  if (value.schemaVersion !== GAME_SYNC_SCHEMA_VERSION) return "SYNC_SCHEMA_VERSION";
  if (!hasOnlyKeys(value, ["schemaVersion", "legacyInventory", "archivedAdventureIds", "adventures", "trainingAttempts", "stageProgress", "learningGoalProgress", "teamRewards", "unlockedTeamSkills"])) return "SYNC_STATE_KEYS";
  if (
    !isRecord(value.legacyInventory) ||
    !hasOnlyKeys(value.legacyInventory, ["coins", "badges"]) ||
    !isSafeInteger(value.legacyInventory.coins, 10_000_000) ||
    !parseTextList(value.legacyInventory.badges)
  ) return "SYNC_LEGACY_INVENTORY";
  const archivedAdventureIds = parseTextList(value.archivedAdventureIds, MAX_ARCHIVED_ADVENTURE_IDS);
  if (!archivedAdventureIds || archivedAdventureIds.some((id) => !isSafeId(id))) return "SYNC_ARCHIVED_IDS";
  if (!Array.isArray(value.adventures) || value.adventures.length > MAX_ADVENTURES) return "SYNC_ADVENTURES_SHAPE";
  if (value.adventures.some((item) => !parseAdventure(item))) return "SYNC_ADVENTURE_ITEM";
  if (!Array.isArray(value.trainingAttempts) || value.trainingAttempts.length > MAX_TRAINING_ATTEMPTS) return "SYNC_TRAINING_SHAPE";
  if (value.trainingAttempts.some((item) => !parseTrainingAttempt(item))) return "SYNC_TRAINING_ITEM";
  if (!parseStageProgress(value.stageProgress)) return "SYNC_STAGE_PROGRESS";
  if (!parseGoalProgress(value.learningGoalProgress)) return "SYNC_LEARNING_PROGRESS";
  if (!parseTextList(value.teamRewards)) return "SYNC_TEAM_REWARDS";
  if (!parseTextList(value.unlockedTeamSkills)) return "SYNC_UNLOCKED_SKILLS";
  return null;
}

export function getGameStateSyncValidationCode(value: unknown): GameSyncValidationCode | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["childProfileId", "csrfToken", "state"])) return "SYNC_REQUEST_SHAPE";
  if (!isValidChildProfileId(value.childProfileId)) return "SYNC_CHILD_PROFILE_ID";
  if (typeof value.csrfToken !== "string") return "SYNC_CSRF_SHAPE";
  return getGameSyncSnapshotValidationCode(value.state);
}

export function parseGameSyncSnapshot(value: unknown): GameSyncSnapshot | null {
  if (getGameSyncSnapshotValidationCode(value) !== null || !isRecord(value) || !isRecord(value.legacyInventory)) return null;
  const legacyBadges = parseTextList(value.legacyInventory.badges);
  const archivedAdventureIds = parseTextList(value.archivedAdventureIds, MAX_ARCHIVED_ADVENTURE_IDS);
  const teamRewards = parseTextList(value.teamRewards);
  const unlockedTeamSkills = parseTextList(value.unlockedTeamSkills);
  const stageProgress = parseStageProgress(value.stageProgress);
  const learningGoalProgress = parseGoalProgress(value.learningGoalProgress);
  if (!legacyBadges || !archivedAdventureIds || !teamRewards || !unlockedTeamSkills || !stageProgress || !learningGoalProgress) return null;
  const adventures = (value.adventures as unknown[]).map(parseAdventure);
  const trainingAttempts = (value.trainingAttempts as unknown[]).map(parseTrainingAttempt);
  if (adventures.some((item) => !item) || trainingAttempts.some((item) => !item)) return null;
  return {
    schemaVersion: GAME_SYNC_SCHEMA_VERSION,
    legacyInventory: { coins: Number(value.legacyInventory.coins), badges: legacyBadges },
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
  if (getGameStateSyncValidationCode(value) !== null || !isRecord(value) || typeof value.csrfToken !== "string" || typeof value.childProfileId !== "string") return null;
  const state = parseGameSyncSnapshot(value.state);
  return state ? { childProfileId: value.childProfileId, csrfToken: value.csrfToken, state } : null;
}

export function readGameStateSyncCsrfToken(value: unknown): unknown {
  return isRecord(value) ? value.csrfToken : undefined;
}

function uniqueTexts(values: string[], maximum = MAX_LIST_ITEMS) {
  return Array.from(new Set(values)).slice(0, maximum);
}

const LEGACY_TIMESTAMP = "1970-01-01T00:00:00.000Z";

function normalizeCounter(value: unknown, maximum = MAX_COUNTER) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(0, Math.trunc(value)));
}

function normalizeTimestamp(value: unknown) {
  return isIsoTimestamp(value) ? value : LEGACY_TIMESTAMP;
}

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().slice(0, MAX_TEXT_LENGTH);
  return normalized || fallback;
}

function normalizeTextList(value: unknown, maximum = MAX_LIST_ITEMS) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap((item) => {
    if (typeof item !== "string") return [];
    const normalized = item.trim().slice(0, MAX_TEXT_LENGTH);
    return normalized ? [normalized] : [];
  }))).slice(0, maximum);
}

function stableLegacyDiscriminator(parts: unknown[]) {
  const input = JSON.stringify(parts);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeRecordId(value: unknown, prefix: string, timestamp: string, fingerprint: unknown[]) {
  if (isSafeId(value)) return value;
  const timestampPart = Math.max(0, Date.parse(timestamp));
  return `${prefix}-${timestampPart}-${stableLegacyDiscriminator([value, ...fingerprint])}`;
}

function normalizeAdventure(value: unknown): SyncedAdventure | null {
  if (!isRecord(value)) return null;
  const completedAt = normalizeTimestamp(value.completedAt);
  const firstTryCorrect = value.firstTryCorrect === undefined ? undefined : normalizeCounter(value.firstTryCorrect, 100);
  const completedQuestIds = normalizeTextList(value.completedQuestIds, 40);
  const discoveredSecretIds = normalizeTextList(value.discoveredSecretIds, 40);
  const stageId = STAGE_IDS.includes(value.stageId as StageProgress["stageId"])
    ? value.stageId as StageProgress["stageId"]
    : undefined;
  const learningGoalId = isSafeId(value.learningGoalId) ? value.learningGoalId : undefined;
  return {
    id: normalizeRecordId(value.id, "legacy-adventure", completedAt, [
      value.completedAt,
      value.mode,
      value.completedMissions,
      value.firstTryCorrect,
      value.retryCount,
      value.hintCount,
      value.specialSkill,
      value.coins,
      value.badges,
      value.teamRewards,
      value.stageId,
      value.completedQuestIds,
      value.discoveredSecretIds,
      value.learningGoalId,
    ]),
    completedAt,
    mode: value.mode === "local-shared-screen" ? "local-shared-screen" : "solo",
    completedMissions: normalizeCounter(value.completedMissions, 100),
    ...(firstTryCorrect !== undefined ? { firstTryCorrect } : {}),
    retryCount: normalizeCounter(value.retryCount, 1_000),
    hintCount: normalizeCounter(value.hintCount, 1_000),
    specialSkill: normalizeText(value.specialSkill, "모험 스킬"),
    coins: normalizeCounter(value.coins, 10_000),
    badges: normalizeTextList(value.badges, 20),
    teamRewards: normalizeTextList(value.teamRewards, 20),
    ...(stageId ? { stageId } : {}),
    ...(completedQuestIds.length > 0 ? { completedQuestIds } : {}),
    ...(discoveredSecretIds.length > 0 ? { discoveredSecretIds } : {}),
    ...(learningGoalId ? { learningGoalId } : {}),
  };
}

function normalizeTrainingAttempt(value: unknown): TrainingAttemptRecord | null {
  if (!isRecord(value) || !isSafeId(value.goalId)) return null;
  const completedAt = normalizeTimestamp(value.completedAt);
  const firstTryCorrect = normalizeCounter(value.firstTryCorrect, 100);
  const questionCount = Math.max(firstTryCorrect, normalizeCounter(value.questionCount, 100));
  return {
    id: normalizeRecordId(value.id, "legacy-training", completedAt, [
      value.goalId,
      value.mode,
      value.completedAt,
      value.questionCount,
      value.firstTryCorrect,
      value.retryCount,
      value.hintCount,
      value.passed,
    ]),
    goalId: value.goalId,
    mode: value.mode === "diagnostic" ? "diagnostic" : "practice",
    completedAt,
    questionCount,
    firstTryCorrect,
    retryCount: normalizeCounter(value.retryCount, 1_000),
    hintCount: normalizeCounter(value.hintCount, 1_000),
    passed: value.passed === true,
  };
}

function normalizeStageProgress(value: unknown): GameSyncSnapshot["stageProgress"] {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(STAGE_IDS.map((stageId) => {
    const candidate = isRecord(source[stageId]) ? source[stageId] : {};
    const defaultStatus = stageId === "number-forest" ? "available" : "locked";
    const status = candidate.status === "locked" || candidate.status === "available" || candidate.status === "cleared"
      ? candidate.status
      : defaultStatus;
    const clearedAt = isIsoTimestamp(candidate.clearedAt) ? candidate.clearedAt : undefined;
    return [stageId, {
      stageId,
      status,
      completedQuestIds: normalizeTextList(candidate.completedQuestIds, 60),
      discoveredSecretIds: normalizeTextList(candidate.discoveredSecretIds, 60),
      ...(clearedAt ? { clearedAt } : {}),
    }];
  })) as GameSyncSnapshot["stageProgress"];
}

function normalizeLearningGoalProgress(value: unknown): GameSyncSnapshot["learningGoalProgress"] {
  if (!isRecord(value)) return {};
  const result: GameSyncSnapshot["learningGoalProgress"] = {};
  for (const [goalId, candidate] of Object.entries(value).slice(0, MAX_GOALS)) {
    if (!isSafeId(goalId) || !isRecord(candidate)) continue;
    const firstTryCorrect = normalizeCounter(candidate.firstTryCorrect);
    const status = candidate.status === "in-progress" || candidate.status === "mastered" || candidate.status === "needs-practice"
      ? candidate.status
      : "ready";
    result[goalId] = {
      goalId,
      status,
      attempts: normalizeCounter(candidate.attempts),
      firstTryCorrect,
      questionCount: Math.max(firstTryCorrect, normalizeCounter(candidate.questionCount)),
      retryCount: normalizeCounter(candidate.retryCount),
      hintCount: normalizeCounter(candidate.hintCount),
      updatedAt: normalizeTimestamp(candidate.updatedAt),
    };
  }
  return result;
}

function canonicalLegacyRecordId(id: string) {
  const previousGeneratedId = /^(legacy-(?:adventure|training))-\d+-(\d+)-([0-9a-f]{16})$/.exec(id);
  return previousGeneratedId
    ? `${previousGeneratedId[1]}-${previousGeneratedId[2]}-${previousGeneratedId[3]}`
    : id;
}

function dedupeById<T extends { id: string; completedAt: string }>(items: T[]) {
  const byId = new Map<string, T>();
  for (const source of items) {
    const id = canonicalLegacyRecordId(source.id);
    const item = id === source.id ? source : { ...source, id };
    const current = byId.get(id);
    if (!current || current.completedAt <= item.completedAt) byId.set(id, item);
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
    const firstTryCorrect = Math.max(a?.firstTryCorrect ?? 0, b?.firstTryCorrect ?? 0, eventTotals.firstTryCorrect);
    result[goalId] = {
      goalId,
      status: mastered ? "mastered" : latest?.status ?? baseline?.status ?? "ready",
      attempts: Math.max(a?.attempts ?? 0, b?.attempts ?? 0, eventTotals.attempts),
      firstTryCorrect,
      questionCount: Math.max(firstTryCorrect, a?.questionCount ?? 0, b?.questionCount ?? 0, eventTotals.questionCount),
      retryCount: Math.max(a?.retryCount ?? 0, b?.retryCount ?? 0, eventTotals.retryCount),
      hintCount: Math.max(a?.hintCount ?? 0, b?.hintCount ?? 0, eventTotals.hintCount),
      updatedAt,
    };
  }
  return result;
}

export function mergeGameSyncSnapshots(left: GameSyncSnapshot, right: GameSyncSnapshot): GameSyncSnapshot {
  const previouslyArchived = new Set(
    [...left.archivedAdventureIds, ...right.archivedAdventureIds].map(canonicalLegacyRecordId),
  );
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
  const sourceAdventures = Array.isArray(data.playHistory) ? data.playHistory : [];
  const sourceTraining = Array.isArray(data.trainingHistory) ? data.trainingHistory : [];
  const adventures = dedupeById((sourceAdventures as unknown[])
    .map(normalizeAdventure)
    .filter((record): record is SyncedAdventure => record !== null))
    .slice(-MAX_ADVENTURES);
  const representedCoins = adventures.reduce((sum, item) => sum + item.coins, 0);
  const representedBadges = new Set(adventures.flatMap((item) => item.badges));
  const inventory: Record<string, unknown> = isRecord(data.inventory) ? data.inventory : {};
  const inventoryBadges = normalizeTextList(inventory.badges);
  const trainingAttempts = dedupeById((sourceTraining as unknown[])
    .map(normalizeTrainingAttempt)
    .filter((record): record is TrainingAttemptRecord => record !== null))
    .slice(-MAX_TRAINING_ATTEMPTS);
  const snapshot: GameSyncSnapshot = {
    schemaVersion: GAME_SYNC_SCHEMA_VERSION,
    legacyInventory: {
      coins: Math.max(0, normalizeCounter(inventory.coins, 10_000_000) - representedCoins),
      badges: inventoryBadges.filter((badge) => !representedBadges.has(badge)).slice(0, MAX_LIST_ITEMS),
    },
    archivedAdventureIds: [],
    adventures,
    trainingAttempts,
    stageProgress: normalizeStageProgress(data.stageProgress),
    learningGoalProgress: normalizeLearningGoalProgress(data.learningGoalProgress),
    teamRewards: normalizeTextList(data.teamRewards),
    unlockedTeamSkills: normalizeTextList(data.unlockedTeamSkills),
  };
  const parsed = parseGameSyncSnapshot(snapshot);
  if (!parsed) {
    throw new Error(getGameSyncSnapshotValidationCode(snapshot) ?? "SYNC_NORMALIZATION");
  }
  return parsed;
}

export function applyGameSyncSnapshot(local: StoredGameData, remote: GameSyncSnapshot): StoredGameData {
  const merged = mergeGameSyncSnapshots(createGameSyncSnapshot(local), remote);
  const localById = new Map<string, AdventureRecord>();
  local.playHistory.forEach((record) => {
    const normalized = normalizeAdventure(record);
    if (!normalized) return;
    const id = canonicalLegacyRecordId(normalized.id);
    const current = localById.get(id);
    if (!current || normalizeTimestamp(current.completedAt) <= normalized.completedAt) {
      localById.set(id, record);
    }
  });
  const playHistory: AdventureRecord[] = merged.adventures.map((item) => {
    const localRecord = localById.get(item.id);
    return {
      ...item,
      playerNames: localRecord?.playerNames ?? [local.playerProfile.displayName],
      ...(localRecord?.thought !== undefined ? { thought: localRecord.thought } : {}),
      ...(localRecord?.coopMetrics !== undefined ? { coopMetrics: localRecord.coopMetrics } : {}),
      ...(localRecord?.mapId !== undefined ? { mapId: localRecord.mapId } : {}),
    };
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

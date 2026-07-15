import type { AdventureRecord, CoopObservationRecord, ParentSettings, StageProgress, StoredGameData } from "@/types/progress";
import { normalizeLearningStage } from "@/learning/stages";
import { getWeeklyLearningGoals } from "@/learning/curriculumCatalog";
import type { TrainingAttemptRecord } from "@/types/curriculum";

export const STORAGE_KEY = "minz-learning-game";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? value as T[] : fallback;
}

export const DEFAULT_SETTINGS: ParentSettings = {
  playerName: "민표",
  schoolLevel: "elementary",
  grade: 2,
  level: "foundation",
  advanceRate: 0,
  playMinutes: 10,
  theme: "숫자 숲",
  role: "attack",
  soundVolume: 60,
  shakeIntensity: 1,
  mode: "solo",
  friendName: "친구",
  friendSchoolLevel: "elementary",
  friendGrade: 2,
  friendRole: "magic",
  academicSemester: 2,
  selectedLearningGoalId: "elementary-2-s2-math-w8",
};

export function createDefaultGameData(): StoredGameData {
  return {
    version: 5,
    playerProfile: { displayName: "민표", schoolLevel: "elementary", grade: 2 },
    parentSettings: DEFAULT_SETTINGS,
    battleProgress: { lastPhase: "INTRO" },
    conceptProgress: { "place-value": "발견 중" },
    inventory: { coins: 0, badges: [] },
    rewardHistory: [],
    opinionEntries: [],
    playHistory: [],
    accessibilitySettings: { soundEnabled: true, shakeIntensity: 1 },
    friendProfiles: [],
    localCoopSettings: { enabled: false },
    coopBattleHistory: [],
    teamRewards: [],
    unlockedTeamSkills: [],
    observationRecords: [],
    stageProgress: {
      "number-forest": { stageId: "number-forest", status: "available", completedQuestIds: [], discoveredSecretIds: [] },
      "word-island": { stageId: "word-island", status: "locked", completedQuestIds: [], discoveredSecretIds: [] },
      "story-castle": { stageId: "story-castle", status: "locked", completedQuestIds: [], discoveredSecretIds: [] },
    },
    learningGoalProgress: {},
    trainingHistory: [],
  };
}

export function parseStoredGameData(raw: string | null): StoredGameData {
  if (!raw) return createDefaultGameData();
  try {
    const parsed = JSON.parse(raw) as Partial<Omit<StoredGameData, "version">> & { version?: number };
    if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3 && parsed.version !== 4 && parsed.version !== 5) return createDefaultGameData();
    const defaults = createDefaultGameData();
    const rawSettings = { ...defaults.parentSettings, ...(parsed.parentSettings ?? {}) };
    const playerStage = normalizeLearningStage(rawSettings.schoolLevel, rawSettings.grade);
    const friendStage = normalizeLearningStage(rawSettings.friendSchoolLevel, rawSettings.friendGrade);
    const parentSettings: ParentSettings = {
      ...rawSettings,
      ...playerStage,
      academicSemester: rawSettings.academicSemester === 1 ? 1 : 2,
      selectedLearningGoalId: getWeeklyLearningGoals(playerStage, rawSettings.academicSemester === 1 ? 1 : 2)
        .some((goal) => goal.id === rawSettings.selectedLearningGoalId)
        ? rawSettings.selectedLearningGoalId
        : getWeeklyLearningGoals(playerStage, rawSettings.academicSemester === 1 ? 1 : 2)[0].id,
      friendSchoolLevel: friendStage.schoolLevel,
      friendGrade: friendStage.grade,
    };
    const rawPlayer = { ...defaults.playerProfile, ...(parsed.playerProfile ?? {}) };
    const profileStage = normalizeLearningStage(rawPlayer.schoolLevel, rawPlayer.grade);
    const friendProfiles = safeArray<StoredGameData["friendProfiles"][number]>(parsed.friendProfiles).map((friend) => {
      const stage = normalizeLearningStage(friend.schoolLevel, friend.grade);
      return { ...friend, ...stage };
    });
    const parsedStageProgress: Partial<StoredGameData["stageProgress"]> = parsed.stageProgress ?? {};
    const normalizeStage = (stageId: StageProgress["stageId"]): StageProgress => {
      const candidate = parsedStageProgress[stageId] as unknown;
      const rawStage: Record<string, unknown> = isRecord(candidate) ? candidate : {};
      const status = rawStage.status === "locked" || rawStage.status === "available" || rawStage.status === "cleared"
        ? rawStage.status
        : defaults.stageProgress[stageId].status;
      return {
        stageId,
        status,
        completedQuestIds: safeArray<string>(rawStage.completedQuestIds),
        discoveredSecretIds: safeArray<string>(rawStage.discoveredSecretIds),
        ...(typeof rawStage.clearedAt === "string" ? { clearedAt: rawStage.clearedAt } : {}),
      };
    };
    const inventoryCandidate = parsed.inventory as unknown;
    const rawInventory: Record<string, unknown> = isRecord(inventoryCandidate) ? inventoryCandidate : {};
    const numberForest = normalizeStage("number-forest");
    const storedWordIsland = normalizeStage("word-island");
    const wordIsland = numberForest.status === "cleared" && storedWordIsland.status === "locked"
      ? { ...storedWordIsland, status: "available" as const }
      : storedWordIsland;
    const storedStoryCastle = normalizeStage("story-castle");
    const storyCastle = wordIsland.status === "cleared" && storedStoryCastle.status === "locked"
      ? { ...storedStoryCastle, status: "available" as const }
      : storedStoryCastle;
    return {
      ...defaults,
      ...parsed,
      version: 5,
      parentSettings,
      playerProfile: { ...rawPlayer, ...profileStage },
      friendProfiles,
      inventory: {
        coins: typeof rawInventory.coins === "number" && Number.isFinite(rawInventory.coins) ? Math.max(0, rawInventory.coins) : defaults.inventory.coins,
        badges: safeArray<string>(rawInventory.badges),
      },
      conceptProgress: isRecord(parsed.conceptProgress) ? parsed.conceptProgress as StoredGameData["conceptProgress"] : defaults.conceptProgress,
      rewardHistory: safeArray<AdventureRecord>(parsed.rewardHistory),
      opinionEntries: safeArray<StoredGameData["opinionEntries"][number]>(parsed.opinionEntries),
      playHistory: safeArray<AdventureRecord>(parsed.playHistory),
      coopBattleHistory: safeArray<AdventureRecord>(parsed.coopBattleHistory),
      teamRewards: safeArray<string>(parsed.teamRewards),
      unlockedTeamSkills: safeArray<string>(parsed.unlockedTeamSkills),
      observationRecords: safeArray<CoopObservationRecord>(parsed.observationRecords),
      stageProgress: {
        "number-forest": numberForest,
        "word-island": wordIsland,
        "story-castle": storyCastle,
      },
      learningGoalProgress: isRecord(parsed.learningGoalProgress)
        ? parsed.learningGoalProgress as StoredGameData["learningGoalProgress"]
        : defaults.learningGoalProgress,
      trainingHistory: Array.isArray(parsed.trainingHistory) ? parsed.trainingHistory : defaults.trainingHistory,
    };
  } catch {
    return createDefaultGameData();
  }
}

export function readGameData(): StoredGameData {
  if (typeof window === "undefined") return createDefaultGameData();
  return parseStoredGameData(window.localStorage.getItem(STORAGE_KEY));
}

export function writeGameData(data: StoredGameData) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveSettings(settings: ParentSettings): StoredGameData {
  const current = readGameData();
  const playerStage = normalizeLearningStage(settings.schoolLevel, settings.grade);
  const friendStage = normalizeLearningStage(settings.friendSchoolLevel, settings.friendGrade);
  const goals = getWeeklyLearningGoals(playerStage, settings.academicSemester);
  const selectedLearningGoalId = goals.some((goal) => goal.id === settings.selectedLearningGoalId)
    ? settings.selectedLearningGoalId
    : goals[0].id;
  const normalizedSettings = {
    ...settings,
    ...playerStage,
    friendSchoolLevel: friendStage.schoolLevel,
    friendGrade: friendStage.grade,
    selectedLearningGoalId,
  };
  const friendProfiles = normalizedSettings.mode === "local-shared-screen"
    ? [{ id: "friend-local", displayName: normalizedSettings.friendName, schoolLevel: normalizedSettings.friendSchoolLevel, grade: normalizedSettings.friendGrade, role: normalizedSettings.friendRole }]
    : current.friendProfiles;
  const next: StoredGameData = {
    ...current,
    version: 5,
    playerProfile: { displayName: normalizedSettings.playerName, schoolLevel: normalizedSettings.schoolLevel, grade: normalizedSettings.grade },
    parentSettings: normalizedSettings,
    friendProfiles,
    localCoopSettings: { enabled: normalizedSettings.mode === "local-shared-screen" },
    accessibilitySettings: {
      soundEnabled: normalizedSettings.soundVolume > 0,
      shakeIntensity: normalizedSettings.shakeIntensity,
    },
  };
  writeGameData(next);
  return next;
}

export function saveAdventure(record: AdventureRecord): StoredGameData {
  const current = readGameData();
  const isCoop = record.mode === "local-shared-screen";
  const stageId = record.stageId ?? "number-forest";
  const nextStage = stageId === "number-forest" ? "word-island" : stageId === "word-island" ? "story-castle" : null;
  const stageProgress = {
    ...current.stageProgress,
    [stageId]: {
      ...current.stageProgress[stageId],
      status: "cleared" as const,
      completedQuestIds: Array.from(new Set([...(current.stageProgress[stageId]?.completedQuestIds ?? []), ...(record.completedQuestIds ?? [])])),
      discoveredSecretIds: Array.from(new Set([...(current.stageProgress[stageId]?.discoveredSecretIds ?? []), ...(record.discoveredSecretIds ?? [])])),
      clearedAt: record.completedAt,
    },
    ...(nextStage && current.stageProgress[nextStage].status === "locked" ? { [nextStage]: { ...current.stageProgress[nextStage], status: "available" as const } } : {}),
  };
  const previousGoal = record.learningGoalId ? current.learningGoalProgress[record.learningGoalId] : undefined;
  const completedGoal = record.learningGoalId
    ? getWeeklyLearningGoals(current.playerProfile, current.parentSettings.academicSemester).find((goal) => goal.id === record.learningGoalId)
    : undefined;
  const learningGoalProgress = record.learningGoalId ? {
    ...current.learningGoalProgress,
    [record.learningGoalId]: {
      goalId: record.learningGoalId,
      status: previousGoal?.status === "mastered" ? "mastered" as const : "in-progress" as const,
      attempts: (previousGoal?.attempts ?? 0) + 1,
      firstTryCorrect: (previousGoal?.firstTryCorrect ?? 0) + (record.firstTryCorrect ?? Math.max(0, record.completedMissions - record.retryCount)),
      questionCount: (previousGoal?.questionCount ?? 0) + Math.max(1, record.completedMissions),
      retryCount: (previousGoal?.retryCount ?? 0) + record.retryCount,
      hintCount: (previousGoal?.hintCount ?? 0) + record.hintCount,
      updatedAt: record.completedAt,
    },
  } : current.learningGoalProgress;
  const next: StoredGameData = {
    ...current,
    battleProgress: { lastPhase: "RESULT", lastPlayedAt: record.completedAt },
    conceptProgress: completedGoal ? {
      ...current.conceptProgress,
      [completedGoal.skillTag]: current.conceptProgress[completedGoal.skillTag] === "자유롭게 사용" ? "자유롭게 사용" : "익히는 중",
    } : current.conceptProgress,
    inventory: {
      coins: current.inventory.coins + record.coins,
      badges: Array.from(new Set([...current.inventory.badges, ...record.badges])),
    },
    rewardHistory: [...current.rewardHistory, record],
    playHistory: [...current.playHistory, record],
    coopBattleHistory: isCoop ? [...current.coopBattleHistory, record] : current.coopBattleHistory,
    teamRewards: Array.from(new Set([...current.teamRewards, ...record.teamRewards])),
    unlockedTeamSkills: isCoop
      ? Array.from(new Set([...current.unlockedTeamSkills, record.specialSkill]))
      : current.unlockedTeamSkills,
    stageProgress,
    learningGoalProgress,
  };
  writeGameData(next);
  return next;
}

export function saveThought(recordId: string, text: string): StoredGameData {
  const current = readGameData();
  const createdAt = new Date().toISOString();
  const updateRecord = (record: AdventureRecord) => record.id === recordId ? { ...record, thought: text } : record;
  const next = {
    ...current,
    opinionEntries: [...current.opinionEntries, { id: recordId, text, createdAt }],
    rewardHistory: current.rewardHistory.map(updateRecord),
    playHistory: current.playHistory.map(updateRecord),
    coopBattleHistory: current.coopBattleHistory.map(updateRecord),
  };
  writeGameData(next);
  return next;
}

export function saveObservation(record: CoopObservationRecord): StoredGameData {
  const current = readGameData();
  const next = {
    ...current,
    observationRecords: [
      ...current.observationRecords.filter((item) => item.adventureId !== record.adventureId),
      record,
    ],
  };
  writeGameData(next);
  return next;
}

export function selectLearningGoal(goalId: string): StoredGameData {
  const current = readGameData();
  const goal = getWeeklyLearningGoals(current.playerProfile, current.parentSettings.academicSemester)
    .find((candidate) => candidate.id === goalId);
  if (!goal) return current;
  const now = new Date().toISOString();
  const existing = current.learningGoalProgress[goalId];
  const route: StageProgress["stageId"][] = ["number-forest", "word-island", "story-castle"];
  const selectedStageIndex = route.indexOf(goal.stageId);
  const stageProgress = Object.fromEntries(route.map((stageId, index) => {
    const progress = current.stageProgress[stageId];
    return [stageId, index <= selectedStageIndex && progress.status === "locked"
      ? { ...progress, status: "available" as const }
      : progress];
  })) as StoredGameData["stageProgress"];
  const next: StoredGameData = {
    ...current,
    parentSettings: { ...current.parentSettings, selectedLearningGoalId: goalId },
    conceptProgress: {
      ...current.conceptProgress,
      [goal.skillTag]: current.conceptProgress[goal.skillTag] ?? "발견 중",
    },
    stageProgress,
    learningGoalProgress: {
      ...current.learningGoalProgress,
      [goalId]: existing ?? { goalId, status: "ready", attempts: 0, firstTryCorrect: 0, questionCount: 0, retryCount: 0, hintCount: 0, updatedAt: now },
    },
  };
  writeGameData(next);
  return next;
}

export function saveTrainingAttempt(record: TrainingAttemptRecord): StoredGameData {
  const current = readGameData();
  const goal = getWeeklyLearningGoals(current.playerProfile, current.parentSettings.academicSemester)
    .find((candidate) => candidate.id === record.goalId);
  if (!goal) return current;
  const previous = current.learningGoalProgress[record.goalId];
  const totals = {
    attempts: (previous?.attempts ?? 0) + 1,
    firstTryCorrect: (previous?.firstTryCorrect ?? 0) + record.firstTryCorrect,
    questionCount: (previous?.questionCount ?? 0) + record.questionCount,
    retryCount: (previous?.retryCount ?? 0) + record.retryCount,
    hintCount: (previous?.hintCount ?? 0) + record.hintCount,
  };
  const next: StoredGameData = {
    ...current,
    conceptProgress: {
      ...current.conceptProgress,
      [goal.skillTag]: previous?.status === "mastered" || (record.mode === "diagnostic" && record.passed)
        ? "자유롭게 사용"
        : record.passed
          ? "익히는 중"
          : current.conceptProgress[goal.skillTag] ?? "발견 중",
    },
    learningGoalProgress: {
      ...current.learningGoalProgress,
      [record.goalId]: {
        goalId: record.goalId,
        status: previous?.status === "mastered"
          ? "mastered"
          : record.mode === "diagnostic" && record.passed
            ? "mastered"
            : record.passed
              ? "in-progress"
              : "needs-practice",
        ...totals,
        updatedAt: record.completedAt,
      },
    },
    trainingHistory: [...current.trainingHistory, record],
  };
  writeGameData(next);
  return next;
}

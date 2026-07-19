import type { AdventureRecord, CoopObservationRecord, LearningSessionReport, ParentSettings, StageProgress, StoredGameData } from "@/types/progress";
import { normalizeLearningStage } from "@/learning/stages";
import { getWeeklyLearningGoals } from "@/learning/curriculumCatalog";
import type { TrainingAttemptRecord } from "@/types/curriculum";
import { GAME_DATA_CHANGED_EVENT } from "@/services/online/gameStateSync";
import { SHOP_ITEMS, getCharacter, getSkill, getUpgradeCost, isSkillCompatible, isWeaponCompatible, normalizeUpgradeLevel } from "@/types/loadout";
import type { EquipmentId, SkillId, UpgradeableItemId, UpgradeLevel } from "@/types/loadout";

export const STORAGE_KEY = "minz-learning-game";
export const ACTIVE_CHILD_PROFILE_KEY = "minz-active-child-profile";
export const ACTIVE_CHILD_CHANGED_EVENT = "minz:active-child-changed";
export const SESSION_REPORT_READY_EVENT = "minz:session-report-ready";
export const SESSION_REPORT_DELIVERY_EVENT = "minz:session-report-delivery";
export const PRIMARY_CHILD_PROFILE_ID = "primary";
const CHILD_PROFILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidChildProfileId(value: unknown): value is string {
  return typeof value === "string" && CHILD_PROFILE_ID_PATTERN.test(value);
}

export function getActiveChildProfileId() {
  if (typeof window === "undefined") return PRIMARY_CHILD_PROFILE_ID;
  const stored = window.localStorage.getItem(ACTIVE_CHILD_PROFILE_KEY);
  return isValidChildProfileId(stored) ? stored : PRIMARY_CHILD_PROFILE_ID;
}

export function getChildStorageKey(childProfileId = getActiveChildProfileId()) {
  return childProfileId === PRIMARY_CHILD_PROFILE_ID
    ? STORAGE_KEY
    : `${STORAGE_KEY}:${childProfileId}`;
}

export function hasActiveChildGameData() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(getChildStorageKey()) !== null;
}

export function activateChildProfile(
  child: { id: string; displayName: string; schoolLevel: StoredGameData["playerProfile"]["schoolLevel"]; grade: number; characterId?: string },
) {
  if (typeof window === "undefined" || !isValidChildProfileId(child.id)) return false;
  window.localStorage.setItem(ACTIVE_CHILD_PROFILE_KEY, child.id);
  const storageKey = getChildStorageKey(child.id);
  if (window.localStorage.getItem(storageKey) === null) {
    const initial = createDefaultGameData();
    const character = getCharacter(child.characterId);
    initial.playerProfile = {
      displayName: child.displayName,
      schoolLevel: child.schoolLevel,
      grade: child.grade,
      characterId: character.id,
    };
    initial.parentSettings = {
      ...initial.parentSettings,
      playerName: child.displayName,
      schoolLevel: child.schoolLevel,
      grade: child.grade,
      characterId: character.id,
      selectedSkillId: character.defaultSkillId,
    };
    initial.inventory.ownedItemIds = Array.from(new Set([...initial.inventory.ownedItemIds, character.defaultSkillId]));
    initial.inventory.unlockedSkillIds = Array.from(new Set([...initial.inventory.unlockedSkillIds, character.defaultSkillId]));
    initial.inventory.ownedItemIds = Array.from(new Set([...initial.inventory.ownedItemIds, character.defaultWeaponId]));
    initial.inventory.equippedWeaponId = character.defaultWeaponId;
    initial.inventory.upgradeLevels[character.defaultSkillId] = 1;
    initial.inventory.upgradeLevels[character.defaultWeaponId] = 1;
    window.localStorage.setItem(storageKey, JSON.stringify(initial));
  }
  window.dispatchEvent(new Event(ACTIVE_CHILD_CHANGED_EVENT));
  return true;
}

export function removeChildProfileData(
  childProfileId: string,
  fallback?: { id: string; displayName: string; schoolLevel: StoredGameData["playerProfile"]["schoolLevel"]; grade: number },
) {
  if (typeof window === "undefined" || !isValidChildProfileId(childProfileId) || childProfileId === PRIMARY_CHILD_PROFILE_ID) {
    return false;
  }
  window.localStorage.removeItem(getChildStorageKey(childProfileId));
  if (getActiveChildProfileId() !== childProfileId) return true;
  if (fallback) return activateChildProfile(fallback);
  window.localStorage.removeItem(ACTIVE_CHILD_PROFILE_KEY);
  window.dispatchEvent(new Event(ACTIVE_CHILD_CHANGED_EVENT));
  return true;
}

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
  characterId: "thunder-sword",
  selectedSkillId: "thunder-strike",
};

export function createDefaultGameData(): StoredGameData {
  return {
    version: 7,
    playerProfile: { displayName: "민표", schoolLevel: "elementary", grade: 2, characterId: "thunder-sword" },
    parentSettings: DEFAULT_SETTINGS,
    battleProgress: { lastPhase: "INTRO" },
    conceptProgress: { "place-value": "발견 중" },
    inventory: {
      coins: 0,
      badges: [],
      ownedItemIds: ["training-sword", "thunder-strike"],
      equippedWeaponId: "training-sword",
      unlockedSkillIds: ["thunder-strike"],
      upgradeLevels: { "training-sword": 1, "thunder-strike": 1 },
    },
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
    sessionReports: [],
  };
}

export function parseStoredGameData(raw: string | null): StoredGameData {
  if (!raw) return createDefaultGameData();
  try {
    const parsed = JSON.parse(raw) as Partial<Omit<StoredGameData, "version">> & { version?: number };
    if (![1, 2, 3, 4, 5, 6, 7].includes(parsed.version ?? 0)) return createDefaultGameData();
    const defaults = createDefaultGameData();
    const rawSettings = { ...defaults.parentSettings, ...(parsed.parentSettings ?? {}) };
    const playerStage = normalizeLearningStage(rawSettings.schoolLevel, rawSettings.grade);
    const friendStage = normalizeLearningStage(rawSettings.friendSchoolLevel, rawSettings.friendGrade);
    const character = getCharacter(rawSettings.characterId);
    const selectedSkill = getSkill(rawSettings.selectedSkillId);
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
      characterId: character.id,
      selectedSkillId: isSkillCompatible(character.id, selectedSkill.id as SkillId)
        ? selectedSkill.id as SkillId
        : character.defaultSkillId,
    };
    const starterSkillId = getCharacter(parentSettings.characterId).defaultSkillId;
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
    const starterWeaponId = character.defaultWeaponId;
    const ownedItemIds = Array.from(new Set([
      ...safeArray<EquipmentId | SkillId>(rawInventory.ownedItemIds, defaults.inventory.ownedItemIds)
        .filter((id) => SHOP_ITEMS.some((item) => item.id === id)),
      starterSkillId,
      starterWeaponId,
    ]));
    const rawUpgradeLevels = isRecord(rawInventory.upgradeLevels) ? rawInventory.upgradeLevels : {};
    const upgradeLevels = Object.fromEntries(
      ownedItemIds.map((itemId) => [itemId, normalizeUpgradeLevel(rawUpgradeLevels[itemId])]),
    ) as Partial<Record<UpgradeableItemId, UpgradeLevel>>;
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
      version: 7,
      parentSettings,
      playerProfile: { ...rawPlayer, ...profileStage, characterId: getCharacter(rawPlayer.characterId).id },
      friendProfiles,
      inventory: {
        coins: typeof rawInventory.coins === "number" && Number.isFinite(rawInventory.coins) ? Math.max(0, rawInventory.coins) : defaults.inventory.coins,
        badges: safeArray<string>(rawInventory.badges),
        ownedItemIds,
        equippedWeaponId: SHOP_ITEMS.some((item) => item.type === "weapon" && item.id === rawInventory.equippedWeaponId)
          && isWeaponCompatible(parentSettings.characterId, rawInventory.equippedWeaponId as EquipmentId)
          ? rawInventory.equippedWeaponId as EquipmentId
          : starterWeaponId,
        ...(SHOP_ITEMS.some((item) => item.type === "armor" && item.id === rawInventory.equippedArmorId)
          ? { equippedArmorId: rawInventory.equippedArmorId as EquipmentId }
          : {}),
        unlockedSkillIds: Array.from(new Set([...safeArray<SkillId>(rawInventory.unlockedSkillIds, defaults.inventory.unlockedSkillIds)
          .filter((id) => SHOP_ITEMS.some((item) => item.type === "skill" && item.id === id)), starterSkillId])),
        upgradeLevels,
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
      sessionReports: safeArray<LearningSessionReport>(parsed.sessionReports).slice(-100),
    };
  } catch {
    return createDefaultGameData();
  }
}

export function readGameData(childProfileId = getActiveChildProfileId()): StoredGameData {
  if (typeof window === "undefined") return createDefaultGameData();
  return parseStoredGameData(window.localStorage.getItem(getChildStorageKey(childProfileId)));
}

export function writeGameData(data: StoredGameData, notifySync = true, childProfileId = getActiveChildProfileId()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getChildStorageKey(childProfileId), JSON.stringify(data));
  if (notifySync) window.dispatchEvent(new Event(GAME_DATA_CHANGED_EVENT));
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
  const selectedCharacter = getCharacter(normalizedSettings.characterId);
  const compatibleSettings = {
    ...normalizedSettings,
    selectedSkillId: isSkillCompatible(selectedCharacter.id, normalizedSettings.selectedSkillId)
      ? normalizedSettings.selectedSkillId
      : selectedCharacter.defaultSkillId,
  };
  const friendProfiles = compatibleSettings.mode === "local-shared-screen"
    ? [{ id: "friend-local", displayName: compatibleSettings.friendName, schoolLevel: compatibleSettings.friendSchoolLevel, grade: compatibleSettings.friendGrade, role: compatibleSettings.friendRole }]
    : current.friendProfiles;
  const next: StoredGameData = {
    ...current,
    version: 7,
    playerProfile: { displayName: compatibleSettings.playerName, schoolLevel: compatibleSettings.schoolLevel, grade: compatibleSettings.grade, characterId: compatibleSettings.characterId },
    parentSettings: compatibleSettings,
    inventory: {
      ...current.inventory,
      ownedItemIds: Array.from(new Set([...current.inventory.ownedItemIds, selectedCharacter.defaultSkillId, selectedCharacter.defaultWeaponId])),
      unlockedSkillIds: Array.from(new Set([...current.inventory.unlockedSkillIds, selectedCharacter.defaultSkillId])),
      equippedWeaponId: isWeaponCompatible(selectedCharacter.id, current.inventory.equippedWeaponId)
        ? current.inventory.equippedWeaponId
        : selectedCharacter.defaultWeaponId,
      upgradeLevels: {
        ...current.inventory.upgradeLevels,
        [selectedCharacter.defaultSkillId]: current.inventory.upgradeLevels[selectedCharacter.defaultSkillId] ?? 1,
        [selectedCharacter.defaultWeaponId]: current.inventory.upgradeLevels[selectedCharacter.defaultWeaponId] ?? 1,
      },
    },
    friendProfiles,
    localCoopSettings: { enabled: compatibleSettings.mode === "local-shared-screen" },
    accessibilitySettings: {
      soundEnabled: compatibleSettings.soundVolume > 0,
      shakeIntensity: compatibleSettings.shakeIntensity,
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
  const firstTryCorrect = record.firstTryCorrect ?? Math.max(0, record.completedMissions - record.retryCount);
  const questionCount = Math.max(1, record.completedMissions, firstTryCorrect);
  const cumulativeFirstTryCorrect = (previousGoal?.firstTryCorrect ?? 0) + firstTryCorrect;
  const cumulativeQuestionCount = (previousGoal?.questionCount ?? 0) + questionCount;
  const learningGoalProgress = record.learningGoalId ? {
    ...current.learningGoalProgress,
    [record.learningGoalId]: {
      goalId: record.learningGoalId,
      status: previousGoal?.status === "mastered" ? "mastered" as const : "in-progress" as const,
      attempts: (previousGoal?.attempts ?? 0) + 1,
      firstTryCorrect: cumulativeFirstTryCorrect,
      questionCount: Math.max(cumulativeQuestionCount, cumulativeFirstTryCorrect),
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
      ...current.inventory,
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

export function saveSessionReport(report: LearningSessionReport): StoredGameData {
  const current = readGameData();
  const next = {
    ...current,
    sessionReports: [...current.sessionReports.filter((item) => item.id !== report.id), report].slice(-100),
  };
  writeGameData(next, false);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_REPORT_READY_EVENT));
  return next;
}

export function updateSessionReportDelivery(
  reportId: string,
  deliveryStatus: LearningSessionReport["deliveryStatus"],
  deliveredAt?: string,
): StoredGameData {
  const current = readGameData();
  const next = {
    ...current,
    sessionReports: current.sessionReports.map((report) => report.id === reportId
      ? { ...report, deliveryStatus, ...(deliveredAt ? { deliveredAt } : {}) }
      : report),
  };
  writeGameData(next, false);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_REPORT_DELIVERY_EVENT));
  return next;
}

export function purchaseShopItem(itemId: string): { ok: boolean; message: string; data: StoredGameData } {
  const current = readGameData();
  const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId);
  if (!item) return { ok: false, message: "상점 물품을 찾지 못했습니다.", data: current };
  if (current.inventory.ownedItemIds.includes(item.id)) return { ok: false, message: "이미 가진 물품입니다.", data: current };
  if (current.inventory.coins < item.cost) return { ok: false, message: `모험 코인이 ${item.cost - current.inventory.coins}개 더 필요합니다.`, data: current };
  const next: StoredGameData = {
    ...current,
    inventory: {
      ...current.inventory,
      coins: current.inventory.coins - item.cost,
      ownedItemIds: [...current.inventory.ownedItemIds, item.id],
      unlockedSkillIds: item.type === "skill"
        ? Array.from(new Set([...current.inventory.unlockedSkillIds, item.id as SkillId]))
        : current.inventory.unlockedSkillIds,
      upgradeLevels: { ...current.inventory.upgradeLevels, [item.id]: 1 },
    },
  };
  writeGameData(next);
  return { ok: true, message: `${item.name} 획득! 인벤토리에서 장착할 수 있어요.`, data: next };
}

export function equipItem(itemId: string): StoredGameData {
  const current = readGameData();
  const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId);
  if (!item || item.type === "skill" || !current.inventory.ownedItemIds.includes(item.id)) return current;
  if (item.type === "weapon" && !isWeaponCompatible(current.playerProfile.characterId, item.id as EquipmentId)) return current;
  const next: StoredGameData = {
    ...current,
    inventory: {
      ...current.inventory,
      ...(item.type === "weapon" ? { equippedWeaponId: item.id as EquipmentId } : { equippedArmorId: item.id as EquipmentId }),
    },
  };
  writeGameData(next);
  return next;
}

export function upgradeOwnedItem(itemId: string): { ok: boolean; message: string; data: StoredGameData } {
  const current = readGameData();
  const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId);
  if (!item || !current.inventory.ownedItemIds.includes(item.id)) {
    return { ok: false, message: "먼저 상점에서 장비나 스킬을 획득해 주세요.", data: current };
  }
  const currentLevel = normalizeUpgradeLevel(current.inventory.upgradeLevels[item.id]);
  const cost = getUpgradeCost(item.id, currentLevel);
  if (cost === null) return { ok: false, message: `${item.name}은 이미 최고 레벨입니다.`, data: current };
  if (current.inventory.coins < cost) {
    return { ok: false, message: `강화하려면 모험 코인이 ${cost - current.inventory.coins}개 더 필요합니다.`, data: current };
  }
  const nextLevel = (currentLevel + 1) as UpgradeLevel;
  const next: StoredGameData = {
    ...current,
    inventory: {
      ...current.inventory,
      coins: current.inventory.coins - cost,
      upgradeLevels: { ...current.inventory.upgradeLevels, [item.id]: nextLevel },
    },
  };
  writeGameData(next);
  return { ok: true, message: `${item.name} 강화 성공! Lv.${nextLevel}이 되었습니다.`, data: next };
}

export function selectBattleSkill(skillId: string): StoredGameData {
  const current = readGameData();
  if (!current.inventory.unlockedSkillIds.includes(skillId as SkillId)
    || !isSkillCompatible(current.playerProfile.characterId, skillId as SkillId)) return current;
  const next: StoredGameData = {
    ...current,
    parentSettings: { ...current.parentSettings, selectedSkillId: skillId as SkillId },
  };
  writeGameData(next);
  return next;
}

export function selectCharacter(characterId: string): StoredGameData {
  const current = readGameData();
  const character = getCharacter(characterId);
  const unlockedSkillIds = Array.from(new Set([...current.inventory.unlockedSkillIds, character.defaultSkillId]));
  const ownedItemIds = Array.from(new Set([...current.inventory.ownedItemIds, character.defaultSkillId, character.defaultWeaponId]));
  const next: StoredGameData = {
    ...current,
    playerProfile: { ...current.playerProfile, characterId: character.id },
    parentSettings: { ...current.parentSettings, characterId: character.id, selectedSkillId: character.defaultSkillId },
    inventory: {
      ...current.inventory,
      unlockedSkillIds,
      ownedItemIds,
      equippedWeaponId: character.defaultWeaponId,
      upgradeLevels: {
        ...current.inventory.upgradeLevels,
        [character.defaultSkillId]: current.inventory.upgradeLevels[character.defaultSkillId] ?? 1,
        [character.defaultWeaponId]: current.inventory.upgradeLevels[character.defaultWeaponId] ?? 1,
      },
    },
  };
  writeGameData(next);
  return next;
}

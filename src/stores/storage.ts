import type { AdventureRecord, CoopObservationRecord, ParentSettings, StoredGameData } from "@/types/progress";

export const STORAGE_KEY = "minz-learning-game";

export const DEFAULT_SETTINGS: ParentSettings = {
  playerName: "민표",
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
  friendGrade: 3,
  friendRole: "magic",
};

export function createDefaultGameData(): StoredGameData {
  return {
    version: 2,
    playerProfile: { displayName: "민표", grade: 2 },
    parentSettings: DEFAULT_SETTINGS,
    battleProgress: { lastPhase: "INTRO" },
    conceptProgress: { "make-ten": "발견 중", "carrying-addition": "발견 중" },
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
  };
}

export function parseStoredGameData(raw: string | null): StoredGameData {
  if (!raw) return createDefaultGameData();
  try {
    const parsed = JSON.parse(raw) as Partial<Omit<StoredGameData, "version">> & { version?: number };
    if (parsed.version !== 1 && parsed.version !== 2) return createDefaultGameData();
    return { ...createDefaultGameData(), ...parsed, version: 2 };
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
  const friendProfiles = settings.mode === "local-shared-screen"
    ? [{ id: "friend-local", displayName: settings.friendName, grade: settings.friendGrade, role: settings.friendRole }]
    : current.friendProfiles;
  const next: StoredGameData = {
    ...current,
    playerProfile: { displayName: settings.playerName, grade: settings.grade },
    parentSettings: settings,
    friendProfiles,
    localCoopSettings: { enabled: settings.mode === "local-shared-screen" },
    accessibilitySettings: {
      soundEnabled: settings.soundVolume > 0,
      shakeIntensity: settings.shakeIntensity,
    },
  };
  writeGameData(next);
  return next;
}

export function saveAdventure(record: AdventureRecord): StoredGameData {
  const current = readGameData();
  const isCoop = record.mode === "local-shared-screen";
  const next: StoredGameData = {
    ...current,
    battleProgress: { lastPhase: "RESULT", lastPlayedAt: record.completedAt },
    conceptProgress: { ...current.conceptProgress, "make-ten": "익히는 중", "carrying-addition": "익히는 중" },
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

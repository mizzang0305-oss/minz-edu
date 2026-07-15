import { isValidLearningStage } from "@/learning/stages";
import type { SchoolLevel } from "@/types/learning";

type ChildProfileSource = {
  displayName: string;
  schoolLevel: SchoolLevel;
  grade: number;
};

export type ChildProfileSyncRequest = {
  displayName: string;
  schoolLevel: SchoolLevel;
  grade: number;
  characterId: string;
  csrfToken: string;
};

export type ParsedChildProfileSync = Omit<ChildProfileSyncRequest, "csrfToken">;

const CHARACTER_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRIEND_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createChildProfileSyncRequest(
  profile: ChildProfileSource,
  csrfToken: string,
  characterId = "thunder-sword",
): ChildProfileSyncRequest {
  return {
    displayName: profile.displayName,
    schoolLevel: profile.schoolLevel,
    grade: profile.grade,
    characterId,
    csrfToken,
  };
}

export function readChildProfileCsrfToken(value: unknown): unknown {
  return isRecord(value) ? value.csrfToken : undefined;
}

export function parseChildProfileSyncRequest(value: unknown): ParsedChildProfileSync | null {
  if (!isRecord(value)) return null;

  const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";
  const characterId = typeof value.characterId === "string" ? value.characterId.trim() : "";
  const csrfToken = typeof value.csrfToken === "string" ? value.csrfToken : "";
  if (
    displayName.length < 1 ||
    displayName.length > 20 ||
    CONTROL_CHARACTER_PATTERN.test(displayName) ||
    !isValidLearningStage(value.schoolLevel, value.grade) ||
    characterId.length < 1 ||
    characterId.length > 40 ||
    !CHARACTER_ID_PATTERN.test(characterId) ||
    csrfToken.length < 1
  ) {
    return null;
  }

  return {
    displayName,
    schoolLevel: value.schoolLevel,
    grade: Number(value.grade),
    characterId,
  };
}

export function readSafeChildRoomIdentity(value: unknown) {
  if (!isRecord(value)) return null;
  const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";
  const characterId = typeof value.characterId === "string" ? value.characterId.trim() : "";
  if (
    displayName.length < 1 ||
    displayName.length > 20 ||
    CONTROL_CHARACTER_PATTERN.test(displayName) ||
    !isValidLearningStage(value.schoolLevel, value.grade) ||
    characterId.length < 1 ||
    characterId.length > 40 ||
    !CHARACTER_ID_PATTERN.test(characterId)
  ) {
    return null;
  }
  return { displayName, characterId };
}

export function readSafeStoredFriendCode(value: unknown) {
  return typeof value === "string" && FRIEND_CODE_PATTERN.test(value) ? value : null;
}

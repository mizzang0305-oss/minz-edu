import { isValidLearningStage } from "@/learning/stages";
import type { SchoolLevel } from "@/types/learning";

type ChildProfileSource = {
  displayName: string;
  schoolLevel: SchoolLevel;
  grade: number;
};

export type ChildProfileSyncRequest = {
  childProfileId?: string;
  createNew?: boolean;
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
const CHILD_PROFILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createChildProfileSyncRequest(
  profile: ChildProfileSource,
  csrfToken: string,
  characterId = "thunder-sword",
  childProfileId?: string,
): ChildProfileSyncRequest {
  return {
    ...(childProfileId ? { childProfileId } : {}),
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
  const childProfileId = value.childProfileId;
  const createNew = value.createNew === true;
  if (
    displayName.length < 1 ||
    displayName.length > 20 ||
    CONTROL_CHARACTER_PATTERN.test(displayName) ||
    !isValidLearningStage(value.schoolLevel, value.grade) ||
    characterId.length < 1 ||
    characterId.length > 40 ||
    !CHARACTER_ID_PATTERN.test(characterId) ||
    csrfToken.length < 1 ||
    (childProfileId !== undefined && !isValidChildProfileId(childProfileId)) ||
    (createNew && childProfileId !== undefined)
  ) {
    return null;
  }

  return {
    ...(typeof childProfileId === "string" ? { childProfileId } : {}),
    ...(createNew ? { createNew: true } : {}),
    displayName,
    schoolLevel: value.schoolLevel,
    grade: Number(value.grade),
    characterId,
  };
}

export function isValidChildProfileId(value: unknown): value is string {
  return typeof value === "string" && CHILD_PROFILE_ID_PATTERN.test(value);
}

export type SafeChildProfile = {
  id: string;
  displayName: string;
  schoolLevel: SchoolLevel;
  grade: number;
  characterId: string;
  friendCode: string;
};

export function readSafeStoredChildProfile(id: unknown, value: unknown): SafeChildProfile | null {
  if (!isValidChildProfileId(id) || !isRecord(value)) return null;
  const identity = readSafeChildRoomIdentity(value);
  const friendCode = readSafeStoredFriendCode(value.friendCode);
  if (!identity || !friendCode) return null;
  return {
    id,
    displayName: identity.displayName,
    schoolLevel: value.schoolLevel as SchoolLevel,
    grade: Number(value.grade),
    characterId: identity.characterId,
    friendCode,
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

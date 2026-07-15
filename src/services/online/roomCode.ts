const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidRoomCode(value: string) {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(value));
}

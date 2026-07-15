const WINDOW_MS = 60_000;
const MAX_MUTATIONS_PER_WINDOW = 12;
const MAX_PROFILE_MUTATIONS_PER_WINDOW = 6;
const MAX_AUTH_MUTATIONS_PER_WINDOW = 6;
const MAX_GAME_STATE_MUTATIONS_PER_WINDOW = 20;
const MAX_BUCKETS = 10_000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function removeExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function allowMutation(
  scope: "room" | "profile" | "auth" | "game-state",
  guardianUid: string,
  maxMutations: number,
  now: number,
) {
  removeExpiredBuckets(now);
  const key = `${scope}:${guardianUid}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (!bucket && buckets.size >= MAX_BUCKETS) return false;
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= maxMutations) return false;
  bucket.count += 1;
  return true;
}

export function allowRoomMutation(guardianUid: string, now = Date.now()) {
  return allowMutation("room", guardianUid, MAX_MUTATIONS_PER_WINDOW, now);
}

export function allowChildProfileMutation(guardianUid: string, now = Date.now()) {
  return allowMutation("profile", guardianUid, MAX_PROFILE_MUTATIONS_PER_WINDOW, now);
}

export function allowGuardianAuthMutation(guardianUid: string, now = Date.now()) {
  return allowMutation("auth", guardianUid, MAX_AUTH_MUTATIONS_PER_WINDOW, now);
}

export function allowGameStateMutation(guardianUid: string, now = Date.now()) {
  return allowMutation("game-state", guardianUid, MAX_GAME_STATE_MUTATIONS_PER_WINDOW, now);
}

export function resetOnlineMutationRateLimitsForTests() {
  buckets.clear();
}

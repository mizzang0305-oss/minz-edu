export const SESSION_COOKIE = "minz_guardian_session";
export const CSRF_COOKIE = "minz_csrf";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
export const RECENT_SIGN_IN_SECONDS = 60 * 5;

export function isValidCsrfPair(cookieToken: string | undefined, bodyToken: unknown) {
  if (!cookieToken || typeof bodyToken !== "string") return false;
  if (cookieToken.length < 32 || bodyToken.length !== cookieToken.length) return false;

  let difference = 0;
  for (let index = 0; index < cookieToken.length; index += 1) {
    difference |= cookieToken.charCodeAt(index) ^ bodyToken.charCodeAt(index);
  }
  return difference === 0;
}

export function isRecentSignIn(authTime: unknown, nowSeconds = Date.now() / 1000) {
  return (
    typeof authTime === "number" &&
    authTime <= nowSeconds &&
    nowSeconds - authTime <= RECENT_SIGN_IN_SECONDS
  );
}

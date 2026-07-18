import { describe, expect, it } from "vitest";
import { guardianLoginErrorMessage } from "./GuardianGoogleSignIn";

describe("guardianLoginErrorMessage", () => {
  it("Firebase 승인 도메인 오류를 보호자가 이해할 수 있는 한국어로 바꾼다", () => {
    const message = guardianLoginErrorMessage({ code: "auth/unauthorized-domain", message: "Firebase: raw provider detail" });
    expect(message).toContain("승인된 도메인");
    expect(message).not.toContain("Firebase:");
  });

  it("알 수 없는 Firebase 원문은 화면에 노출하지 않는다", () => {
    expect(guardianLoginErrorMessage(new Error("Firebase: Error (auth/unknown)."))).toBe("Google 로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  });
});

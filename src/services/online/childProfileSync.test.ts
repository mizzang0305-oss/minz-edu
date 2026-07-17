import { describe, expect, it } from "vitest";
import {
  createChildProfileSyncRequest,
  parseChildProfileDeleteRequest,
  parseChildProfileSyncRequest,
  readSafeChildRoomIdentity,
  readSafeStoredFriendCode,
  readChildProfileCsrfToken,
  isValidChildProfileId,
  readSafeStoredChildProfile,
} from "./childProfileSync";

describe("child profile sync boundary", () => {
  it("keeps schoolLevel in the client sync request", () => {
    expect(
      createChildProfileSyncRequest(
        { displayName: "민즈", schoolLevel: "kindergarten", grade: 6 },
        "csrf-token",
      ),
    ).toEqual({
      displayName: "민즈",
      schoolLevel: "kindergarten",
      grade: 6,
      characterId: "thunder-sword",
      csrfToken: "csrf-token",
    });
  });

  it("accepts supported stages and keeps schoolLevel for persistence", () => {
    expect(
      parseChildProfileSyncRequest({
        displayName: " 초등학생 ",
        schoolLevel: "elementary",
        grade: 3,
        characterId: " thunder-sword ",
        csrfToken: "csrf-token",
      }),
    ).toEqual({
      displayName: "초등학생",
      schoolLevel: "elementary",
      grade: 3,
      characterId: "thunder-sword",
    });
  });

  it("rejects missing schoolLevel and the removed middle stage", () => {
    const base = {
      displayName: "민즈",
      grade: 3,
      characterId: "thunder-sword",
      csrfToken: "csrf-token",
    };

    expect(parseChildProfileSyncRequest(base)).toBeNull();
    expect(parseChildProfileSyncRequest({ ...base, schoolLevel: "middle" })).toBeNull();
  });

  it("reads only the CSRF token from an object-shaped request", () => {
    expect(readChildProfileCsrfToken({ csrfToken: "csrf-token" })).toBe("csrf-token");
    expect(readChildProfileCsrfToken(null)).toBeUndefined();
  });

  it("accepts only a bounded child profile deletion envelope", () => {
    expect(parseChildProfileDeleteRequest({ childProfileId: "child_second", csrfToken: "csrf-token" })).toEqual({
      childProfileId: "child_second",
      csrfToken: "csrf-token",
    });
    expect(parseChildProfileDeleteRequest({ childProfileId: "../other", csrfToken: "csrf-token" })).toBeNull();
    expect(parseChildProfileDeleteRequest({ childProfileId: "child_second", csrfToken: "", admin: true })).toBeNull();
  });

  it("rejects unsafe character and display identifiers", () => {
    const base = {
      displayName: "민즈",
      schoolLevel: "elementary",
      grade: 3,
      csrfToken: "csrf-token",
    };

    expect(parseChildProfileSyncRequest({ ...base, characterId: "../admin" })).toBeNull();
    expect(
      parseChildProfileSyncRequest({
        ...base,
        displayName: "민즈\n관리자",
        characterId: "thunder-sword",
      }),
    ).toBeNull();
  });

  it("exposes only validated child identity fields to a room", () => {
    expect(
      readSafeChildRoomIdentity({
        displayName: " 민즈 ",
        schoolLevel: "elementary",
        grade: 3,
        characterId: "thunder-sword",
        privateEmail: "child@example.com",
      }),
    ).toEqual({ displayName: "민즈", characterId: "thunder-sword" });
    expect(readSafeChildRoomIdentity({ displayName: "민즈", schoolLevel: "elementary", grade: 3, characterId: "../admin" })).toBeNull();
    expect(readSafeChildRoomIdentity({ displayName: "민즈", schoolLevel: "middle", grade: 2, characterId: "thunder-sword" })).toBeNull();
  });

  it("accepts only friend codes generated from the safe alphabet", () => {
    expect(readSafeStoredFriendCode("ABCD2345")).toBe("ABCD2345");
    expect(readSafeStoredFriendCode("ABCI2345")).toBeNull();
    expect(readSafeStoredFriendCode("short")).toBeNull();
  });

  it("accepts opaque child ids and rejects path-shaped ids", () => {
    expect(isValidChildProfileId("primary")).toBe(true);
    expect(isValidChildProfileId("child_a1b2c3")).toBe(true);
    expect(isValidChildProfileId("../other")).toBe(false);
  });

  it("returns only safe fields from a stored child profile", () => {
    expect(readSafeStoredChildProfile("child_one", {
      displayName: "민즈",
      schoolLevel: "elementary",
      grade: 2,
      characterId: "thunder-sword",
      friendCode: "ABCD2345",
      privateEmail: "hidden@example.com",
    })).toEqual({
      id: "child_one",
      displayName: "민즈",
      schoolLevel: "elementary",
      grade: 2,
      characterId: "thunder-sword",
      friendCode: "ABCD2345",
    });
  });
});

import { describe, expect, it } from "vitest";
import { issueRoomTicket, RoomTicketError, verifyRoomTicket } from "./roomTicket";

const SECRET = "test-room-ticket-secret-with-at-least-32-bytes";

describe("Colyseus room ticket", () => {
  it("보호자와 자녀, 참가 대상 방을 서명된 짧은 수명 claim으로 보존한다", () => {
    const issued = issueRoomTicket({
      guardianUid: "guardian-a",
      childProfileId: "primary",
      displayName: "민즈",
      intent: "join",
      roomId: "room-123",
    }, SECRET, 1_000_000);

    expect(verifyRoomTicket(issued.ticket, SECRET, 1_030_000)).toEqual(issued.claims);
    expect(issued.claims).toMatchObject({ intent: "join", roomId: "room-123", expiresAt: 1_090 });
    expect(issued.claims).not.toHaveProperty("guardianUid");
    expect(issued.claims).not.toHaveProperty("childProfileId");
    const decoded = Buffer.from(issued.ticket.split(".")[0], "base64url").toString("utf8");
    expect(decoded).not.toContain("guardian-a");
    expect(decoded).not.toContain("primary");
    expect(issued.claims.childKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("변조, 만료, 짧은 secret을 fail-closed 처리한다", () => {
    const issued = issueRoomTicket({
      guardianUid: "guardian-a",
      childProfileId: "primary",
      displayName: "민즈",
      intent: "create",
    }, SECRET, 1_000_000);

    expect(() => verifyRoomTicket(`${issued.ticket}x`, SECRET, 1_000_000)).toThrowError(
      expect.objectContaining({ code: "SIGNATURE" }),
    );
    expect(() => verifyRoomTicket(issued.ticket, SECRET, 1_091_000)).toThrowError(
      expect.objectContaining({ code: "EXPIRED" }),
    );
    expect(() => issueRoomTicket({
      guardianUid: "guardian-a",
      childProfileId: "primary",
      displayName: "민즈",
      intent: "create",
    }, "short")).toThrowError(RoomTicketError);
  });
});

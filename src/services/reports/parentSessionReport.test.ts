import { describe, expect, it } from "vitest";
import { buildParentSessionReportEmail, parseParentSessionReportRequest } from "./parentSessionReport";

const validRequest = {
  childProfileId: "primary",
  csrfToken: "c".repeat(64),
  goalTitle: "10 만들기",
  learningObjective: "10을 이용해 덧셈을 해결해요.",
  report: {
    id: "training-session-1",
    source: "training",
    goalId: "elementary-2-s2-math-w8",
    startedAt: "2026-07-18T01:00:00.000Z",
    completedAt: "2026-07-18T01:02:05.000Z",
    durationSeconds: 125,
    questionCount: 3,
    correctCount: 3,
    firstTryCorrect: 2,
    retryCount: 1,
    hintCount: 1,
    weakSkillTag: "make-ten",
    misconceptionTagCounts: { "m1-number-sign": 1 },
  },
};

describe("parent session report boundary", () => {
  it("accepts aggregate-only learning reports", () => {
    expect(parseParentSessionReportRequest(validRequest)).toMatchObject({ childProfileId: "primary", goalTitle: "10 만들기" });
  });

  it("rejects impossible counts and extra private fields", () => {
    expect(parseParentSessionReportRequest({ ...validRequest, report: { ...validRequest.report, correctCount: 4 } })).toBeNull();
    expect(parseParentSessionReportRequest({ ...validRequest, report: { ...validRequest.report, questionText: "private" } })).toBeNull();
    expect(parseParentSessionReportRequest({ ...validRequest, report: { ...validRequest.report, misconceptionTagCounts: { "raw-answer": 1 } } })).toBeNull();
  });

  it("escapes labels before rendering HTML", () => {
    const parsed = parseParentSessionReportRequest({ ...validRequest, goalTitle: "<script>alert(1)</script>" });
    expect(parsed).not.toBeNull();
    const email = buildParentSessionReportEmail(parsed!, "민표 <용사>");
    expect(email.html).toContain("민표 &lt;용사&gt;");
    expect(email.text).toContain("정수 부호와 절댓값 1회");
    expect(email.text).not.toContain("raw-answer");
    expect(email.html).not.toContain("<script>");
  });
});

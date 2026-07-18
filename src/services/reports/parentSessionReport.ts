import type { LearningSessionReport } from "@/types/progress";
import { isValidChildProfileId } from "@/services/online/childProfileSync";
import { isMisconceptionTag, topMisconceptionTags, type MisconceptionTagCounts } from "@/learning/misconceptionTags";

export type ParentSessionReportRequest = {
  childProfileId: string;
  csrfToken: string;
  goalTitle: string;
  learningObjective: string;
  report: Omit<LearningSessionReport, "deliveryStatus" | "deliveredAt" | "goalTitle" | "learningObjective">;
};

const ID_PATTERN = /^[A-Za-z0-9:_-]{1,160}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeLabel(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && value.trim().length <= maxLength
    && !CONTROL_CHARACTER_PATTERN.test(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function isBoundedInteger(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;
}

function parseMisconceptionTagCounts(value: unknown): MisconceptionTagCounts | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || Object.keys(value).length > 12) return null;
  const parsed: MisconceptionTagCounts = {};
  for (const [tag, count] of Object.entries(value)) {
    if (!isMisconceptionTag(tag) || !isBoundedInteger(count, 100) || count < 1) return null;
    parsed[tag] = count;
  }
  return parsed;
}

export function readParentSessionReportCsrfToken(value: unknown): unknown {
  return isRecord(value) ? value.csrfToken : undefined;
}

export function parseParentSessionReportRequest(value: unknown): ParentSessionReportRequest | null {
  if (!isRecord(value) || !isRecord(value.report)) return null;
  if (!isValidChildProfileId(value.childProfileId) || typeof value.csrfToken !== "string" || value.csrfToken.length < 1) return null;
  if (!isSafeLabel(value.goalTitle, 140) || !isSafeLabel(value.learningObjective, 280)) return null;

  const report = value.report;
  const allowedReportKeys = [
    "id",
    "source",
    "goalId",
    "startedAt",
    "completedAt",
    "durationSeconds",
    "questionCount",
    "correctCount",
    "firstTryCorrect",
    "retryCount",
    "hintCount",
    "weakSkillTag",
    "misconceptionTagCounts",
  ];
  if (!Object.keys(report).every((key) => allowedReportKeys.includes(key))) return null;
  if (typeof report.id !== "string" || !ID_PATTERN.test(report.id)) return null;
  if (report.source !== "training" && report.source !== "battle") return null;
  if (typeof report.goalId !== "string" || !ID_PATTERN.test(report.goalId)) return null;
  if (!isIsoDate(report.startedAt) || !isIsoDate(report.completedAt)) return null;
  if (Date.parse(report.completedAt) < Date.parse(report.startedAt)) return null;
  if (!isBoundedInteger(report.durationSeconds, 24 * 60 * 60)) return null;
  if (!isBoundedInteger(report.questionCount, 100) || report.questionCount < 1) return null;
  if (!isBoundedInteger(report.correctCount, report.questionCount)) return null;
  if (!isBoundedInteger(report.firstTryCorrect, report.correctCount)) return null;
  if (!isBoundedInteger(report.retryCount, 500) || !isBoundedInteger(report.hintCount, 500)) return null;
  if (report.weakSkillTag !== undefined && !isSafeLabel(report.weakSkillTag, 100)) return null;
  const misconceptionTagCounts = parseMisconceptionTagCounts(report.misconceptionTagCounts);
  if (misconceptionTagCounts === null) return null;

  return {
    childProfileId: value.childProfileId,
    csrfToken: value.csrfToken,
    goalTitle: value.goalTitle.trim(),
    learningObjective: value.learningObjective.trim(),
    report: {
      id: report.id,
      source: report.source,
      goalId: report.goalId,
      startedAt: report.startedAt,
      completedAt: report.completedAt,
      durationSeconds: report.durationSeconds,
      questionCount: report.questionCount,
      correctCount: report.correctCount,
      firstTryCorrect: report.firstTryCorrect,
      retryCount: report.retryCount,
      hintCount: report.hintCount,
      ...(typeof report.weakSkillTag === "string" ? { weakSkillTag: report.weakSkillTag.trim() } : {}),
      ...(misconceptionTagCounts && Object.keys(misconceptionTagCounts).length > 0 ? { misconceptionTagCounts } : {}),
    },
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}분 ${remainder}초` : `${remainder}초`;
}

export function buildParentSessionReportEmail(input: ParentSessionReportRequest, childDisplayName: string) {
  const { report } = input;
  const completedLabel = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(report.completedAt));
  const firstTryRate = Math.round((report.firstTryCorrect / report.questionCount) * 100);
  const misconceptionSummary = topMisconceptionTags(report.misconceptionTagCounts ?? {});
  const weakArea = misconceptionSummary.length > 0
    ? `다시 살펴볼 유형: ${misconceptionSummary.map((item) => `${item.label} ${item.count}회`).join(", ")}. 선택한 답이나 문제 원문은 저장하지 않았습니다.`
    : report.weakSkillTag
      ? `${input.goalTitle} 목표에서 다시 시도 또는 힌트 사용이 있었습니다.`
    : "이번 세션에서는 별도 복습 경고가 발견되지 않았습니다.";
  const title = `${childDisplayName} 학습 요약 · ${input.goalTitle}`;
  const lines = [
    title,
    `완료 시각: ${completedLabel}`,
    `실행 시간: ${formatDuration(report.durationSeconds)}`,
    `문제 수: ${report.questionCount}개`,
    `정답 확인: ${report.correctCount}개`,
    `첫 시도 정답: ${report.firstTryCorrect}개 (${firstTryRate}%)`,
    `다시 시도: ${report.retryCount}회`,
    `힌트 사용: ${report.hintCount}회`,
    `학습 목표: ${input.learningObjective}`,
    `복습 관찰: ${weakArea}`,
    "안내: 이 요약은 한 번의 게임 기록이며, 아이의 학업 능력을 단정하는 평가가 아닙니다.",
  ];
  const rows = [
    ["완료 시각", completedLabel],
    ["실행 시간", formatDuration(report.durationSeconds)],
    ["문제 수", `${report.questionCount}개`],
    ["정답 확인", `${report.correctCount}개`],
    ["첫 시도 정답", `${report.firstTryCorrect}개 (${firstTryRate}%)`],
    ["다시 시도", `${report.retryCount}회`],
    ["힌트 사용", `${report.hintCount}회`],
  ];
  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#eef6f7;color:#173746;font-family:Arial,'Malgun Gothic',sans-serif"><main style="max-width:640px;margin:0 auto;padding:28px 18px"><section style="padding:28px;border-radius:20px;background:#082f49;color:#fff"><p style="margin:0;color:#7de6f5;font-weight:800">MINZ ADVENTURE PARENT REPORT</p><h1 style="margin:8px 0 0;font-size:26px">${escapeHtml(title)}</h1></section><section style="padding:24px;border-radius:0 0 20px 20px;background:#fff"><table style="width:100%;border-collapse:collapse">${rows.map(([label, text]) => `<tr><th style="padding:11px 8px;border-bottom:1px solid #dce9ec;text-align:left;color:#53717d">${escapeHtml(label)}</th><td style="padding:11px 8px;border-bottom:1px solid #dce9ec;text-align:right;font-weight:800">${escapeHtml(text)}</td></tr>`).join("")}</table><h2 style="margin:24px 0 8px;font-size:18px">학습 목표</h2><p style="line-height:1.65">${escapeHtml(input.learningObjective)}</p><h2 style="margin:24px 0 8px;font-size:18px">복습 관찰</h2><p style="line-height:1.65">${escapeHtml(weakArea)}</p><p style="margin-top:24px;padding:14px;border-radius:12px;background:#eaf7fa;color:#3b5b68;font-size:13px;line-height:1.55">이 요약은 한 번의 게임 기록이며, 아이의 학업 능력을 단정하는 평가가 아닙니다.</p></section></main></body></html>`;
  return { subject: `[민즈 어드벤처] ${childDisplayName} 학습 요약`, text: lines.join("\n"), html };
}

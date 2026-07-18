"use client";

import { useCallback, useEffect, useRef } from "react";
import { findLearningGoal } from "@/learning/curriculumCatalog";
import {
  getActiveChildProfileId,
  readGameData,
  SESSION_REPORT_READY_EVENT,
  updateSessionReportDelivery,
} from "@/stores/storage";

type DeliveryResponse = {
  code?: string;
  deliveredAt?: string;
};

export function SessionReportDelivery() {
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    const childProfileId = getActiveChildProfileId();
    const data = readGameData(childProfileId);
    const pending = data.sessionReports.filter((report) => report.deliveryStatus !== "sent").slice(-3);
    if (pending.length === 0) return;
    flushingRef.current = true;
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin", keepalive: true });
      if (!csrfResponse.ok) return;
      const csrfBody = await csrfResponse.json() as { csrfToken?: unknown };
      if (typeof csrfBody.csrfToken !== "string") return;

      for (const report of pending) {
        const goal = findLearningGoal(data.playerProfile, report.goalId, data.parentSettings.academicSemester);
        const response = await fetch("/api/parent-reports/send", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childProfileId,
            csrfToken: csrfBody.csrfToken,
            goalTitle: report.goalTitle ?? `${goal.unitTitle} · ${goal.title}`,
            learningObjective: report.learningObjective ?? goal.objective,
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
              ...(report.weakSkillTag ? { weakSkillTag: report.weakSkillTag } : {}),
              ...(report.misconceptionTagCounts ? { misconceptionTagCounts: report.misconceptionTagCounts } : {}),
            },
          }),
        });
        let body: DeliveryResponse = {};
        try {
          body = await response.json() as DeliveryResponse;
        } catch {
          // Status code is sufficient for a privacy-safe retry decision.
        }
        if (response.ok) {
          updateSessionReportDelivery(report.id, "sent", body.deliveredAt ?? new Date().toISOString());
          continue;
        }
        if (response.status === 401 || response.status === 429) break;
        updateSessionReportDelivery(report.id, body.code === "EMAIL_NOT_CONFIGURED" ? "configuration-required" : "failed");
        console.warn("parent_report_not_delivered", { code: body.code ?? `HTTP_${response.status}` });
      }
    } catch {
      // The report remains local and will be retried on the next online/app event.
    } finally {
      flushingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void flush();
    };
    const timer = window.setTimeout(() => void flush(), 3_000);
    const handleReady = () => void flush();
    window.addEventListener(SESSION_REPORT_READY_EVENT, handleReady);
    window.addEventListener("online", handleReady);
    window.addEventListener("pageshow", handleReady);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SESSION_REPORT_READY_EVENT, handleReady);
      window.removeEventListener("online", handleReady);
      window.removeEventListener("pageshow", handleReady);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [flush]);

  return null;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveChildProfileId } from "@/stores/storage";
import type { StoredLearningLogView } from "@/types/learningBattlePoc";

async function fetchLearningLogs(childProfileId: string) {
  const response = await fetch(`/api/guardian/learning-logs?childProfileId=${encodeURIComponent(childProfileId)}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const body = await response.json() as { logs?: unknown };
  if (!response.ok || !Array.isArray(body.logs)) throw new Error("learning-log-list");
  return body.logs as StoredLearningLogView[];
}

export function GuardianLearningLogs() {
  const [logs, setLogs] = useState<StoredLearningLogView[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const childProfileId = getActiveChildProfileId();

  const refresh = useCallback(async () => {
    try {
      setLogs(await fetchLearningLogs(childProfileId));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [childProfileId]);

  useEffect(() => {
    let active = true;
    void fetchLearningLogs(childProfileId).then((items) => {
      if (!active) return;
      setLogs(items);
      setStatus("ready");
    }).catch(() => {
      if (active) setStatus("error");
    });
    return () => {
      active = false;
    };
  }, [childProfileId]);

  async function deleteLogs(recordId?: string) {
    const message = recordId ? "이 학습 로그를 삭제할까요?" : "이 자녀의 영구 학습 로그를 모두 삭제할까요?";
    if (!window.confirm(message)) return;
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
      const csrfBody = await csrfResponse.json() as { csrfToken?: unknown };
      if (!csrfResponse.ok || typeof csrfBody.csrfToken !== "string") throw new Error("csrf");
      const response = await fetch("/api/guardian/learning-logs", {
        method: "DELETE",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childProfileId,
          csrfToken: csrfBody.csrfToken,
          ...(recordId ? { recordId } : { all: true }),
        }),
      });
      if (!response.ok) throw new Error("delete");
      await refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="parent-section">
      <div className="section-title">
        <div>
          <h2>문제별 영구 학습 로그</h2>
          <p>인증된 보호자는 현재 선택한 자녀의 최근 90일 기록만 조회·삭제할 수 있습니다.</p>
        </div>
        {logs.length > 0 && <button type="button" className="secondary-button" onClick={() => void deleteLogs()}>전체 삭제</button>}
      </div>
      {status === "loading" && <p>학습 로그를 불러오는 중입니다.</p>}
      {status === "error" && <p>학습 로그를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>}
      {status === "ready" && logs.length === 0 && <p>저장된 온라인 협동 학습 로그가 없습니다.</p>}
      {status === "ready" && logs.length > 0 && (
        <div className="session-report-grid">
          {logs.map((entry) => (
            <article key={entry.id}>
              <span>{new Date(entry.updatedAt).toLocaleString("ko-KR")}</span>
              <strong>시도 {entry.log.totalAttempts}회 · 힌트 {entry.log.totalHints}회</strong>
              <small>문제 {entry.log.questionLogs.length}개 · {Math.ceil(entry.log.totalElapsedMs / 1_000)}초 · {new Date(entry.expiresAt).toLocaleDateString("ko-KR")} 만료</small>
              <button type="button" className="secondary-button" onClick={() => void deleteLogs(entry.id)}>삭제</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

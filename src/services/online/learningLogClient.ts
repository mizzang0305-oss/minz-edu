let csrfTokenPromise: Promise<string> | null = null;

export async function persistSignedLearningLog(childProfileId: string, receipt: string) {
  const csrfToken = await getCsrfToken();
  const response = await fetch("/api/guardian/learning-logs", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childProfileId, csrfToken, receipt }),
  });
  if (response.status === 403) csrfTokenPromise = null;
  if (!response.ok) throw new Error(`learning-log-persist-${response.status}`);
}

async function getCsrfToken() {
  csrfTokenPromise ??= fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  }).then(async (response) => {
    const body = await response.json() as { csrfToken?: unknown };
    if (!response.ok || typeof body.csrfToken !== "string") throw new Error("learning-log-csrf");
    return body.csrfToken;
  }).catch((error) => {
    csrfTokenPromise = null;
    throw error;
  });
  return csrfTokenPromise;
}

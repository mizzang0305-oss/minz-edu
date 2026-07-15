"use client";

import { useState } from "react";

type Props = {
  displayName: string;
  email: string;
};

export function GuardianConnectedCard({ displayName, email }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function logout() {
    setBusy(true);
    setMessage("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!csrfResponse.ok) throw new Error("보안 확인을 시작하지 못했습니다.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken }),
      });
      if (!response.ok) throw new Error("로그아웃하지 못했습니다.");
      window.location.assign("/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그아웃하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <section className="guardian-connected" aria-label="연결된 보호자 계정">
      <span aria-hidden="true">✓</span>
      <div>
        <strong>{displayName} 보호자 계정 연결됨</strong>
        {email && <small>{email}</small>}
      </div>
      <button type="button" className="secondary-button" onClick={logout} disabled={busy}>
        {busy ? "로그아웃 중…" : "로그아웃"}
      </button>
      {message && <p className="login-error" role="alert">{message}</p>}
    </section>
  );
}

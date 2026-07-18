"use client";

import { useEffect, useState } from "react";
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { getGuardianGoogleAuth } from "@/lib/firebase/client";

type Props = {
  configured: boolean;
};

type LoginState = "idle" | "checking" | "exchanging" | "error";

export function guardianLoginErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/unauthorized-domain": "현재 주소가 Firebase의 승인된 도메인에 등록되지 않았습니다. 보호자에게 알려 설정을 확인해 주세요.",
    "auth/popup-closed-by-user": "Google 로그인 창이 닫혔습니다. 다시 눌러 로그인을 완료해 주세요.",
    "auth/cancelled-popup-request": "로그인 창을 하나만 열어 주세요. 잠시 후 다시 시도해 주세요.",
    "auth/network-request-failed": "인터넷 연결이 불안정합니다. 연결을 확인한 뒤 다시 시도해 주세요.",
    "auth/web-storage-unsupported": "이 브라우저의 저장 기능이 차단되어 있습니다. 일반 모드에서 다시 열어 주세요.",
    "auth/operation-not-allowed": "Google 로그인이 Firebase에서 활성화되지 않았습니다. 보호자 설정 확인이 필요합니다.",
    "auth/internal-error": "Firebase 로그인 처리 중 일시적인 오류가 났습니다. 창을 새로고침한 뒤 다시 시도해 주세요.",
  };
  return messages[code] ?? (error instanceof Error && !error.message.startsWith("Firebase:")
    ? error.message
    : "Google 로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

async function exchangeForServerSession(idToken: string) {
  const csrfResponse = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!csrfResponse.ok) throw new Error("보안 확인을 시작하지 못했습니다.");

  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const sessionResponse = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, csrfToken }),
  });
  const result = (await sessionResponse.json()) as { error?: string };
  if (!sessionResponse.ok) throw new Error(result.error ?? "로그인 세션을 만들지 못했습니다.");
}

export function GuardianGoogleSignIn({ configured }: Props) {
  const [state, setState] = useState<LoginState>(configured ? "checking" : "idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!configured) return;

    let active = true;
    void (async () => {
      try {
        const { auth } = await getGuardianGoogleAuth(true);
        const result = await getRedirectResult(auth);
        if (!result || !active) {
          if (active) setState("idle");
          return;
        }

        setState("exchanging");
        const idToken = await result.user.getIdToken();
        await exchangeForServerSession(idToken);
        await signOut(auth);
        window.location.assign("/parent");
      } catch (error) {
        if (!active) return;
        setMessage(guardianLoginErrorMessage(error));
        setState("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [configured]);

  async function startGoogleSignIn() {
    setMessage("");
    setState("checking");
    try {
      const { auth, provider } = await getGuardianGoogleAuth();
      const result = await signInWithPopup(auth, provider);
      setState("exchanging");
      const idToken = await result.user.getIdToken();
      await exchangeForServerSession(idToken);
      await signOut(auth);
      window.location.assign("/parent");
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        const { auth, provider } = await getGuardianGoogleAuth(true);
        await signInWithRedirect(auth, provider);
        return;
      }
      setMessage(guardianLoginErrorMessage(error));
      setState("error");
    }
  }

  const busy = state === "checking" || state === "exchanging";

  return (
    <div className="guardian-login-card">
      <button
        type="button"
        className="google-signin-button"
        onClick={startGoogleSignIn}
        disabled={!configured || busy}
      >
        <span aria-hidden="true">G</span>
        {state === "exchanging" ? "안전한 세션 만드는 중…" : busy ? "Google 확인 중…" : "보호자 Google 계정으로 계속"}
      </button>
      {!configured && (
        <p className="config-status" role="status">
          현재는 로컬 준비 모드입니다. Firebase 환경값을 연결하면 이 버튼이 활성화됩니다.
        </p>
      )}
      {message && <p className="login-error" role="alert">{message}</p>}
    </div>
  );
}

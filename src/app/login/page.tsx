import Link from "next/link";
import { GuardianConnectedCard } from "@/components/auth/GuardianConnectedCard";
import { GuardianGoogleSignIn } from "@/components/auth/GuardianGoogleSignIn";
import { getGuardianSession } from "@/lib/auth/guardianSession";
import { hasFirebaseAdminConfig } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const publicValues = [
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ];
  const publicConfigReady = publicValues.every(
    (value) => Boolean(value) && value !== "replace-me" && !value?.startsWith("your-project"),
  );
  const configured = publicConfigReady && hasFirebaseAdminConfig();
  const guardianSession = await getGuardianSession();

  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="eyebrow">보호자 계정</span>
        <h1>Google 계정 하나로<br />아이들의 모험을 관리해요</h1>
        <p className="login-lead">
          로그인은 보호자만 합니다. 아이는 개인 Google 계정 대신 보호자가 만든 자녀 프로필과 승인된 참가 코드로 자기 기기에서 입장합니다.
        </p>
        {guardianSession ? (
          <GuardianConnectedCard
            displayName={guardianSession.displayName}
            email={guardianSession.email}
          />
        ) : (
          <GuardianGoogleSignIn configured={configured} />
        )}
        <div className="account-boundary" aria-label="계정 운영 원칙">
          <article><strong>보호자</strong><span>Google 로그인 · 자녀 프로필 · 친구 승인</span></article>
          <article><strong>아이</strong><span>닉네임 프로필 · 방 코드 · 공개 검색 없음</span></article>
          <article><strong>서버</strong><span>공격 · 보상 · 승리 결과만 확정</span></article>
        </div>
        <Link href="/setup" className="quiet-link">
          {guardianSession ? "학습 설정으로 이동" : "계정 연결 전 로컬 모드 계속하기"}
        </Link>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";

export default function AppError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <main className="login-page" role="alert">
      <section className="login-panel">
        <span className="eyebrow">모험 일시정지</span>
        <h1>잠깐! 마법 지도가 흔들렸어</h1>
        <p>이미 저장된 모험 기록은 그대로예요. 다시 시도해도 안 되면 모험 지도로 돌아가 주세요.</p>
        <div className="hero-actions">
          <button type="button" className="primary-button" onClick={unstable_retry}>다시 시도</button>
          <Link href="/world" className="secondary-button">모험 지도로 돌아가기</Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow">민즈 전용 AI 어드벤처</span><h1>숫자의 힘을 모아<br/><em>모험을 시작하자!</em></h1><p>블록을 움직이고, 친구와 작전을 세우고, 화려한 드래곤 필살기로 숫자 보스를 물리치는 5~10분 모험.</p><div className="hero-actions"><Link href="/world" className="primary-button">오늘의 모험 시작</Link><Link href="/setup" className="secondary-button">보호자 설정</Link></div><div className="promise-row"><span>광고 없음</span><span>결제 없음</span><span>이 기기에만 저장</span></div></div>
        <div className="hero-art" aria-label="번개 검사와 불꽃 마법사가 숫자 슬라임을 마주한 그림"><div className="moon"/><div className="hero-character thunder"><span className="face">•ᴗ•</span><span className="sword">⚡</span></div><div className="hero-character fire"><span className="face">•ᴗ•</span><span className="orb">✦</span></div><div className="hero-slime"><span>8+7</span><i>• ᴗ •</i></div><div className="ground"/></div>
      </section>
      <section className="feature-strip"><article><span>01</span><div><h2>직접 움직여 발견</h2><p>10칸 블록을 손으로 옮겨 숫자의 구조를 찾아요.</p></div></article><article><span>02</span><div><h2>다시 도전해도 보상</h2><p>시도, 설명, 도움 요청도 모두 용기 기록이 돼요.</p></div></article><article><span>03</span><div><h2>같은 화면 2인 협동</h2><p>각자 다른 역할을 완성해야 합동 스킬이 열려요.</p></div></article></section>
    </main>
  );
}

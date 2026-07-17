import Link from "next/link";
import Image from "next/image";
import { AdventureStartLink } from "@/components/home/AdventureStartLink";
import { GameIntro } from "@/components/home/GameIntro";

export default function HomePage() {
  return (
    <main className="home-page game-home">
      <GameIntro />
      <section className="game-landing">
        <div className="game-landing-vignette" />
        <div className="game-logo-lockup">
          <span className="game-season">민즈 어드벤처 · 첫 번째 모험</span>
          <h1><small>숫자 숲의 전설</small>민즈 어드벤처</h1>
          <p>번개 검을 깨우고 친구와 힘을 합쳐<br />숫자 수호자의 봉인을 풀어라!</p>
          <div className="game-start-actions">
            <AdventureStartLink />
            <Link href="/room" className="game-coop-button">친구와 온라인 협동</Link>
          </div>
          <div className="game-mode-chips"><span>5~10분 한 판</span><span>혼자 또는 친구와</span><span>보물 모으기</span></div>
        </div>
        <div className="landing-cast" aria-label="두 영웅과 첫 번째 숲 친구의 만남">
          <figure className="landing-hero landing-thunder"><span className="landing-aura" /><Image src="/game-assets/duelyst/hero-thunder.webp" alt="번개 검사" width="420" height="304" loading="eager" /><figcaption>번개 검사</figcaption></figure>
          <figure className="landing-hero landing-magic"><span className="landing-aura" /><Image src="/game-assets/duelyst/hero-magic.webp" alt="마력 추적자" width="420" height="304" /><figcaption>마력 추적자</figcaption></figure>
          <figure className="landing-boss"><span className="boss-number">첫 친구</span><Image src="/game-assets/superpowers-rpg/boss-slime.png" alt="잠든 씨앗 슬라임" width="141" height="107" unoptimized /><figcaption>잠든 씨앗 슬라임</figcaption></figure>
        </div>
        <div className="scroll-cue">SCROLL TO EXPLORE <span>⌄</span></div>
      </section>
      <section className="game-feature-strip">
        <article><span>01</span><div><small>찾기</small><h2>움직이며 원리 발견</h2><p>코스를 탐험하고 직접 조작하며 문제의 원리를 찾아요.</p></div></article>
        <article><span>02</span><div><small>함께</small><h2>각자 기기에서 합동 공격</h2><p>두 영웅의 작전이 모이면 드래곤 필살기가 열려요.</p></div></article>
        <article><span>03</span><div><small>보물</small><h2>다시 도전해도 보물이 쌓여요</h2><p>맞힌 답뿐 아니라 끝까지 시도한 용기도 기록해요.</p></div></article>
      </section>
    </main>
  );
}

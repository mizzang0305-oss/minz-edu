"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AdventureStartLink } from "./AdventureStartLink";

export const GAME_INTRO_SEEN_KEY = "minz-edu:game-intro-seen:v1";
const GAME_INTRO_CHANGED_EVENT = "minz-edu:game-intro-changed";

const INTRO_STEPS = [
  {
    kicker: "STORY 01 · 사라진 별빛",
    title: "세 개의 세계가 길을 잃었어!",
    copy: "장난꾸러기 그림자가 숫자 조각, 글자 룬, 이야기 기억을 흩어 놓았어. 길을 잃은 수호자들이 너를 기다리고 있어.",
  },
  {
    kicker: "STORY 02 · 모험 방법",
    title: "찾고, 풀고, 다시 나아가자!",
    copy: "길을 움직이며 단서를 찾고, 수호자가 낸 문제를 풀어 공격을 피하세요. 틀려도 힌트를 보고 다시 도전하면 돼요.",
  },
  {
    kicker: "FINAL QUEST · 최종 목표",
    title: "배움의 별빛을 완성해 줘!",
    copy: "숫자 숲, 단어 섬, 이야기 성의 빛을 모두 되찾고 세 수호자와 친구가 되는 것이 이번 모험의 최종 목표야.",
  },
] as const;

function subscribeIntroSeen(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(GAME_INTRO_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(GAME_INTRO_CHANGED_EVENT, callback);
  };
}

function getIntroSeenSnapshot() {
  try {
    return window.localStorage.getItem(GAME_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    window.localStorage.setItem(GAME_INTRO_SEEN_KEY, "1");
  } catch {
    // The intro can still close when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(GAME_INTRO_CHANGED_EVENT));
}

export function GameIntro() {
  const introSeen = useSyncExternalStore(subscribeIntroSeen, getIntroSeenSnapshot, () => true);
  const [manualOpen, setManualOpen] = useState(false);
  const [step, setStep] = useState(0);
  const open = manualOpen || !introSeen;
  const current = INTRO_STEPS[step];
  const finalStep = step === INTRO_STEPS.length - 1;

  const closeIntro = () => {
    markIntroSeen();
    setManualOpen(false);
    setStep(0);
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeIntro();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      {!open && (
        <button className="game-intro-replay" type="button" onClick={() => { setStep(0); setManualOpen(true); }}>
          <span aria-hidden="true">✦</span> 이야기 다시 보기
        </button>
      )}

      {open && (
        <div className="game-intro-backdrop" role="dialog" aria-modal="true" aria-labelledby="game-intro-title">
          <section className={`game-intro-card intro-step-${step + 1}`}>
            <button className="game-intro-skip" type="button" onClick={closeIntro} autoFocus>건너뛰기</button>

            <div className="game-intro-art" aria-hidden="true">
              <span className="intro-world-orbit intro-orbit-one" />
              <span className="intro-world-orbit intro-orbit-two" />
              <Image className="intro-hero" src="/game-assets/duelyst/hero-thunder.webp" alt="" width="420" height="304" priority />
              {step === 0 && <Image className="intro-boss" src="/game-assets/superpowers-rpg/boss-slime.png" alt="" width="141" height="107" unoptimized />}
              {step === 2 && <Image className="intro-friend" src="/game-assets/duelyst/hero-magic.webp" alt="" width="420" height="304" priority />}
              <strong className="intro-light-mark">✦</strong>
            </div>

            <div className="game-intro-copy">
              <span className="game-intro-kicker">{current.kicker}</span>
              <h2 id="game-intro-title">{current.title}</h2>
              <p>{current.copy}</p>

              {step === 1 && (
                <div className="game-intro-how" aria-label="모험 방법 세 단계">
                  <article><span aria-hidden="true">🧭</span><strong>1. 찾아요</strong><small>움직이며 단서 발견</small></article>
                  <article><span aria-hidden="true">🛡️</span><strong>2. 풀어요</strong><small>문제를 풀어 회피</small></article>
                  <article><span aria-hidden="true">🎁</span><strong>3. 모아요</strong><small>보물과 별빛 획득</small></article>
                </div>
              )}

              {step === 2 && (
                <div className="game-intro-promise">
                  <span aria-hidden="true">♥</span>
                  <p><strong>틀려도 괜찮아!</strong> 힌트를 쓰고 다시 도전하면 수호자가 친절하게 알려 줄 거야.</p>
                </div>
              )}

              <div className="game-intro-controls">
                <div className="game-intro-progress" aria-label={`${step + 1} / ${INTRO_STEPS.length}`}>
                  {INTRO_STEPS.map((item, index) => <span key={item.kicker} className={index === step ? "active" : ""} />)}
                </div>
                {!finalStep ? (
                  <button className="game-intro-next" type="button" onClick={() => setStep((currentStep) => currentStep + 1)}>
                    다음 이야기 <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <AdventureStartLink onStart={closeIntro} />
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

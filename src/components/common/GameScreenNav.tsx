"use client";

import Link from "next/link";

type GameScreen = "world" | "inventory" | "training";

const GAME_LINKS: Array<{ href: string; label: string; screen?: GameScreen }> = [
  { href: "/world", label: "모험", screen: "world" },
  { href: "/inventory", label: "인벤토리", screen: "inventory" },
  { href: "/training", label: "훈련", screen: "training" },
  { href: "/setup", label: "설정" },
];

export function GameScreenNav({ current }: { current: GameScreen }) {
  return (
    <nav className="game-screen-nav" aria-label="게임 메뉴">
      <Link className="game-screen-brand" href="/world" aria-label="민즈 에듀 모험 지도">
        <span aria-hidden="true">M</span>
        <strong>MINZ EDU</strong>
      </Link>
      <div>
        {GAME_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={link.screen === current ? "is-current" : undefined}
            aria-current={link.screen === current ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

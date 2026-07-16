import type { ExplorationRect } from "@/types/exploration";

type Size = { width: number; height: number };
type PositionedSize = Size & { x: number; y: number };

export type BattleFormation = {
  compactLandscape: boolean;
  players: [PositionedSize, PositionedSize];
  boss: PositionedSize;
};

const BOSS_SIZES = {
  1: { width: 141, height: 107 },
  2: { width: 231, height: 172 },
  3: { width: 300, height: 217 },
} as const;

export function isCompactLandscapeViewport(width: number, height: number) {
  return width > height && width <= 900 && height <= 520;
}

export function resolveBattleFormation(
  safeArea: ExplorationRect,
  threatTier: 1 | 2 | 3,
  viewport: Size,
): BattleFormation {
  const compactLandscape = isCompactLandscapeViewport(viewport.width, viewport.height);
  const baseBoss = BOSS_SIZES[threatTier];
  const bottom = safeArea.y + safeArea.height;

  if (compactLandscape) {
    const combatWidth = safeArea.width * 0.5;
    const bossScale = Math.min(1, 155 / baseBoss.width);
    const boss = { width: Math.round(baseBoss.width * bossScale), height: Math.round(baseBoss.height * bossScale) };
    return {
      compactLandscape: true,
      players: [
        { x: safeArea.x + combatWidth * 0.18, y: bottom - 82, width: 140, height: 61 },
        { x: safeArea.x + combatWidth * 0.44, y: bottom - 65, width: 96, height: 64 },
      ],
      boss: {
        x: safeArea.x + combatWidth * 0.8,
        y: Math.min(safeArea.y + safeArea.height * 0.55, bottom - boss.height / 2 - 26),
        ...boss,
      },
    };
  }

  return {
    compactLandscape: false,
    players: [
      { x: safeArea.x + safeArea.width * 0.17, y: bottom - 77, width: 240, height: 104 },
      { x: safeArea.x + safeArea.width * 0.35, y: bottom - 58, width: 151, height: 100 },
    ],
    boss: {
      x: safeArea.x + safeArea.width * 0.84,
      y: Math.min(safeArea.y + safeArea.height * 0.62, bottom - baseBoss.height / 2 - 18),
      ...baseBoss,
    },
  };
}

import { describe, expect, it } from "vitest";
import { resolveBattleFormation } from "./BattleFormation";

const safeArea = { x: 64, y: 96, width: 800, height: 266 };

describe("battle HUD-safe formation", () => {
  it("keeps the normal formation inside the Tiled safe area", () => {
    const formation = resolveBattleFormation(safeArea, 3, { width: 1280, height: 720 });
    expect(formation.compactLandscape).toBe(false);
    expect(formation.players[1].y + formation.players[1].height / 2 + 8).toBeLessThanOrEqual(safeArea.y + safeArea.height);
    expect(formation.boss.y + formation.boss.height / 2 + 18).toBeLessThanOrEqual(safeArea.y + safeArea.height);
    expect(formation.players[0].y).toBeLessThan(safeArea.y + safeArea.height * 0.65);
    expect(formation.players[1].y).toBeLessThan(safeArea.y + safeArea.height * 0.72);
  });

  it("compresses and scales the fight into the left half beside a phone HUD", () => {
    const formation = resolveBattleFormation(safeArea, 3, { width: 844, height: 390 });
    const compactRight = safeArea.x + safeArea.width * 0.5;
    expect(formation.compactLandscape).toBe(true);
    expect(formation.boss.width).toBeLessThan(300);
    expect(formation.boss.x + formation.boss.width / 2).toBeLessThanOrEqual(compactRight);
    expect(formation.players.every((player) => player.x + player.width / 2 <= compactRight)).toBe(true);
  });
});

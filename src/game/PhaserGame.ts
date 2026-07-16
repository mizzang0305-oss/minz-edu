import * as Phaser from "phaser";
import { ADVENTURE_WORLD_HEIGHT, ADVENTURE_WORLD_WIDTH, NumberForestScene } from "./scenes/NumberForestScene";
import type { ExplorationStageId } from "@/types/exploration";

export function createPhaserGame(parent: HTMLElement, stageId: ExplorationStageId = "number-forest") {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#082f49",
    scene: [new NumberForestScene(stageId)],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: ADVENTURE_WORLD_WIDTH,
      height: ADVENTURE_WORLD_HEIGHT,
    },
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    audio: { noAudio: true },
  });
}

import * as Phaser from "phaser";
import { NumberForestScene } from "./scenes/NumberForestScene";

export function createPhaserGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#082f49",
    scene: [NumberForestScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 900,
      height: 400,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
    audio: { noAudio: true },
  });
}

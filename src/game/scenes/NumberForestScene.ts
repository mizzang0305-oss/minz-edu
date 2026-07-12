import * as Phaser from "phaser";
import { gameEventBridge } from "@/game/bridge/gameEventBridge";
import type { CoopBattleState } from "@/types/battle";

type PlayerVisual = {
  body: Phaser.GameObjects.Container;
  name: Phaser.GameObjects.Text;
  aura: Phaser.GameObjects.Arc;
};

export class NumberForestScene extends Phaser.Scene {
  private playerVisuals: PlayerVisual[] = [];
  private boss?: Phaser.GameObjects.Container;
  private bossBody?: Phaser.GameObjects.Arc;
  private bossName?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private unsubscribers: Array<() => void> = [];
  private shakeIntensity: 0 | 1 | 2 = 1;

  constructor() {
    super("NumberForestScene");
  }

  create() {
    const { width, height } = this.scale;
    const background = this.add.graphics();
    background.fillGradientStyle(0x082f49, 0x082f49, 0x134e4a, 0x134e4a, 1);
    background.fillRect(0, 0, width, height);
    background.fillStyle(0x1f6f5b, 0.6);
    background.fillEllipse(width * 0.5, height * 0.88, width * 1.1, 120);

    for (let index = 0; index < 12; index += 1) {
      const star = this.add.circle(40 + index * 73, 42 + (index % 3) * 18, 2 + (index % 2), 0xfef3c7, 0.65);
      this.tweens.add({ targets: star, alpha: 0.2, duration: 900 + index * 70, yoyo: true, repeat: -1 });
    }

    this.statusText = this.add.text(width / 2, 22, "숫자 숲의 기운을 모으는 중", {
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      color: "#fef3c7",
      fontStyle: "bold",
    }).setOrigin(0.5, 0);

    this.unsubscribers.push(
      gameEventBridge.on("sync", (state) => this.syncState(state)),
      gameEventBridge.on("attack", (payload) => this.playAttack(payload.playerIndex, payload.kind)),
      gameEventBridge.on("special", (payload) => this.playSpecial(payload.coop, payload.skillName)),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribers.forEach((unsubscribe) => unsubscribe());
      this.unsubscribers = [];
    });
  }

  private buildPlayer(index: number, state: CoopBattleState) {
    const { width, height } = this.scale;
    const x = state.players.length === 1 ? width * 0.2 : width * (index === 0 ? 0.14 : 0.34);
    const y = height * 0.66;
    const color = index === 0 ? 0x38bdf8 : 0xfb7185;
    const aura = this.add.circle(0, 8, 48, color, 0.14).setStrokeStyle(3, color, 0.5);
    const cape = this.add.triangle(-12, 24, 0, 0, 20, 35, -12, 52, index === 0 ? 0x1d4ed8 : 0xbe123c, 0.9);
    const body = this.add.circle(0, 20, 28, color, 1).setStrokeStyle(4, 0xffffff, 0.9);
    const head = this.add.circle(0, -17, 23, 0xffedd5, 1).setStrokeStyle(3, color, 1);
    const eye1 = this.add.circle(-8, -19, 3, 0x172554);
    const eye2 = this.add.circle(8, -19, 3, 0x172554);
    const smile = this.add.arc(0, -10, 9, 20, 160, false, 0x172554).setStrokeStyle(2, 0x172554);
    const weapon = index === 0
      ? this.add.rectangle(34, 8, 8, 58, 0xfef08a).setRotation(0.45)
      : this.add.circle(33, 5, 15, 0xf97316, 0.9).setStrokeStyle(4, 0xfef3c7, 1);
    const container = this.add.container(x, y, [aura, cape, body, head, eye1, eye2, smile, weapon]);
    const name = this.add.text(x, y + 65, state.players[index].displayName, {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#0f172a",
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);
    this.playerVisuals[index] = { body: container, name, aura };
  }

  private buildBoss(state: CoopBattleState) {
    const { width, height } = this.scale;
    const x = width * 0.76;
    const y = height * 0.62;
    const shadow = this.add.ellipse(0, 66, 150, 30, 0x020617, 0.45);
    this.bossBody = this.add.circle(0, 0, state.players.length === 2 ? 68 : 58, 0xa3e635, 1).setStrokeStyle(6, 0xecfccb, 0.9);
    const bump1 = this.add.circle(-38, -42, 35, 0x84cc16, 1);
    const bump2 = this.add.circle(35, -38, 32, 0x65a30d, 1);
    const eye1 = this.add.circle(-23, -5, 8, 0x172554);
    const eye2 = this.add.circle(24, -5, 8, 0x172554);
    const mouth = this.add.arc(0, 19, 24, 15, 165, false, 0x172554).setStrokeStyle(5, 0x172554);
    this.boss = this.add.container(x, y, [shadow, bump1, bump2, this.bossBody, eye1, eye2, mouth]);
    this.bossName = this.add.text(x, y + 94, state.players.length === 2 ? "쌍둥이 숫자 슬라임" : "숫자 슬라임", {
      fontFamily: "Arial, sans-serif",
      fontSize: "17px",
      color: "#ecfccb",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.boss, scaleY: 0.94, y: y + 6, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private syncState(state: CoopBattleState) {
    this.shakeIntensity = state.shakeIntensity;
    state.players.forEach((_, index) => {
      if (!this.playerVisuals[index]) this.buildPlayer(index, state);
      const active = index === state.activePlayerIndex;
      this.playerVisuals[index].aura.setAlpha(active ? 0.4 : 0.12);
      this.playerVisuals[index].name.setBackgroundColor(active ? "#0369a1" : "#0f172a");
    });
    if (!this.boss) this.buildBoss(state);
    this.statusText?.setText(state.message);
    if (state.bossHp === 0) this.boss?.setAlpha(0.15);
  }

  private playAttack(playerIndex: number, kind: "strong" | "magic") {
    const visual = this.playerVisuals[playerIndex];
    if (!visual || !this.boss || !this.bossBody) return;
    const originalX = visual.body.x;
    const color = kind === "strong" ? 0x38bdf8 : 0xfb7185;
    this.tweens.add({
      targets: visual.body,
      x: originalX + 120,
      duration: 140,
      yoyo: true,
      ease: "Power2",
      onYoyo: () => {
        if (this.shakeIntensity > 0) this.cameras.main.shake(120, this.shakeIntensity === 1 ? 0.003 : 0.006);
        this.bossBody?.setFillStyle(0xffffff);
        this.time.delayedCall(80, () => this.bossBody?.setFillStyle(0xa3e635));
        const hit = this.add.circle(this.boss!.x - 45, this.boss!.y, 14, color, 0.9);
        this.tweens.add({ targets: hit, scale: 4, alpha: 0, duration: 260, onComplete: () => hit.destroy() });
        const damage = this.add.text(this.boss!.x, this.boss!.y - 90, kind === "strong" ? "24" : "34", {
          fontSize: "32px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#172554",
          strokeThickness: 6,
        }).setOrigin(0.5);
        this.tweens.add({ targets: damage, y: damage.y - 45, alpha: 0, duration: 700, onComplete: () => damage.destroy() });
      },
    });
  }

  private playSpecial(coop: boolean, skillName: string) {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88).setDepth(20);
    const cutins = this.playerVisuals.map((visual, index) => {
      const clone = this.add.circle(index === 0 ? width * 0.28 : width * 0.72, height * 0.46, 58, index === 0 ? 0x0ea5e9 : 0xf43f5e, 1)
        .setStrokeStyle(7, 0xffffff, 1)
        .setDepth(22)
        .setScale(0);
      this.tweens.add({ targets: clone, scale: 1, duration: 280, delay: index * 150, ease: "Back.easeOut" });
      visual.body.setDepth(23);
      return clone;
    });
    const title = this.add.text(width / 2, height * 0.18, skillName, {
      fontFamily: "Arial, sans-serif",
      fontSize: coop ? "34px" : "30px",
      fontStyle: "bold",
      color: "#fef08a",
      stroke: "#7c2d12",
      strokeThickness: 8,
      align: "center",
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5).setDepth(24).setScale(0.7);
    this.tweens.add({ targets: title, scale: 1.08, duration: 450, yoyo: true, repeat: 1 });

    for (let index = 0; index < 18; index += 1) {
      const bolt = this.add.rectangle(width * 0.5, height * 0.55, 8, 90, index % 2 === 0 ? 0x38bdf8 : 0xfb7185, 0.9)
        .setRotation((index / 18) * Math.PI * 2)
        .setDepth(23);
      this.tweens.add({ targets: bolt, x: this.boss?.x ?? width * 0.76, y: this.boss?.y ?? height * 0.62, alpha: 0, duration: 700, delay: 550 + index * 35 });
    }

    this.time.delayedCall(1150, () => {
      if (this.shakeIntensity > 0) this.cameras.main.shake(650, this.shakeIntensity === 1 ? 0.008 : 0.018);
      const explosion = this.add.circle(this.boss?.x ?? width * 0.76, this.boss?.y ?? height * 0.62, 30, 0xfef08a, 1).setDepth(26);
      this.tweens.add({ targets: explosion, scale: 7, alpha: 0, duration: 750 });
      this.boss?.setAlpha(0.1);
    });
    this.time.delayedCall(2100, () => {
      overlay.destroy();
      cutins.forEach((cutin) => cutin.destroy());
      title.destroy();
      gameEventBridge.emit("specialComplete", undefined);
    });
  }
}

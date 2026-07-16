import * as Phaser from "phaser";
import { gameEventBridge, type ExplorationInteraction } from "@/game/bridge/gameEventBridge";
import type { CoopBattleState } from "@/types/battle";
import { getExplorationMap } from "@/game/maps/mapRegistry";
import type { ExplorationMapDefinition, ExplorationRect, ExplorationStageId } from "@/types/exploration";
import { movementDelta } from "@/game/systems/MovementSystem";
import { resolveBattleFormation } from "@/game/systems/BattleFormation";

type Direction = "left" | "right" | "up" | "down";

export const ADVENTURE_WORLD_WIDTH = 928;
export const ADVENTURE_WORLD_HEIGHT = 512;
const MOVEMENT_STEP_PX = 10;
const BRIDGE_PASSAGE_PADDING = 24;
const PORTAL_REACH_RADIUS = 100;

type MovementPoint = { x: number; y: number };
type MovementBounds = { minX: number; maxX: number; minY: number; maxY: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function pointInExpandedRect(point: MovementPoint, rect: ExplorationRect, padding = 0) {
  return point.x >= rect.x - padding && point.x <= rect.x + rect.width + padding && point.y >= rect.y - padding && point.y <= rect.y + rect.height + padding;
}

export function resolveAxisSeparatedMovement(
  start: MovementPoint,
  delta: MovementPoint,
  bounds: MovementBounds,
  isBlocked: (x: number, y: number) => boolean,
  maxStep = MOVEMENT_STEP_PX,
) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y)) / maxStep));
  const stepX = delta.x / steps;
  const stepY = delta.y / steps;
  let x = start.x;
  let y = start.y;

  for (let index = 0; index < steps; index += 1) {
    const nextX = clamp(x + stepX, bounds.minX, bounds.maxX);
    if (!isBlocked(nextX, y)) x = nextX;
    const nextY = clamp(y + stepY, bounds.minY, bounds.maxY);
    if (!isBlocked(x, nextY)) y = nextY;
  }

  return { x, y, moved: x !== start.x || y !== start.y, steps };
}

type PlayerVisual = {
  sprite: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  aura: Phaser.GameObjects.Arc;
};

export class NumberForestScene extends Phaser.Scene {
  private readonly map: ExplorationMapDefinition;
  private players: PlayerVisual[] = [];
  private boss?: Phaser.GameObjects.Image;
  private bossName?: Phaser.GameObjects.Text;
  private bossBattleAura?: Phaser.GameObjects.Ellipse;
  private bossPhaseText?: Phaser.GameObjects.Text;
  private lastBossPhase?: "shield" | "open" | "final" | "friend";
  private statusText?: Phaser.GameObjects.Text;
  private counterText?: Phaser.GameObjects.Text;
  private portal?: Phaser.GameObjects.Container;
  private portalRing?: Phaser.GameObjects.Ellipse;
  private chest?: Phaser.GameObjects.Image;
  private tokens: Phaser.GameObjects.Container[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"left" | "right" | "up" | "down", Phaser.Input.Keyboard.Key>;
  private dashKey?: Phaser.Input.Keyboard.Key;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private touchDirections = new Set<Direction>();
  private unsubscribers: Array<() => void> = [];
  private currentState?: CoopBattleState;
  private collected = 0;
  private explorationComplete = false;
  private explorationActive = true;
  private shakeIntensity: 0 | 1 | 2 = 1;
  private reducedMotion = false;
  private bridgeCrossed = false;
  private secretDiscovered = false;
  private npcTalked = false;
  private chestOpened = false;
  private nearbyInteractionId: string | null = null;
  private metNpcIds = new Set<string>();
  private disposed = false;
  private dashUntil = 0;
  private dashCooldownUntil = 0;
  private secretPathObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];
  private specialActive = false;
  private specialObjects: Phaser.GameObjects.GameObject[] = [];
  private specialTimers: Phaser.Time.TimerEvent[] = [];
  private viewport = { width: ADVENTURE_WORLD_WIDTH, height: ADVENTURE_WORLD_HEIGHT };

  constructor(stageId: ExplorationStageId = "number-forest") {
    super(`AdventureScene-${stageId}`);
    this.map = getExplorationMap(stageId);
  }

  preload() {
    this.load.image("stage-background", this.map.visuals.backgroundAsset);
    this.load.image("hero1", this.map.visuals.heroAsset);
    this.load.image("hero2", this.map.visuals.friendAsset);
    this.load.image("guardian", this.map.boss.asset);
    this.load.image("treasure-chest", "/game-assets/superpowers-rpg/treasure-chest.png");
    this.load.image("ninja-adventure-tiles", this.map.visuals.tilesetAsset);
    this.load.tilemapTiledJSON("stage-tilemap", this.map.visuals.tiledMapAsset);
  }

  create() {
    this.disposed = false;
    const { width, height } = this.scale;
    this.viewport = {
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
    };
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.cameras.main.roundPixels = true;
    this.cameras.main.setBounds(0, 0, ADVENTURE_WORLD_WIDTH, ADVENTURE_WORLD_HEIGHT);
    this.add.image(width / 2, height / 2, "stage-background").setDisplaySize(width, height).setAlpha(0.28);
    this.add.rectangle(width / 2, height / 2, width, height, this.map.visuals.overlayColor, 0.08);

    this.createEnvironment();

    this.statusText = this.add.text(ADVENTURE_WORLD_WIDTH / 2, 18, "", {
      fontFamily: "Malgun Gothic, Arial, sans-serif",
      fontSize: "16px",
      color: "#fff4b5",
      fontStyle: "bold",
      backgroundColor: "#071b2bdd",
      padding: { x: 9, y: 6 },
      align: "center",
      wordWrap: { width: 420 },
    }).setOrigin(0.5, 0).setDepth(30).setScrollFactor(0);
    this.counterText = this.add.text(width - 18, 18, `${this.map.collectionLabel} 0 / ${this.map.collectibles.length}`, {
      fontFamily: "Malgun Gothic, Arial, sans-serif",
      fontSize: "16px",
      color: "#14233b",
      fontStyle: "bold",
      backgroundColor: "#ffd75d",
      padding: { x: 11, y: 8 },
    }).setOrigin(1, 0).setDepth(30).setScrollFactor(0);

    this.createTokens();
    this.createChest();
    this.createNpcs();
    this.createPortal();
    this.createBoss();

    this.cursors = this.input.keyboard?.createCursorKeys();
    if (this.input.keyboard) {
      this.wasd = {
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      };
      this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    this.unsubscribers.push(
      gameEventBridge.on("sync", (state) => this.syncState(state)),
      gameEventBridge.on("attack", (payload) => this.playAttack(payload.playerIndex, payload.kind)),
      gameEventBridge.on("bossAttack", (payload) => this.playBossAttack(payload.targetPlayerIndex, payload.outcome, payload.attackName)),
      gameEventBridge.on("special", (payload) => this.playSpecial(payload.coop, payload.skillName)),
      gameEventBridge.on("move", ({ direction, active }) => active ? this.touchDirections.add(direction) : this.touchDirections.delete(direction)),
      gameEventBridge.on("dash", () => this.activateDash(this.time.now)),
      gameEventBridge.on("interact", ({ npcId }) => this.activateInteraction(npcId)),
      gameEventBridge.on("viewportChanged", (viewport) => {
        this.viewport = viewport;
        if (!this.explorationActive) this.applyBattleFormation(false);
      }),
    );

    const cleanup = () => {
      if (this.disposed) return;
      this.disposed = true;
      this.unsubscribers.forEach((unsubscribe) => unsubscribe());
      this.unsubscribers = [];
      this.touchDirections.clear();
      this.cameras?.main?.stopFollow();
      this.time?.removeAllEvents();
      this.tweens?.killAll();
      this.cancelSpecialEffect();
      gameEventBridge.emit("interactionAvailable", null);
      this.statusText = undefined;
      this.counterText = undefined;
      this.bossBattleAura = undefined;
      this.bossPhaseText = undefined;
      this.players = [];
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    gameEventBridge.emit("sceneReady", undefined);
  }

  update(time: number, delta: number) {
    if (!this.explorationActive || !this.players[0]) return;
    const left = this.cursors?.left.isDown || this.wasd?.left.isDown || this.touchDirections.has("left");
    const right = this.cursors?.right.isDown || this.wasd?.right.isDown || this.touchDirections.has("right");
    const up = this.cursors?.up.isDown || this.wasd?.up.isDown || this.touchDirections.has("up");
    const down = this.cursors?.down.isDown || this.wasd?.down.isDown || this.touchDirections.has("down");
    const dx = Number(right) - Number(left);
    const dy = Number(down) - Number(up);
    if (this.dashKey && Phaser.Input.Keyboard.JustDown(this.dashKey)) this.activateDash(time);
    this.checkInteractionProximity();
    if (
      this.nearbyInteractionId &&
      ((this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) ||
        (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)))
    ) {
      this.activateInteraction(this.nearbyInteractionId);
    }
    if (dx === 0 && dy === 0) return;
    const movement = movementDelta(dx, dy, delta);
    const dashMultiplier = time < this.dashUntil ? 2.15 : 1;
    this.moveBy(movement.x * dashMultiplier, movement.y * dashMultiplier);
  }

  private activateDash(now: number) {
    if (!this.explorationActive || now < this.dashCooldownUntil) return;
    this.dashUntil = now + 260;
    this.dashCooldownUntil = now + 950;
    this.safeSetText(this.statusText, "짧은 대시! 장애물 앞에서는 방향을 바꿔 보세요.");
  }

  private createEnvironment() {
    const tilemap = this.make.tilemap({ key: "stage-tilemap" });
    if (tilemap.widthInPixels !== ADVENTURE_WORLD_WIDTH || tilemap.heightInPixels !== ADVENTURE_WORLD_HEIGHT) {
      throw new Error(`Tiled map must be ${ADVENTURE_WORLD_WIDTH}x${ADVENTURE_WORLD_HEIGHT}, received ${tilemap.widthInPixels}x${tilemap.heightInPixels}.`);
    }
    const tileset = tilemap.addTilesetImage(this.map.visuals.tilesetName, "ninja-adventure-tiles", this.map.visuals.tileSize, this.map.visuals.tileSize, 0, 0);
    if (!tileset) throw new Error(`Tiled tileset '${this.map.visuals.tilesetName}' could not be attached.`);

    (["ground", "paths", "water", "decor"] as const).forEach((layerName, index) => {
      const layer = tilemap.createLayer(layerName, tileset, 0, 0);
      if (!layer) throw new Error(`Tiled layer '${layerName}' is missing.`);
      layer.setDepth(index + 1).setCullPadding(2, 2);
    });

    const bridge = this.map.bridge;
    this.add.text(bridge.x + bridge.width / 2, bridge.y - 12, bridge.label, { fontSize: "12px", color: "#fff0a8", backgroundColor: "#08243ddd", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(11);

    const secret = this.map.secretArea;
    const secretGlow = this.add.rectangle(secret.x + secret.width / 2, secret.y + secret.height / 2, secret.width, secret.height, 0x9fe870, 0.08)
      .setStrokeStyle(2, 0xc9ffa8, 0.16)
      .setDepth(4)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.activateInteraction(secret.id));
    const secretLabel = this.add.text(secret.x + secret.width / 2, secret.y + secret.height / 2, "?", { fontSize: "20px", color: "#d9ffc3", fontStyle: "bold" }).setOrigin(0.5).setAlpha(0.3).setDepth(6);
    this.secretPathObjects = [secretGlow, secretLabel];
  }

  private createTokens() {
    const points = this.map.collectibles;
    this.tokens = points.map((point, index) => {
      const glow = this.add.circle(0, 0, 29, index === 1 ? 0xffca4b : 0x55dff5, 0.22).setStrokeStyle(2, 0xffffff, 0.7);
      const gem = this.add.star(0, 0, 4, 10, 20, index === 1 ? 0xffca4b : 0x64e7f7, 1).setRotation(Math.PI / 4);
      const label = this.add.text(0, 0, point.value, { fontSize: "17px", color: "#092237", fontStyle: "bold" }).setOrigin(0.5);
      const token = this.add.container(point.x, point.y, [glow, gem, label]).setDepth(10 + index).setData("collectibleId", point.id).setVisible(false).setActive(false);
      return token;
    });
  }

  private createNpcs() {
    this.map.npcs.forEach((npc) => {
      this.add.circle(npc.x, npc.y + 22, 30, 0xffca4b, 0.18).setStrokeStyle(2, 0xffe89a, 0.8).setDepth(14);
      this.add.image(npc.x, npc.y, "hero2")
        .setDisplaySize(151, 100)
        .setDepth(16)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.activateInteraction(npc.id));
      this.add.text(npc.x, npc.y + 48, npc.name, { fontFamily: "Malgun Gothic, Arial, sans-serif", fontSize: "12px", color: "#fff7c4", fontStyle: "bold", backgroundColor: "#573315dd", padding: { x: 7, y: 3 } }).setOrigin(0.5).setDepth(20);
    });
  }

  private createChest() {
    this.chest = this.add.image(this.map.chest.x, this.map.chest.y, "treasure-chest")
      .setDisplaySize(127, 88)
      .setDepth(Math.round(this.map.chest.y))
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.activateInteraction(this.map.chest.id));
    this.add.text(this.map.chest.x, this.map.chest.y + 48, this.map.chest.rewardLabel, {
      fontFamily: "Malgun Gothic, Arial, sans-serif",
      fontSize: "11px",
      color: "#fff4b5",
      fontStyle: "bold",
      backgroundColor: "#071b2bdd",
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(Math.round(this.map.chest.y) + 1);
  }

  private openChest() {
    this.chestOpened = true;
    this.nearbyInteractionId = null;
    this.chest?.setTint(0xffef9a);
    if (!this.reducedMotion && this.chest) {
      this.tweens.add({ targets: this.chest, y: this.chest.y - 10, scale: 1.08, duration: 180, yoyo: true });
    }
    this.tokens.forEach((token, index) => {
      token.setVisible(true).setActive(true);
      if (!this.reducedMotion) this.tweens.add({ targets: token, y: token.y - 9, duration: 750 + index * 100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
    this.safeSetText(this.statusText, `${this.map.chest.rewardLabel} 획득! 이제 ${this.map.collectionLabel}을 모아 보세요.`);
    gameEventBridge.emit("interactionAvailable", null);
    this.emitProgress();
  }

  private checkInteractionProximity() {
    const hero = this.players[0];
    if (!hero) return;
    const chestNearby = this.npcTalked && !this.chestOpened && Phaser.Math.Distance.Between(hero.sprite.x, hero.sprite.y, this.map.chest.x, this.map.chest.y) <= 105;
    const npc = this.map.npcs.find((item) => !this.metNpcIds.has(item.id) && Phaser.Math.Distance.Between(hero.sprite.x, hero.sprite.y, item.x, item.y) <= 115);
    const secretNearby = !this.secretDiscovered && pointInExpandedRect(
      { x: hero.sprite.x, y: hero.sprite.y },
      this.map.secretArea,
      58,
    );
    const bossReady = this.npcTalked && this.chestOpened && this.collected >= this.tokens.length && this.bridgeCrossed;
    const bossNearby = bossReady && Phaser.Math.Distance.Between(hero.sprite.x, hero.sprite.y, this.map.portal.x, this.map.portal.y) <= PORTAL_REACH_RADIUS + 35;
    let interaction: ExplorationInteraction | null = null;

    if (chestNearby) {
      interaction = this.buildInteraction(
        this.map.chest.id,
        "chest",
        this.map.chest.label,
        "보물 상자를 눌러 수집물을 깨워요",
        this.map.chest.x,
        this.map.chest.y,
      );
    } else if (npc) {
      interaction = this.buildInteraction(
        npc.id,
        "talk",
        `${npc.name}에게 말 걸기`,
        "화면 버튼 또는 E·Enter 키",
        npc.x,
        npc.y,
      );
    } else if (secretNearby) {
      interaction = this.buildInteraction(
        this.map.secretArea.id,
        "secret",
        `${this.map.secretArea.rewardLabel} 조사하기`,
        "수상한 빛을 직접 눌러 확인해요",
        this.map.secretArea.x + this.map.secretArea.width / 2,
        this.map.secretArea.y + this.map.secretArea.height / 2,
      );
    } else if (bossNearby) {
      interaction = this.buildInteraction(
        this.map.boss.id,
        "boss",
        `${this.map.boss.name}에게 도전하기`,
        "누르면 문제와 전투가 같은 화면에서 시작돼요",
        this.map.boss.x,
        this.map.boss.y,
      );
    }
    const nextId = interaction?.npcId ?? null;
    if (nextId === this.nearbyInteractionId) return;
    this.nearbyInteractionId = nextId;
    gameEventBridge.emit("interactionAvailable", interaction);
  }

  private buildInteraction(
    npcId: string,
    kind: ExplorationInteraction["kind"],
    label: string,
    hint: string,
    x: number,
    y: number,
  ): ExplorationInteraction {
    return {
      npcId,
      kind,
      label,
      hint,
      xPercent: clamp((x / ADVENTURE_WORLD_WIDTH) * 100, 24, 76),
      yPercent: clamp(((y - 62) / ADVENTURE_WORLD_HEIGHT) * 100, 18, 78),
    };
  }

  private activateInteraction(npcId: string) {
    if (npcId !== this.nearbyInteractionId) return;
    if (npcId === this.map.chest.id && !this.chestOpened) {
      this.openChest();
      return;
    }
    if (npcId === this.map.secretArea.id && !this.secretDiscovered) {
      this.secretDiscovered = true;
      this.nearbyInteractionId = null;
      this.secretPathObjects.forEach((object) => object.setAlpha(1));
      this.safeSetText(this.statusText, `${this.map.secretArea.rewardLabel} 발견! 숨은 보상을 기록했어요.`);
      gameEventBridge.emit("interactionAvailable", null);
      this.emitProgress();
      return;
    }
    if (npcId === this.map.boss.id) {
      this.finishExploration();
      return;
    }
    const npc = this.map.npcs.find((item) => item.id === npcId);
    if (!npc || this.metNpcIds.has(npcId)) return;
    this.metNpcIds.add(npcId);
    this.npcTalked = this.map.npcs.filter((item) => item.required).every((item) => this.metNpcIds.has(item.id));
    this.nearbyInteractionId = null;
    this.safeSetText(this.statusText, npc.prompt);
    gameEventBridge.emit("interactionAvailable", null);
    this.emitProgress();
  }

  private createPortal() {
    const ring = this.add.ellipse(0, 0, 84, 112, 0x36d9f4, 0.13).setStrokeStyle(6, 0x8ceeff, 0.85);
    this.portalRing = ring;
    const core = this.add.ellipse(0, 0, 55, 86, 0x07253c, 0.78);
    const label = this.add.text(0, 72, "BOSS GATE", { fontSize: "10px", color: "#8ceeff", fontStyle: "bold" }).setOrigin(0.5);
    this.portal = this.add.container(this.map.portal.x, this.map.portal.y, [ring, core, label]).setDepth(5).setAlpha(0.38);
    if (!this.reducedMotion) this.tweens.add({ targets: ring, scaleX: 0.86, alpha: 0.45, duration: 900, yoyo: true, repeat: -1 });
  }

  private createBoss() {
    this.boss = this.add.image(this.map.boss.x, this.map.boss.y, "guardian")
      .setDisplaySize(this.map.boss.exploreSize.width, this.map.boss.exploreSize.height)
      .setDepth(8)
      .setAlpha(0.72)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.activateInteraction(this.map.boss.id));
    this.bossName = this.add.text(this.map.boss.x - 10, this.map.boss.y + this.map.boss.exploreSize.height / 2 + 15, `${"◆".repeat(this.map.boss.threatTier)} ${this.map.boss.name}`, {
      fontFamily: "Malgun Gothic, Arial, sans-serif",
      fontSize: "13px",
      color: "#dff8ff",
      backgroundColor: "#071b2bdd",
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(12);
  }

  private buildPlayer(index: number, state: CoopBattleState) {
    const x = this.map.playerSpawn.x - index * 34;
    const y = this.map.playerSpawn.y + index * 42;
    const aura = this.add.circle(x, y + 24, 36, index === 0 ? 0x45dcff : 0xff5e9f, 0.18).setDepth(14);
    const sprite = this.add.image(x, y, index === 0 ? "hero1" : "hero2").setDisplaySize(index === 0 ? 240 : 151, index === 0 ? 104 : 100).setDepth(16 + index);
    const name = this.add.text(x, y + 54, state.players[index].displayName, {
      fontFamily: "Malgun Gothic, Arial, sans-serif",
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: index === 0 ? "#087aa1dd" : "#a62b61dd",
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5).setDepth(20);
    this.players[index] = { sprite, name, aura };
    if (index === 0) this.cameras.main.startFollow(sprite, true, 0.12, 0.12);
  }

  private syncState(state: CoopBattleState) {
    if (this.disposed || !this.sys.isActive()) return;
    this.currentState = state;
    this.shakeIntensity = state.shakeIntensity;
    state.players.forEach((_, index) => {
      if (!this.players[index]) this.buildPlayer(index, state);
    });
    if (this.players[0] && this.explorationActive) this.emitProgress();
    if (state.battlePhase !== "INTRO" && this.explorationActive) this.enterBattleLayout();
    if (!this.explorationActive) {
      this.safeSetText(this.statusText, state.message);
      this.safeSetText(this.counterText, `BOSS HP ${state.bossHp}`);
      this.updateBossPhase(state);
    }
    if (state.bossHp === 0) this.boss?.setAlpha(0.12);
  }

  private safeSetText(target: Phaser.GameObjects.Text | undefined, value: string) {
    if (this.disposed || !target?.active || !target.scene || !this.sys.isActive()) return;
    if (target.text === value) return;
    target.setText(value);
  }

  private moveBy(dx: number, dy: number) {
    const hero = this.players[0];
    if (!hero || !this.explorationActive) return;
    const startX = hero.sprite.x;
    const movement = resolveAxisSeparatedMovement(
      { x: startX, y: hero.sprite.y },
      { x: dx, y: dy },
      { minX: 58, maxX: ADVENTURE_WORLD_WIDTH - 105, minY: 205, maxY: ADVENTURE_WORLD_HEIGHT - 88 },
      (x, y) => this.isBlocked(x, y),
    );
    if (!movement.moved) {
      this.safeSetText(this.statusText, "장애물이 길을 막고 있어요. 다른 길이나 다리를 찾아보세요");
      return;
    }
    hero.sprite.x = movement.x;
    hero.sprite.y = movement.y;
    if (movement.x !== startX) hero.sprite.setFlipX(movement.x < startX);
    hero.name.setPosition(hero.sprite.x, hero.sprite.y + 54);
    hero.aura.setPosition(hero.sprite.x, hero.sprite.y + 24);
    hero.sprite.setDepth(Math.round(hero.sprite.y));
    this.followCompanion();
    this.collectNearbyTokens();
    this.checkExplorationMilestones();
    this.checkInteractionProximity();
  }

  private isBlocked(x: number, y: number) {
    return this.map.obstacles.some((obstacle) => {
      if (!pointInExpandedRect({ x, y }, obstacle, 12)) return false;
      if (obstacle.kind === "water" && this.isInBridgePassage(x, y)) return false;
      return true;
    });
  }

  private isInBridgePassage(x: number, y: number) {
    return pointInExpandedRect({ x, y }, this.map.bridge, BRIDGE_PASSAGE_PADDING);
  }

  private checkExplorationMilestones() {
    const hero = this.players[0];
    if (!hero) return;
    if (!this.bridgeCrossed && this.isInBridgePassage(hero.sprite.x, hero.sprite.y)) {
      this.bridgeCrossed = true;
      this.safeSetText(this.statusText, `${this.map.bridge.label} 통과 완료!`);
      this.emitProgress();
    }
  }

  private emitProgress() {
    const hero = this.players[0];
    const requiredNpc = this.map.npcs.find((item) => item.required && !this.metNpcIds.has(item.id));
    const activeToken = this.tokens.find((token) => token.active);
    const target = requiredNpc ?? (!this.chestOpened ? this.map.chest : activeToken ? { x: activeToken.x, y: activeToken.y } : !this.bridgeCrossed ? { x: this.map.bridge.x + this.map.bridge.width / 2, y: this.map.bridge.y + this.map.bridge.height / 2 } : this.map.portal);
    const dx = hero ? target.x - hero.sprite.x : 1;
    const dy = hero ? target.y - hero.sprite.y : 0;
    const nextDirection = Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? "오른쪽" : "왼쪽") : (dy >= 0 ? "아래쪽" : "위쪽");
    gameEventBridge.emit("explorationProgress", {
      collected: this.collected,
      total: this.tokens.length,
      bridgeCrossed: this.bridgeCrossed,
      secretDiscovered: this.secretDiscovered,
      npcTalked: this.npcTalked,
      chestOpened: this.chestOpened,
      nextDirection: this.explorationComplete ? "도착" : nextDirection,
    });
  }

  private followCompanion() {
    const hero = this.players[0];
    const friend = this.players[1];
    if (!hero || !friend) return;
    const targetX = hero.sprite.x - 65;
    const targetY = hero.sprite.y + 38;
    friend.sprite.x = Phaser.Math.Linear(friend.sprite.x, targetX, 0.08);
    friend.sprite.y = Phaser.Math.Linear(friend.sprite.y, targetY, 0.08);
    friend.name.setPosition(friend.sprite.x, friend.sprite.y + 54);
    friend.aura.setPosition(friend.sprite.x, friend.sprite.y + 24);
    friend.sprite.setDepth(Math.round(friend.sprite.y));
  }

  private collectNearbyTokens() {
    const hero = this.players[0];
    if (!hero) return;
    this.tokens.forEach((token) => {
      if (!token.active || Phaser.Math.Distance.Between(hero.sprite.x, hero.sprite.y, token.x, token.y) > 82) return;
      if (this.map.stageId !== "number-forest" && token !== this.tokens[this.collected]) {
        this.safeSetText(this.statusText, this.map.stageId === "word-island" ? "글자 룬의 순서를 살펴 단어를 완성해 보세요." : "처음 → 가운데 → 끝 순서로 이야기 조각을 모아 보세요.");
        return;
      }
      token.setActive(false);
      this.collected += 1;
      this.tweens.killTweensOf(token);
      if (this.reducedMotion) token.setVisible(false);
      else this.tweens.add({ targets: token, y: token.y - 55, scale: 1.6, alpha: 0, duration: 320, onComplete: () => token.setVisible(false) });
      this.safeSetText(this.counterText, `${this.map.collectionLabel} ${this.collected} / ${this.tokens.length}`);
      this.safeSetText(this.statusText, this.collected === this.tokens.length ? "포털이 열렸어요! 수호자에게 이동하세요" : `${this.map.collectionLabel} ${this.collected}개 발견!`);
      this.emitProgress();
      if (this.collected === this.tokens.length) this.portal?.setAlpha(1);
    });
  }

  private finishExploration() {
    if (this.explorationComplete || !this.npcTalked || !this.chestOpened || this.collected < this.tokens.length || !this.bridgeCrossed) return;
    this.explorationComplete = true;
    this.nearbyInteractionId = null;
    this.safeSetText(this.statusText, `${this.map.boss.name} 앞에 도착! 학습 작전을 시작할 수 있어요.`);
    this.safeSetText(this.counterText, "탐험 완료");
    if (!this.reducedMotion) this.cameras.main.flash(320, 105, 220, 245, false);
    gameEventBridge.emit("interactionAvailable", null);
    gameEventBridge.emit("explorationComplete", undefined);
  }

  private enterBattleLayout() {
    this.explorationActive = false;
    this.nearbyInteractionId = null;
    gameEventBridge.emit("interactionAvailable", null);
    this.touchDirections.clear();
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(ADVENTURE_WORLD_WIDTH / 2, ADVENTURE_WORLD_HEIGHT / 2);
    this.tokens.forEach((token) => {
      this.tweens.killTweensOf(token);
      token.setVisible(false).setActive(false);
    });
    if (this.portalRing) this.tweens.killTweensOf(this.portalRing);
    this.portal?.setVisible(false);
    this.bossBattleAura = this.add.ellipse(0, 0, 1, 1, 0x67e8f9, 0.08).setStrokeStyle(4, 0x67e8f9, 0.62).setDepth(7);
    this.bossPhaseText = this.add.text(0, 0, "보호막 해독 중", {
      fontFamily: "Malgun Gothic, Arial, sans-serif",
      fontSize: "14px",
      color: "#dffbff",
      fontStyle: "bold",
      backgroundColor: "#08243ddd",
      padding: { x: 9, y: 5 },
    }).setOrigin(0.5).setDepth(22);
    this.applyBattleFormation(!this.reducedMotion);
    this.boss?.setAlpha(1);
  }

  private applyBattleFormation(animate: boolean) {
    const formation = resolveBattleFormation(this.map.battleSafeArea, this.map.boss.threatTier, this.viewport);
    this.players.forEach((player, index) => {
      const target = formation.players[Math.min(index, 1)];
      player.sprite.setDisplaySize(target.width, target.height);
      player.aura.setDisplaySize(formation.compactLandscape ? 52 : 72, formation.compactLandscape ? 52 : 72);
      if (animate) this.tweens.add({ targets: [player.sprite, player.aura], x: target.x, y: target.y, duration: 420, ease: "Power2" });
      else {
        player.sprite.setPosition(target.x, target.y);
        player.aura.setPosition(target.x, target.y);
      }
      player.name.setPosition(target.x, target.y + target.height / 2 + 8);
    });

    const boss = formation.boss;
    this.boss?.setPosition(boss.x, boss.y).setDisplaySize(boss.width, boss.height);
    this.bossBattleAura?.setPosition(boss.x, boss.y).setDisplaySize(boss.width * 1.28, boss.height * 1.22);
    this.bossPhaseText?.setPosition(boss.x, Math.max(this.map.battleSafeArea.y + 16, boss.y - boss.height / 2 - 24));
    this.bossName?.setPosition(boss.x, boss.y + boss.height / 2 + 18);
  }

  private updateBossPhase(state: CoopBattleState) {
    const hpRatio = state.bossMaxHp > 0 ? state.bossHp / state.bossMaxHp : 0;
    const phase = state.bossHp === 0 ? "friend" : state.bossShield > 0 ? "shield" : hpRatio > 0.45 ? "open" : "final";
    const phaseVisuals = {
      shield: { color: 0x67e8f9, label: "보호막 해독 중" },
      open: { color: 0xfacc15, label: "약점이 드러났어" },
      final: { color: 0xfb7185, label: "마지막 결계" },
      friend: { color: 0x86efac, label: "혼란이 풀렸어" },
    } as const;
    const visual = phaseVisuals[phase];
    if (phase === this.lastBossPhase) return;
    this.lastBossPhase = phase;
    this.bossBattleAura?.setFillStyle(visual.color, phase === "friend" ? 0.04 : 0.1).setStrokeStyle(4, visual.color, phase === "friend" ? 0.25 : 0.72);
    this.safeSetText(this.bossPhaseText, visual.label);
    if (!this.reducedMotion && this.bossBattleAura?.active) {
      this.bossBattleAura.setScale(1.18).setAlpha(1);
      this.tweens.add({ targets: this.bossBattleAura, scale: 1, alpha: phase === "friend" ? 0.35 : 0.78, duration: 420, ease: "Cubic.easeOut" });
    }
  }

  private playBossAttack(targetPlayerIndex: number, outcome: "telegraph" | "dodge" | "hit", attackName: string) {
    const player = this.players[targetPlayerIndex];
    if (!player?.sprite?.active || !this.boss?.active || this.specialActive) return;
    const boss = this.boss;
    const showCallout = (text: string, color: string, overBoss = false) => {
      const anchor = overBoss ? boss : player.sprite;
      const callout = this.add.text(anchor.x, anchor.y - anchor.displayHeight / 2 - 24, text, {
        fontFamily: "Malgun Gothic, Arial, sans-serif",
        fontSize: "20px",
        color,
        fontStyle: "bold",
        stroke: "#08243d",
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(58);
      if (this.reducedMotion) this.time.delayedCall(650, () => callout.active && callout.destroy());
      else this.tweens.add({ targets: callout, y: callout.y - 32, alpha: 0, duration: 760, ease: "Cubic.easeOut", onComplete: () => callout.destroy() });
    };

    if (outcome === "telegraph") {
      boss.setTint(0xffc857);
      showCallout(`${attackName} 준비!`, "#ffe89a", true);
      this.time.delayedCall(280, () => {
        if (!this.disposed && boss.active) boss.clearTint();
        this.lastBossPhase = undefined;
        if (!this.disposed && this.currentState) this.updateBossPhase(this.currentState);
      });
      if (!this.reducedMotion) {
        this.tweens.add({ targets: boss, x: boss.x - 18, scaleX: boss.scaleX * 1.04, scaleY: boss.scaleY * 1.04, duration: 170, yoyo: true, ease: "Sine.easeInOut" });
        this.bossBattleAura?.setStrokeStyle(5, 0xffb84d, 0.9);
      }
      return;
    }

    const projectile = this.add.circle(boss.x - boss.displayWidth * 0.35, boss.y, 18, outcome === "dodge" ? 0xffd45c : 0xff765f, 0.95).setStrokeStyle(5, 0xfff4c4, 0.9).setDepth(52);
    const finish = () => {
      projectile.destroy();
      if (outcome === "dodge") {
        showCallout("문제 해결 · 회피!", "#8ff3ff");
        return;
      }
      player.sprite.setTint(0xff8f7f);
      showCallout("보호막 방어!", "#ffd0c9");
      if (!this.reducedMotion && this.shakeIntensity > 0) this.cameras.main.shake(140, this.shakeIntensity === 1 ? 0.0025 : 0.0045);
      this.time.delayedCall(180, () => {
        if (!this.disposed && player.sprite.active) player.sprite.clearTint();
      });
    };

    if (this.reducedMotion) {
      finish();
      return;
    }

    this.tweens.add({ targets: boss, x: boss.x - 32, duration: 130, yoyo: true, ease: "Power2" });
    if (outcome === "dodge") {
      const startY = player.sprite.y;
      this.tweens.add({ targets: player.sprite, y: startY - 58, duration: 150, yoyo: true, hold: 100, ease: "Sine.easeOut" });
    }
    this.tweens.add({
      targets: projectile,
      x: player.sprite.x,
      y: player.sprite.y,
      scale: 0.7,
      duration: 260,
      ease: "Cubic.easeIn",
      onComplete: finish,
    });
  }

  private playAttack(playerIndex: number, kind: "strong" | "magic") {
    const player = this.players[playerIndex];
    if (!player || !this.boss) return;
    if (this.reducedMotion) {
      this.boss.setTint(kind === "strong" ? 0x64e7f7 : 0xff72c4);
      this.showCombatCallout(kind);
      this.time.delayedCall(90, () => {
        if (!this.disposed && this.boss?.active) this.boss.clearTint();
      });
      return;
    }
    const startX = player.sprite.x;
    const trail = this.add.circle(player.sprite.x + 58, player.sprite.y, 10, kind === "strong" ? 0x64e7f7 : 0xff72c4, 0.92).setDepth(45);
    this.tweens.add({ targets: trail, x: this.boss.x - 60, y: this.boss.y, scale: 0.35, duration: 150, ease: "Cubic.easeIn", onComplete: () => trail.destroy() });
    this.tweens.add({
      targets: player.sprite,
      x: startX + 115,
      duration: 150,
      yoyo: true,
      ease: "Power2",
      onYoyo: () => {
        if (!this.reducedMotion && this.shakeIntensity > 0) this.cameras.main.shake(120, this.shakeIntensity === 1 ? 0.003 : 0.006);
        this.boss?.setTint(0xffffff);
        this.time.delayedCall(120, () => {
          if (!this.disposed && this.boss?.active) this.boss.clearTint();
        });
        const hit = this.add.star(this.boss!.x - 55, this.boss!.y, 10, 10, 36, kind === "strong" ? 0x64e7f7 : 0xff72c4, 1).setDepth(50);
        this.tweens.add({ targets: hit, scale: 4, angle: 45, alpha: 0, duration: 520, ease: "Cubic.easeOut", onComplete: () => hit.destroy() });
        this.showCombatCallout(kind);
      },
    });
  }

  private showCombatCallout(kind: "strong" | "magic") {
    if (!this.boss?.active) return;
    const callout = this.add.text(this.boss.x - 52, this.boss.y - 76, kind === "strong" ? "약점 발견!" : "규칙 연결!", {
      fontFamily: "Malgun Gothic, Arial, sans-serif",
      fontSize: "22px",
      color: kind === "strong" ? "#bff8ff" : "#ffd3f1",
      fontStyle: "bold",
      stroke: "#08243d",
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(55);
    if (this.reducedMotion) {
      this.time.delayedCall(520, () => callout.active && callout.destroy());
      return;
    }
    this.tweens.add({ targets: callout, y: callout.y - 42, alpha: 0, scale: 1.12, duration: 680, ease: "Cubic.easeOut", onComplete: () => callout.destroy() });
  }

  private playSpecial(coop: boolean, skillName: string) {
    if (this.specialActive || this.disposed) return;
    this.specialActive = true;
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88).setDepth(60);
    const title = this.add.text(width / 2, height * 0.25, skillName, {
      fontFamily: "Malgun Gothic, Arial, sans-serif",
      fontSize: coop ? "32px" : "28px",
      fontStyle: "bold",
      color: "#ffe879",
      stroke: "#7c2d12",
      strokeThickness: 7,
      align: "center",
      wordWrap: { width: width - 50 },
    }).setOrigin(0.5).setDepth(63);
    const cutins = this.players.map((_player, index) => {
      const cutin = this.add.image(index === 0 ? width * 0.38 : width * 0.62, height * 0.63, index === 0 ? "hero1" : "hero2").setDisplaySize(260, 190).setDepth(62);
      const targetScaleX = cutin.scaleX;
      const targetScaleY = cutin.scaleY;
      cutin.setScale(0);
      if (this.reducedMotion) cutin.setScale(targetScaleX, targetScaleY);
      else this.tweens.add({ targets: cutin, scaleX: targetScaleX, scaleY: targetScaleY, duration: 350, delay: index * 130, ease: "Back.easeOut" });
      return cutin;
    });
    this.specialObjects = [overlay, title, ...cutins];
    const impactTimer = this.time.delayedCall(1150, () => {
      if (!this.specialActive || this.disposed) return;
      if (!this.reducedMotion && this.shakeIntensity > 0) {
        this.cameras.main.flash(170, 100, 231, 247, false);
        this.cameras.main.shake(520, this.shakeIntensity === 1 ? 0.004 : 0.007);
      }
      if (!this.reducedMotion) {
        const impact = this.add.star(this.boss?.x ?? width * 0.78, this.boss?.y ?? height * 0.55, 12, 18, 64, 0xffe879, 1).setDepth(64);
        this.specialObjects.push(impact);
        this.tweens.add({ targets: impact, scale: 4.5, angle: 75, alpha: 0, duration: 620, ease: "Cubic.easeOut" });
      }
      this.boss?.setAlpha(0.1);
    });
    const finishTimer = this.time.delayedCall(2100, () => this.finishSpecialEffect());
    this.specialTimers = [impactTimer, finishTimer];
  }

  private finishSpecialEffect() {
    if (!this.specialActive) return;
    this.specialObjects.forEach((object) => {
      if (object.scene) object.destroy();
    });
    this.specialObjects = [];
    this.specialTimers = [];
    this.specialActive = false;
    if (!this.disposed) gameEventBridge.emit("specialComplete", undefined);
  }

  private cancelSpecialEffect() {
    this.specialTimers.forEach((timer) => timer.remove(false));
    this.specialTimers = [];
    this.specialObjects.forEach((object) => {
      if (object.scene) object.destroy();
    });
    this.specialObjects = [];
    this.specialActive = false;
  }
}

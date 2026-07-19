import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  Scene: class {},
  Input: {
    Keyboard: {
      JustDown: (key: { pressed?: boolean }) => Boolean(key?.pressed),
    },
  },
}));
import {
  ADVENTURE_WORLD_HEIGHT,
  ADVENTURE_WORLD_WIDTH,
  NumberForestScene,
  pointInExpandedRect,
  resolveBossAttackPresentation,
  resolveBossPhasePresentation,
  resolveAxisSeparatedMovement,
} from "./NumberForestScene";

const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

describe("NumberForestScene movement helpers", () => {
  it("막힌 축만 멈추고 열린 축으로 미끄러진다", () => {
    const movement = resolveAxisSeparatedMovement(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      bounds,
      (x, y) => x >= 5 && y >= 5,
    );

    expect(movement).toMatchObject({ x: 10, y: 0, moved: true });
  });

  it("숨은 통로는 밟기만 해서는 열리지 않고 직접 상호작용해야 열린다", () => {
    const scene = new NumberForestScene() as unknown as Record<string, unknown>;
    const secretObjects = [{ setAlpha: vi.fn() }, { setAlpha: vi.fn() }];
    Object.assign(scene, {
      players: [{ sprite: { x: 650, y: 380 } }],
      bridgeCrossed: false,
      secretDiscovered: false,
      nearbyInteractionId: "lower-hidden-path",
      secretPathObjects: secretObjects,
      safeSetText: vi.fn(),
      emitProgress: vi.fn(),
    });

    const checkMilestones = scene.checkExplorationMilestones as () => void;
    checkMilestones.call(scene);
    expect(scene.secretDiscovered).toBe(false);

    const activateInteraction = scene.activateInteraction as (id: string) => void;
    activateInteraction.call(scene, "lower-hidden-path");
    expect(scene.secretDiscovered).toBe(true);
    secretObjects.forEach((object) => expect(object.setAlpha).toHaveBeenCalledWith(1));
  });

  it("이동 키를 놓은 상태에서 E 키로 가까운 화면 이벤트를 실행한다", () => {
    const scene = new NumberForestScene() as unknown as Record<string, unknown>;
    const activateInteraction = vi.fn();
    Object.assign(scene, {
      explorationActive: true,
      players: [{ sprite: {} }],
      cursors: { left: {}, right: {}, up: {}, down: {} },
      wasd: { left: {}, right: {}, up: {}, down: {} },
      touchDirections: new Set(),
      dashKey: { pressed: false },
      interactKey: { pressed: true },
      enterKey: { pressed: false },
      nearbyInteractionId: "forest-guide",
      checkInteractionProximity: vi.fn(),
      activateInteraction,
    });

    const update = scene.update as (time: number, delta: number) => void;
    update.call(scene, 100, 16);
    expect(activateInteraction).toHaveBeenCalledWith("forest-guide");
  });

  it("대시를 작은 단계로 나눠 장애물을 건너뛰지 않는다", () => {
    const movement = resolveAxisSeparatedMovement(
      { x: 0, y: 20 },
      { x: 30, y: 0 },
      bounds,
      (x) => x >= 15 && x <= 25,
      10,
    );

    expect(movement.steps).toBe(3);
    expect(movement.x).toBe(10);
  });

  it("32px Tiled 정수 월드와 확장된 통과 영역을 공유한다", () => {
    expect([ADVENTURE_WORLD_WIDTH, ADVENTURE_WORLD_HEIGHT]).toEqual([928, 512]);
    expect(pointInExpandedRect({ x: 95, y: 95 }, { x: 100, y: 100, width: 20, height: 20 }, 5)).toBe(true);
    expect(pointInExpandedRect({ x: 94, y: 95 }, { x: 100, y: 100, width: 20, height: 20 }, 5)).toBe(false);
  });
});

describe("NumberForestScene staged monster presentation", () => {
  it("shows a gentle first guardian before escalating to the final guardian", () => {
    expect(resolveBossPhasePresentation(1, 10, 135, 135).label).toBe("1단계 · 잠든 수호자 · 보호막 해독 중");
    expect(resolveBossPhasePresentation(2, 0, 120, 180).label).toBe("2단계 · 깨어난 수호자 · 약점이 드러났어");
    expect(resolveBossPhasePresentation(3, 0, 40, 225).label).toBe("3단계 · 최종 수호자 · 마지막 결계");
  });

  it("gives later bosses distinct readable attack silhouettes", () => {
    expect(resolveBossAttackPresentation(1).shape).toBe("seed");
    expect(resolveBossAttackPresentation(2)).toMatchObject({ shape: "fang", telegraphColor: 0xc084fc });
    expect(resolveBossAttackPresentation(3)).toMatchObject({ shape: "wave", telegraphColor: 0xfb7185 });
  });
});

describe("NumberForestScene special effect lifecycle", () => {
  it("연출 재진입을 막고 cut-in의 목표 표시 크기를 보존한다", () => {
    const scene = new NumberForestScene() as unknown as Record<string, unknown>;
    const overlay = { scene: {}, setDepth: vi.fn().mockReturnThis(), destroy: vi.fn() };
    const title = { scene: {}, setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), destroy: vi.fn() };
    const cutins = [0, 1].map(() => ({
      scene: {},
      scaleX: 1,
      scaleY: 1,
      setDisplaySize(width: number, height: number) {
        this.scaleX = width / 520;
        this.scaleY = height / 380;
        return this;
      },
      setDepth: vi.fn().mockReturnThis(),
      setScale(scaleX: number, scaleY = scaleX) {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        return this;
      },
      destroy: vi.fn(),
    }));
    const addImage = vi.fn()
      .mockReturnValueOnce(cutins[0])
      .mockReturnValueOnce(cutins[1]);
    const tweenAdd = vi.fn();
    const timerRemoves = [vi.fn(), vi.fn()];
    const delayedCall = vi.fn()
      .mockReturnValueOnce({ remove: timerRemoves[0] })
      .mockReturnValueOnce({ remove: timerRemoves[1] });
    Object.assign(scene, {
      scale: { width: ADVENTURE_WORLD_WIDTH, height: ADVENTURE_WORLD_HEIGHT },
      add: {
        rectangle: vi.fn().mockReturnValue(overlay),
        text: vi.fn().mockReturnValue(title),
        image: addImage,
      },
      players: [{}, {}],
      tweens: { add: tweenAdd },
      time: { delayedCall },
      cameras: { main: { shake: vi.fn() } },
      boss: { setAlpha: vi.fn() },
    });

    const playSpecial = scene.playSpecial as (coop: boolean, skillName: string) => void;
    playSpecial.call(scene, true, "협동 필살기");
    playSpecial.call(scene, true, "중복 필살기");

    expect(delayedCall).toHaveBeenCalledTimes(2);
    expect(addImage).toHaveBeenCalledTimes(2);
    expect(tweenAdd).toHaveBeenCalledWith(expect.objectContaining({ scaleX: 0.5, scaleY: 0.5 }));

    const cancelSpecialEffect = scene.cancelSpecialEffect as () => void;
    cancelSpecialEffect.call(scene);
    expect(timerRemoves[0]).toHaveBeenCalledWith(false);
    expect(timerRemoves[1]).toHaveBeenCalledWith(false);
    expect(overlay.destroy).toHaveBeenCalledOnce();
    expect(title.destroy).toHaveBeenCalledOnce();
    cutins.forEach((cutin) => expect(cutin.destroy).toHaveBeenCalledOnce());
  });

  it("reduced-motion에서는 공격 이동 tween 없이 색상 피드백만 준다", () => {
    const scene = new NumberForestScene() as unknown as Record<string, unknown>;
    const boss = { active: true, x: 700, y: 250, setTint: vi.fn(), clearTint: vi.fn() };
    const tweenAdd = vi.fn();
    const delayedCallbacks: Array<{ delay: number; callback: () => void }> = [];
    const callout = { active: true, destroy: vi.fn(), setOrigin: vi.fn(), setDepth: vi.fn() };
    callout.setOrigin.mockReturnValue(callout);
    callout.setDepth.mockReturnValue(callout);
    Object.assign(scene, {
      reducedMotion: true,
      players: [{ sprite: { x: 100 } }],
      boss,
      tweens: { add: tweenAdd },
      time: { delayedCall: vi.fn((delay: number, callback: () => void) => { delayedCallbacks.push({ delay, callback }); }) },
      add: { star: vi.fn(), text: vi.fn().mockReturnValue(callout) },
    });

    const playAttack = scene.playAttack as (attack: {
      playerIndex: number;
      style: "slash";
      element: "thunder";
      delivery: "melee";
      charged: boolean;
      damage: number;
      hitStopMs: 70;
      weaponLevel: 1;
      skillLevel: 1;
    }) => void;
    playAttack.call(scene, {
      playerIndex: 0,
      style: "slash",
      element: "thunder",
      delivery: "melee",
      charged: false,
      damage: 24,
      hitStopMs: 70,
      weaponLevel: 1,
      skillLevel: 1,
    });

    expect(tweenAdd).not.toHaveBeenCalled();
    expect(boss.setTint).toHaveBeenCalledWith(0x64e7f7);
    delayedCallbacks.find((entry) => entry.delay === 90)?.callback();
    expect(boss.clearTint).toHaveBeenCalledOnce();
  });

  it("보스 공격은 reduced-motion에서도 대상 영웅의 피격 결과를 분명히 보여 준다", () => {
    const scene = new NumberForestScene() as unknown as Record<string, unknown>;
    const boss = { active: true, x: 700, y: 250, displayWidth: 140, displayHeight: 110, setTint: vi.fn(), clearTint: vi.fn() };
    const sprite = { active: true, x: 180, y: 280, displayHeight: 110, setTint: vi.fn(), clearTint: vi.fn() };
    const projectile = { destroy: vi.fn(), setStrokeStyle: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis() };
    const callout = { active: true, y: 0, destroy: vi.fn(), setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis() };
    const tweenAdd = vi.fn();
    const delayedCallbacks: Array<{ delay: number; callback: () => void }> = [];
    Object.assign(scene, {
      reducedMotion: true,
      specialActive: false,
      disposed: false,
      shakeIntensity: 1,
      players: [{ sprite, aura: {}, name: {} }],
      boss,
      tweens: { add: tweenAdd },
      time: { delayedCall: vi.fn((delay: number, callback: () => void) => { delayedCallbacks.push({ delay, callback }); }) },
      cameras: { main: { shake: vi.fn() } },
      add: { circle: vi.fn().mockReturnValue(projectile), text: vi.fn().mockReturnValue(callout) },
    });

    const playBossAttack = scene.playBossAttack as (target: number, outcome: "telegraph" | "dodge" | "hit", name: string) => void;
    playBossAttack.call(scene, 0, "hit", "씨앗 파동");

    expect(projectile.destroy).toHaveBeenCalledOnce();
    expect(sprite.setTint).toHaveBeenCalledWith(0xff8f7f);
    expect(tweenAdd).not.toHaveBeenCalled();
    delayedCallbacks.find((entry) => entry.delay === 180)?.callback();
    expect(sprite.clearTint).toHaveBeenCalledOnce();
  });
});

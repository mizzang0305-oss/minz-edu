import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhaserStage } from "./PhaserStage";
import { gameEventBridge } from "@/game/bridge/gameEventBridge";
import { createBattleState } from "@/game/systems/CombatSystem";
import { DEFAULT_SETTINGS } from "@/stores/storage";

const mocks = vi.hoisted(() => ({
  createPhaserGame: vi.fn(),
}));

vi.mock("@/game/PhaserGame", () => ({
  createPhaserGame: mocks.createPhaserGame,
}));

describe("PhaserStage", () => {
  const refresh = vi.fn();
  const destroy = vi.fn();
  const sleep = vi.fn();
  const wake = vi.fn();
  let resizeCallback: ResizeObserverCallback;
  let animationFrameCallback: FrameRequestCallback | null;

  beforeEach(() => {
    animationFrameCallback = null;
    mocks.createPhaserGame.mockReturnValue({
      scale: { refresh },
      loop: { sleep, wake },
      destroy,
    });
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      animationFrameCallback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "visibilityState");
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("컨테이너 크기 변경에 맞춰 캔버스를 갱신하고 종료 뒤에는 게임을 건드리지 않는다", async () => {
    const battle = createBattleState(DEFAULT_SETTINGS);
    const view = render(
      <PhaserStage
        battle={battle}
        attackSignal={null}
        specialSignal={0}
        onSpecialComplete={vi.fn()}
        onExploreComplete={vi.fn()}
        stageId="number-forest"
      />,
    );

    await waitFor(() => expect(mocks.createPhaserGame).toHaveBeenCalledOnce());
    expect(animationFrameCallback).not.toBeNull();
    act(() => animationFrameCallback?.(0));
    expect(refresh).toHaveBeenCalledOnce();

    act(() => resizeCallback([], {} as ResizeObserver));
    const pendingResize = animationFrameCallback;
    view.unmount();
    act(() => pendingResize?.(16));

    expect(destroy).toHaveBeenCalledWith(true);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("숨겨진 탭에서 늦게 생성된 게임 루프를 즉시 재운다", async () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    const battle = createBattleState(DEFAULT_SETTINGS);
    const view = render(
      <PhaserStage
        battle={battle}
        attackSignal={null}
        specialSignal={0}
        onSpecialComplete={vi.fn()}
        onExploreComplete={vi.fn()}
        stageId="number-forest"
      />,
    );

    await waitFor(() => expect(mocks.createPhaserGame).toHaveBeenCalledOnce());
    expect(sleep).toHaveBeenCalledOnce();

    view.unmount();
  });

  it("창이 흐려지면 눌린 이동 입력을 모두 해제한다", async () => {
    const battle = createBattleState(DEFAULT_SETTINGS);
    const moves: Array<{ direction: string; active: boolean }> = [];
    const offMove = gameEventBridge.on("move", (value) => moves.push(value));
    const view = render(
      <PhaserStage
        battle={battle}
        attackSignal={null}
        specialSignal={0}
        onSpecialComplete={vi.fn()}
        onExploreComplete={vi.fn()}
        stageId="number-forest"
      />,
    );

    await waitFor(() => expect(mocks.createPhaserGame).toHaveBeenCalledOnce());
    act(() => gameEventBridge.emit("sceneReady", undefined));
    fireEvent.pointerDown(screen.getByRole("button", { name: "위로 이동" }));
    fireEvent.blur(window);

    expect(moves).toContainEqual({ direction: "up", active: true });
    expect(moves.slice(-4)).toEqual([
      { direction: "left", active: false },
      { direction: "right", active: false },
      { direction: "up", active: false },
      { direction: "down", active: false },
    ]);

    offMove();
    view.unmount();
  });

  it("iOS 페이지 전환과 화면 회전에서 입력을 해제하고 게임 루프를 복구한다", async () => {
    const battle = createBattleState(DEFAULT_SETTINGS);
    const moves: Array<{ direction: string; active: boolean }> = [];
    const offMove = gameEventBridge.on("move", (value) => moves.push(value));
    const view = render(
      <PhaserStage
        battle={battle}
        attackSignal={null}
        specialSignal={0}
        onSpecialComplete={vi.fn()}
        onExploreComplete={vi.fn()}
        stageId="number-forest"
      />,
    );

    await waitFor(() => expect(mocks.createPhaserGame).toHaveBeenCalledOnce());
    act(() => animationFrameCallback?.(0));
    act(() => gameEventBridge.emit("sceneReady", undefined));
    fireEvent.pointerDown(screen.getByRole("button", { name: "오른쪽으로 이동" }), { pointerId: 9, pointerType: "touch" });

    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(sleep).toHaveBeenCalled();
    expect(moves.slice(-4)).toEqual([
      { direction: "left", active: false },
      { direction: "right", active: false },
      { direction: "up", active: false },
      { direction: "down", active: false },
    ]);

    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(wake).toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event("orientationchange")));
    act(() => animationFrameCallback?.(16));
    expect(refresh).toHaveBeenCalledTimes(2);

    offMove();
    view.unmount();
  });

  it("포인터를 캡처해 버튼 밖에서도 이동을 유지하고 대시는 누르는 즉시 실행한다", async () => {
    const battle = createBattleState(DEFAULT_SETTINGS);
    const moves: Array<{ direction: string; active: boolean }> = [];
    let dashCount = 0;
    const offMove = gameEventBridge.on("move", (value) => moves.push(value));
    const offDash = gameEventBridge.on("dash", () => { dashCount += 1; });
    const view = render(
      <PhaserStage
        battle={battle}
        attackSignal={null}
        specialSignal={0}
        onSpecialComplete={vi.fn()}
        onExploreComplete={vi.fn()}
        stageId="number-forest"
      />,
    );

    await waitFor(() => expect(mocks.createPhaserGame).toHaveBeenCalledOnce());
    act(() => gameEventBridge.emit("sceneReady", undefined));
    const moveRight = screen.getByRole("button", { name: "오른쪽으로 이동" });
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.assign(moveRight, { setPointerCapture, releasePointerCapture, hasPointerCapture: () => true });

    fireEvent.pointerDown(moveRight, { pointerId: 7, pointerType: "touch" });
    fireEvent.pointerLeave(moveRight, { pointerId: 7, pointerType: "touch" });
    expect(moves).toEqual([{ direction: "right", active: true }]);
    expect(setPointerCapture).toHaveBeenCalled();

    fireEvent.pointerUp(moveRight, { pointerId: 7, pointerType: "touch" });
    expect(moves.at(-1)).toEqual({ direction: "right", active: false });
    expect(releasePointerCapture).toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByRole("button", { name: "짧게 대시" }), { pointerId: 8, pointerType: "touch" });
    expect(dashCount).toBe(1);

    offMove();
    offDash();
    view.unmount();
  });

  it("가까운 대상의 상호작용 버튼을 게임 화면 위에 표시하고 직접 실행한다", async () => {
    const battle = createBattleState(DEFAULT_SETTINGS);
    const interactions: string[] = [];
    const offInteract = gameEventBridge.on("interact", ({ npcId }) => interactions.push(npcId));
    const view = render(
      <PhaserStage
        battle={battle}
        attackSignal={null}
        specialSignal={0}
        onSpecialComplete={vi.fn()}
        onExploreComplete={vi.fn()}
        stageId="number-forest"
      />,
    );

    await waitFor(() => expect(mocks.createPhaserGame).toHaveBeenCalledOnce());
    act(() => gameEventBridge.emit("sceneReady", undefined));
    act(() => gameEventBridge.emit("interactionAvailable", {
      npcId: "guide-lumi",
      kind: "talk",
      label: "숲길잡이 루미에게 말 걸기",
      hint: "화면 버튼 또는 E·Enter 키",
      xPercent: 24,
      yPercent: 52,
    }));

    const prompt = screen.getByRole("button", { name: /숲길잡이 루미에게 말 걸기/ });
    expect(prompt.closest(".phaser-stage")).not.toBeNull();
    expect(prompt).toHaveStyle({ left: "24%", top: "52%" });
    fireEvent.click(prompt);
    expect(interactions).toEqual(["guide-lumi"]);

    offInteract();
    view.unmount();
  });

  it("쫄 몬스터의 반격 예고에 직접 회피하고 피격 결과를 전투 상태로 전달한다", async () => {
    const battle = createBattleState(DEFAULT_SETTINGS);
    const dodges: string[] = [];
    const onFieldDefenseResolved = vi.fn();
    const offDodge = gameEventBridge.on("fieldDodge", ({ enemyId }) => dodges.push(enemyId));
    const view = render(
      <PhaserStage
        battle={battle}
        attackSignal={null}
        specialSignal={0}
        onSpecialComplete={vi.fn()}
        onExploreComplete={vi.fn()}
        onFieldDefenseResolved={onFieldDefenseResolved}
        stageId="number-forest"
      />,
    );

    await waitFor(() => expect(mocks.createPhaserGame).toHaveBeenCalledOnce());
    act(() => gameEventBridge.emit("fieldEnemyThreat", { enemyId: "sprout-1", enemyName: "씨앗 쫄" }));
    fireEvent.click(screen.getByRole("button", { name: "씨앗 쫄 반격 회피" }));
    expect(dodges).toEqual(["sprout-1"]);

    act(() => gameEventBridge.emit("fieldDefenseResolved", { outcome: "hit", damage: 5 }));
    expect(onFieldDefenseResolved).toHaveBeenCalledWith("hit", 5);

    offDodge();
    view.unmount();
  });

  it("보스 공격 결과를 Phaser 장면으로 한 번 전달한다", async () => {
    const battle = createBattleState(DEFAULT_SETTINGS);
    const bossAttacks: Array<{ targetPlayerIndex: number; outcome: string; attackName: string }> = [];
    const offBossAttack = gameEventBridge.on("bossAttack", (value) => bossAttacks.push(value));
    const view = render(
      <PhaserStage
        battle={battle}
        attackSignal={null}
        bossAttackSignal={{ id: 1, targetPlayerIndex: 0, outcome: "hit", attackName: "씨앗 파동" }}
        specialSignal={0}
        onSpecialComplete={vi.fn()}
        onExploreComplete={vi.fn()}
        stageId="number-forest"
      />,
    );

    await waitFor(() => expect(mocks.createPhaserGame).toHaveBeenCalledOnce());
    act(() => gameEventBridge.emit("sceneReady", undefined));
    await waitFor(() => expect(bossAttacks).toEqual([{ targetPlayerIndex: 0, outcome: "hit", attackName: "씨앗 파동" }]));

    offBossAttack();
    view.unmount();
  });
});

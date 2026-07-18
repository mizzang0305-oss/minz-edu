"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type Phaser from "phaser";
import { gameEventBridge } from "@/game/bridge/gameEventBridge";
import type { ExplorationInteraction } from "@/game/bridge/gameEventBridge";
import type { BossAttackSignal, CoopBattleState } from "@/types/battle";
import type { ExplorationStageId } from "@/types/exploration";
import type { CharacterId } from "@/types/loadout";

type PhaserStageProps = {
  battle: CoopBattleState;
  attackSignal: { id: number; playerIndex: number; kind: "strong" | "magic" } | null;
  bossAttackSignal?: BossAttackSignal | null;
  specialSignal: number;
  onSpecialComplete: () => void;
  onExploreComplete: () => void;
  stageId: ExplorationStageId;
  characterId?: CharacterId;
};

type Direction = "left" | "right" | "up" | "down";

export function PhaserStage({ battle, attackSignal, bossAttackSignal = null, specialSignal, onSpecialComplete, onExploreComplete, stageId, characterId }: PhaserStageProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const battleRef = useRef(battle);
  const specialCallbackRef = useRef(onSpecialComplete);
  const exploreCallbackRef = useRef(onExploreComplete);
  const activePointersRef = useRef(new Map<number, Direction>());
  const [progress, setProgress] = useState({ collected: 0, total: 3, bridgeCrossed: false, secretDiscovered: false, npcTalked: false, chestOpened: false, nextDirection: "오른쪽" as "왼쪽" | "오른쪽" | "위쪽" | "아래쪽" | "도착", zonePage: 1 as 1 | 2, fieldEnemiesDefeated: 0, fieldEnemiesTotal: 2 });
  const [interaction, setInteraction] = useState<ExplorationInteraction | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const primaryPlayer = battle.players[0];
  const learningStageLabel = primaryPlayer.schoolLevel === "kindergarten"
    ? `유아 ${primaryPlayer.grade}세`
    : `${primaryPlayer.schoolLevel === "middle" ? "중등" : "초등"} ${primaryPlayer.grade}학년`;

  function move(direction: Direction, active: boolean) {
    gameEventBridge.emit("move", { direction, active });
  }

  function startMove(direction: Direction, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const alreadyActive = [...activePointersRef.current.values()].includes(direction);
    activePointersRef.current.set(event.pointerId, direction);
    if (typeof event.currentTarget.setPointerCapture === "function") {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic accessibility tests may not register an active native pointer.
      }
    }
    if (!alreadyActive) move(direction, true);
  }

  function stopMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const direction = activePointersRef.current.get(event.pointerId);
    if (!direction) return;
    activePointersRef.current.delete(event.pointerId);
    if (![...activePointersRef.current.values()].includes(direction)) move(direction, false);
    try {
      if (typeof event.currentTarget.hasPointerCapture === "function" && event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Mobile Safari can release capture before React receives pointercancel.
    }
  }

  useEffect(() => { battleRef.current = battle; }, [battle]);
  useEffect(() => { specialCallbackRef.current = onSpecialComplete; }, [onSpecialComplete]);
  useEffect(() => { exploreCallbackRef.current = onExploreComplete; }, [onExploreComplete]);

  useEffect(() => {
    let active = true;
    let resizeFrame: number | null = null;
    const offSpecial = gameEventBridge.on("specialComplete", () => specialCallbackRef.current());
    const offExplore = gameEventBridge.on("explorationComplete", () => exploreCallbackRef.current());
    const offProgress = gameEventBridge.on("explorationProgress", (value) => setProgress((current) => ({ ...current, ...value })));
    const offReady = gameEventBridge.on("sceneReady", () => {
      gameEventBridge.emit("sync", battleRef.current);
      gameEventBridge.emit("viewportChanged", {
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      });
      setReady(true);
    });
    const offInteraction = gameEventBridge.on("interactionAvailable", setInteraction);

    const stopMovement = () => {
      activePointersRef.current.clear();
      (["left", "right", "up", "down"] as Direction[]).forEach((direction) => move(direction, false));
    };
    const handleVisibility = () => {
      stopMovement();
      if (document.visibilityState === "hidden") gameRef.current?.loop.sleep();
      else {
        gameRef.current?.loop.wake();
        refreshScale();
      }
    };
    const handlePageHide = () => {
      stopMovement();
      gameRef.current?.loop.sleep();
    };
    const handlePageShow = () => {
      if (document.visibilityState !== "hidden") gameRef.current?.loop.wake();
      refreshScale();
    };
    const refreshScale = () => {
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        if (active) {
          gameRef.current?.scale.refresh();
          gameEventBridge.emit("viewportChanged", {
            width: window.visualViewport?.width ?? window.innerWidth,
            height: window.visualViewport?.height ?? window.innerHeight,
          });
        }
      });
    };
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refreshScale);
    if (parentRef.current) resizeObserver?.observe(parentRef.current);
    window.addEventListener("blur", stopMovement);
    window.addEventListener("orientationchange", refreshScale);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibility);
    window.visualViewport?.addEventListener("resize", refreshScale);

    void import("@/game/PhaserGame").then(({ createPhaserGame }) => {
      if (!active || !parentRef.current) return;
      gameRef.current = createPhaserGame(parentRef.current, stageId, characterId);
      if (document.visibilityState === "hidden") gameRef.current.loop.sleep();
      refreshScale();
    }).catch(() => {
      if (active) setLoadError(true);
    });

    return () => {
      active = false;
      stopMovement();
      offSpecial();
      offExplore();
      offProgress();
      offReady();
      offInteraction();
      window.removeEventListener("blur", stopMovement);
      window.removeEventListener("orientationchange", refreshScale);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.visualViewport?.removeEventListener("resize", refreshScale);
      resizeObserver?.disconnect();
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      const game = gameRef.current;
      gameRef.current = null;
      game?.destroy(true);
    };
  }, [characterId, stageId]);

  useEffect(() => {
    if (ready) gameEventBridge.emit("sync", battle);
  }, [battle, ready]);

  useEffect(() => {
    if (ready && attackSignal) gameEventBridge.emit("attack", attackSignal);
  }, [attackSignal, ready]);

  useEffect(() => {
    if (!ready || !bossAttackSignal) return;
    gameEventBridge.emit("bossAttack", {
      targetPlayerIndex: bossAttackSignal.targetPlayerIndex,
      outcome: bossAttackSignal.outcome,
      attackName: bossAttackSignal.attackName,
    });
  }, [bossAttackSignal, ready]);

  useEffect(() => {
    if (!ready || !specialSignal) return;
    gameEventBridge.emit("special", {
      coop: battle.players.length === 2,
      skillName: battle.players.length === 2 ? "민즈 트윈 드래곤 브레이크" : "민즈 썬더 드래곤 브레이크",
    });
  }, [battle.players.length, ready, specialSignal]);

  return (
    <section className="rpg-play-stage" aria-label="직접 움직이는 학습 RPG 탐험">
      <div ref={parentRef} className="phaser-stage" data-testid="phaser-stage">
        {!ready && !loadError && <div className="rpg-loading-overlay"><strong>모험 지도를 펼치는 중…</strong><span>영웅과 수호자를 불러오고 있어요.</span></div>}
        {loadError && <div className="rpg-load-error"><strong>탐험 지도를 열지 못했어요</strong><button type="button" onClick={() => window.location.reload()}>다시 열기</button></div>}
        {battle.battlePhase === "INTRO" && (
          <>
            <div className="rpg-quest-overlay" aria-live="polite">
              <span>PAGE {progress.zonePage} / 2 · {learningStageLabel} · 목표 {progress.nextDirection}</span>
              <strong>{!progress.npcTalked ? "길잡이와 대화하기" : !progress.chestOpened ? "보물 상자 열기" : `수집물 ${progress.collected}/${progress.total}`}</strong>
              <small>필드 적 {progress.fieldEnemiesDefeated}/{progress.fieldEnemiesTotal} · {progress.secretDiscovered ? "숨은 길 발견 완료" : "캐릭터 주변의 빛나는 버튼을 눌러요"}</small>
            </div>
            {interaction && (
              <button
                type="button"
                className={`rpg-world-object-prompt is-${interaction.kind}`}
                style={{ left: `${interaction.xPercent}%`, top: `${interaction.yPercent}%` }}
                onClick={() => interaction.kind === "enemy"
                  ? gameEventBridge.emit("fieldAttack", { enemyId: interaction.npcId })
                  : gameEventBridge.emit("interact", { npcId: interaction.npcId })}
              >
                <span className="rpg-prompt-key" aria-hidden="true">E</span>
                <span><strong>{interaction.label}</strong><small>{interaction.hint}</small></span>
              </button>
            )}
            <div className="touch-dpad rpg-world-dpad" role="group" aria-label="캐릭터 이동 조이스틱" onContextMenu={(event) => event.preventDefault()}>
            <button type="button" disabled={!ready} className="dpad-up" aria-label="위로 이동" onPointerDown={(event) => startMove("up", event)} onPointerUp={stopMove} onPointerCancel={stopMove} onLostPointerCapture={stopMove}>▲</button>
            <button type="button" disabled={!ready} className="dpad-left" aria-label="왼쪽으로 이동" onPointerDown={(event) => startMove("left", event)} onPointerUp={stopMove} onPointerCancel={stopMove} onLostPointerCapture={stopMove}>◀</button>
            <button type="button" disabled={!ready} className="dpad-right" aria-label="오른쪽으로 이동" onPointerDown={(event) => startMove("right", event)} onPointerUp={stopMove} onPointerCancel={stopMove} onLostPointerCapture={stopMove}>▶</button>
            <button type="button" disabled={!ready} className="dpad-down" aria-label="아래로 이동" onPointerDown={(event) => startMove("down", event)} onPointerUp={stopMove} onPointerCancel={stopMove} onLostPointerCapture={stopMove}>▼</button>
            <button type="button" disabled={!ready} className="dpad-dash" aria-label="짧게 대시" onPointerDown={(event) => { event.preventDefault(); gameEventBridge.emit("dash", undefined); }}>DASH</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

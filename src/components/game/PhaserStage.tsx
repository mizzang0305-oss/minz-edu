"use client";

import { useEffect, useRef } from "react";
import { gameEventBridge } from "@/game/bridge/gameEventBridge";
import type { CoopBattleState } from "@/types/battle";

type PhaserStageProps = {
  battle: CoopBattleState;
  attackSignal: { id: number; playerIndex: number; kind: "strong" | "magic" } | null;
  specialSignal: number;
  onSpecialComplete: () => void;
};

export function PhaserStage({ battle, attackSignal, specialSignal, onSpecialComplete }: PhaserStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const lastAttackRef = useRef(0);
  const lastSpecialRef = useRef(0);
  const initialBattleRef = useRef(battle);
  const battleRef = useRef(battle);
  const attackSignalRef = useRef(attackSignal);
  const specialSignalRef = useRef(specialSignal);

  useEffect(() => {
    battleRef.current = battle;
    attackSignalRef.current = attackSignal;
    specialSignalRef.current = specialSignal;
  }, [attackSignal, battle, specialSignal]);

  useEffect(() => {
    if (!hostRef.current) return;
    let disposed = false;
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;
    let readyTimer: number | undefined;
    import("@/game/PhaserGame").then(({ createPhaserGame }) => {
      if (disposed || !hostRef.current) return;
      game = createPhaserGame(hostRef.current);
      readyRef.current = true;
      readyTimer = window.setTimeout(() => {
        gameEventBridge.emit("sync", battleRef.current ?? initialBattleRef.current);
        const pendingAttack = attackSignalRef.current;
        if (pendingAttack && pendingAttack.id !== lastAttackRef.current) {
          lastAttackRef.current = pendingAttack.id;
          gameEventBridge.emit("attack", pendingAttack);
        }
        const pendingSpecial = specialSignalRef.current;
        if (pendingSpecial && pendingSpecial !== lastSpecialRef.current) {
          lastSpecialRef.current = pendingSpecial;
          gameEventBridge.emit("special", {
            coop: battleRef.current.players.length === 2,
            skillName: battleRef.current.players.length === 2 ? "민즈 트윈 드래곤 브레이크" : "민즈 썬더 드래곤 브레이크",
          });
        }
      }, 120);
    });
    return () => {
      disposed = true;
      readyRef.current = false;
      if (readyTimer !== undefined) window.clearTimeout(readyTimer);
      game?.destroy(true);
    };
  }, []); // Phaser lifecycle is intentionally independent from React battle updates.

  useEffect(() => {
    if (!readyRef.current) return;
    gameEventBridge.emit("sync", battle);
  }, [battle]);

  useEffect(() => {
    if (!readyRef.current || !attackSignal || attackSignal.id === lastAttackRef.current) return;
    lastAttackRef.current = attackSignal.id;
    gameEventBridge.emit("attack", attackSignal);
  }, [attackSignal]);

  useEffect(() => {
    if (!readyRef.current || !specialSignal || specialSignal === lastSpecialRef.current) return;
    lastSpecialRef.current = specialSignal;
    gameEventBridge.emit("special", {
      coop: battle.players.length === 2,
      skillName: battle.players.length === 2 ? "민즈 트윈 드래곤 브레이크" : "민즈 썬더 드래곤 브레이크",
    });
  }, [battle.players.length, specialSignal]);

  useEffect(() => gameEventBridge.on("specialComplete", onSpecialComplete), [onSpecialComplete]);

  return (
    <div
      ref={hostRef}
      className="phaser-stage"
      role="img"
      aria-label="민표와 친구가 숫자 슬라임을 상대하는 숫자 숲 전투 장면"
      data-testid="phaser-stage"
    />
  );
}

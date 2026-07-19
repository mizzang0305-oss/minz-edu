"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { getItemLevel } from "@/game/systems/LoadoutCombatSystem";
import { getSkill, getSkillElementLabel, type SkillId, type UpgradeableItemId, type UpgradeLevel } from "@/types/loadout";

export const CHARGE_HOLD_MS = 550;

type DirectAttackControlProps = {
  skillIds: SkillId[];
  selectedSkillId: SkillId;
  upgradeLevels: Partial<Record<UpgradeableItemId, UpgradeLevel>>;
  onSelectSkill: (skillId: SkillId) => void;
  onAttack: (mode: "tap" | "charged") => void;
};

export function DirectAttackControl({
  skillIds,
  selectedSkillId,
  upgradeLevels,
  onSelectSkill,
  onAttack,
}: DirectAttackControlProps) {
  const [charging, setCharging] = useState(false);
  const [chargedReady, setChargedReady] = useState(false);
  const chargeTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const pressedRef = useRef(false);

  const clearChargeTimer = () => {
    if (chargeTimerRef.current !== null) window.clearTimeout(chargeTimerRef.current);
    chargeTimerRef.current = null;
  };

  const resetCharge = () => {
    clearChargeTimer();
    pressedRef.current = false;
    setCharging(false);
    setChargedReady(false);
  };

  useEffect(() => () => clearChargeTimer(), []);

  const startCharge = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pressedRef.current = true;
    suppressClickRef.current = false;
    setCharging(true);
    setChargedReady(false);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic tests and older mobile browsers may not expose pointer capture.
    }
    clearChargeTimer();
    chargeTimerRef.current = window.setTimeout(() => {
      if (!pressedRef.current) return;
      setChargedReady(true);
    }, CHARGE_HOLD_MS);
  };

  const releaseCharge = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pressedRef.current) return;
    event.preventDefault();
    const charged = chargedReady;
    suppressClickRef.current = true;
    resetCharge();
    onAttack(charged ? "charged" : "tap");
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Mobile Safari can release capture before React receives pointerup.
    }
  };

  const cancelCharge = () => resetCharge();

  return (
    <section className="direct-attack-control" aria-label="정답 공격 실행">
      <span className="mission-kind">정답 확인 · 직접 공격 차례</span>
      <h2>스킬을 고르고 직접 공격!</h2>
      <p>짧게 누르면 빠른 공격, 길게 누르면 더 강한 차지 공격이 나갑니다.</p>
      <div className="direct-skill-row" role="group" aria-label="공격 스킬 선택">
        {skillIds.map((skillId) => {
          const skill = getSkill(skillId);
          const level = getItemLevel(upgradeLevels, skillId);
          return <button
            key={skillId}
            type="button"
            className={skillId === selectedSkillId ? "selected" : ""}
            aria-pressed={skillId === selectedSkillId}
            onClick={() => onSelectSkill(skillId)}
          >
            <strong>{skill.name}</strong>
            <small>{getSkillElementLabel(skillId)} · Lv.{level} · {skill.description}</small>
          </button>;
        })}
      </div>
      <button
        type="button"
        className={`direct-attack-button${charging ? " charging" : ""}${chargedReady ? " charged" : ""}`}
        aria-label="공격! 짧게 누르면 일반 공격, 길게 누르면 차지 공격"
        onPointerDown={startCharge}
        onPointerUp={releaseCharge}
        onPointerCancel={cancelCharge}
        onLostPointerCapture={() => {
          if (pressedRef.current) cancelCharge();
        }}
        onContextMenu={(event) => event.preventDefault()}
        onClick={() => {
          if (!suppressClickRef.current) onAttack("tap");
        }}
      >
        <span>{chargedReady ? "차지 공격!" : "공격!"}</span>
        <small>{chargedReady ? "손을 떼서 강하게 타격" : charging ? "힘을 모으는 중…" : "탭 또는 길게 누르기"}</small>
      </button>
    </section>
  );
}

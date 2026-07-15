import type { CoopBattleState } from "@/types/battle";

function bossPhaseLabel(battle: CoopBattleState) {
  if (battle.bossHp === 0) return "친구가 된 수호자";
  if (battle.bossShield > 0) return "보호막 해독 중";
  if (battle.bossHp / battle.bossMaxHp > 0.45) return "약점이 드러났어";
  return "마지막 결계";
}

export function BattleMomentumHUD({ battle }: { battle: CoopBattleState }) {
  const completed = Math.min(3, battle.completedMissionIds.length);

  return (
    <aside className="battle-momentum-hud" aria-label={`학습 결계 ${completed}/3, ${bossPhaseLabel(battle)}`}>
      <div className="battle-rune-track" aria-hidden="true">
        {["발견", "연결", "마무리"].map((step, index) => <span className={index < completed ? "is-lit" : index === completed ? "is-current" : ""} key={step} />)}
      </div>
      <strong key={`${battle.successfulDodges}-${battle.failedDodges}`}>회피 연속 {battle.dodgeStreak}</strong>
      <span>성공 {battle.successfulDodges} · {bossPhaseLabel(battle)}</span>
    </aside>
  );
}

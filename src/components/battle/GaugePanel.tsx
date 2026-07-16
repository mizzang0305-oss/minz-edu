import type { CoopBattleState } from "@/types/battle";

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="meter-row"><div className="meter-label"><span>{label}</span><strong>{value}%</strong></div><div className="meter-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span className={tone} style={{ width: `${value}%` }} /></div></div>;
}

export function GaugePanel({ battle, bossName }: { battle: CoopBattleState; bossName: string }) {
  return (
    <aside className="gauge-panel" aria-label="전투 상태">
      <div className="player-gauges">
        {battle.players.map((player, index) => <section className={battle.activePlayerIndex === index ? "player-gauge active" : "player-gauge"} key={player.id}><div className="player-gauge-title"><span className={index === 0 ? "element-dot thunder" : "element-dot fire"} /><strong>{player.displayName}</strong><em>{battle.activePlayerIndex === index ? "지금 차례" : "힘 모으는 중"}</em></div><div className="hp-line"><span>HP {player.hp}</span><span>보호막 {player.shield}</span></div><Meter label="전투 기운" value={player.battleGauge} tone="battle-fill" /><Meter label="발견 기운" value={player.conceptGauge} tone="concept-fill" /></section>)}
      </div>
      {battle.players.length === 2 && <div className="team-meter"><Meter label="팀 링크" value={battle.teamLinkGauge} tone="team-fill" /><p>둘의 참여가 모두 모여야 합동 스킬이 열려요.</p></div>}
      <div className="boss-meter"><div className="meter-label"><span>{bossName}</span><strong>{battle.bossHp}/{battle.bossMaxHp}</strong></div><div className="meter-track boss" role="progressbar" aria-label="보스 생명력" aria-valuemin={0} aria-valuemax={battle.bossMaxHp} aria-valuenow={battle.bossHp}><span style={{ width: `${(battle.bossHp / battle.bossMaxHp) * 100}%` }} /></div>{battle.bossShield > 0 && <span className="shield-chip">보호막 {battle.bossShield}</span>}</div>
    </aside>
  );
}

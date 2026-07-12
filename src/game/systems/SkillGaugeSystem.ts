export function addGauge(current: number, amount: number): number {
  return Math.min(100, Math.max(0, current + amount));
}

export function isSoloSpecialReady(battleGauge: number, conceptGauge: number, deepMissionComplete: boolean) {
  return battleGauge >= 100 && conceptGauge >= 80 && deepMissionComplete;
}

export function isCoopSpecialReady(
  personalGauges: number[],
  teamLinkGauge: number,
  deepMissionComplete: boolean,
) {
  return (
    personalGauges.length === 2 &&
    personalGauges.every((gauge) => gauge >= 70) &&
    teamLinkGauge >= 100 &&
    deepMissionComplete
  );
}

export function retryReward(retryCount: number) {
  return {
    courageGauge: retryCount > 0 ? 15 : 0,
    shieldRecovery: retryCount > 0 ? 5 : 0,
    badge: retryCount > 0 ? "다시 도전 용기 배지" : undefined,
  };
}

export function applyDamage(
  hp: number,
  shield: number,
  incomingDamage: number,
): { hp: number; shield: number; absorbed: number } {
  const safeDamage = Math.max(0, incomingDamage);
  const absorbed = Math.min(shield, safeDamage);
  return {
    shield: Math.max(0, shield - absorbed),
    hp: Math.max(0, hp - (safeDamage - absorbed)),
    absorbed,
  };
}

export function attackDamage(kind: "quick" | "strong" | "magic" | "special"): number {
  return { quick: 10, strong: 24, magic: 34, special: 100 }[kind];
}

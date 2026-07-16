export function movementDelta(dx: number, dy: number, deltaMs: number, horizontalSpeed = 190, verticalSpeed = 165) {
  const length = Math.hypot(dx, dy) || 1;
  const frameSeconds = Math.min(deltaMs, 50) / 1000;
  return {
    x: (dx / length) * horizontalSpeed * frameSeconds,
    y: (dy / length) * verticalSpeed * frameSeconds,
  };
}

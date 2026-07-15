import { describe, expect, it } from "vitest";
import { movementDelta } from "./MovementSystem";

describe("frame independent exploration movement", () => {
  it.each([30, 60, 120])("moves the same distance for two seconds at %i fps", (fps) => {
    const frameMs = 1000 / fps;
    let distance = 0;
    for (let frame = 0; frame < fps * 2; frame += 1) distance += movementDelta(1, 0, frameMs).x;
    expect(distance).toBeCloseTo(380, 5);
  });

  it("normalizes diagonal input", () => {
    const straight = movementDelta(1, 0, 16).x;
    const diagonal = movementDelta(1, 1, 16).x;
    expect(diagonal).toBeLessThan(straight);
  });
});

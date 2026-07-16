import { describe, expect, it } from "vitest";
import { NUMBER_FOREST_MAP } from "./numberForest";
import { validateMapDefinition } from "./validateMapDefinition";
import { EXPLORATION_MAPS } from "./mapRegistry";

describe("number forest exploration map", () => {
  it("keeps map ids, spawn, collectibles, boss and portal valid", () => {
    expect(validateMapDefinition(NUMBER_FOREST_MAP)).toEqual([]);
  });

  it("keeps all three stage maps unique and valid", () => {
    expect(Object.values(EXPLORATION_MAPS).map((map) => map.id)).toEqual(["number-forest-map-1", "word-island-map-1", "story-castle-map-1"]);
    Object.values(EXPLORATION_MAPS).forEach((map) => expect(validateMapDefinition(map)).toEqual([]));
  });

  it("places a passable bridge inside the river corridor", () => {
    const river = NUMBER_FOREST_MAP.obstacles.find((obstacle) => obstacle.id === "river");
    expect(river).toBeDefined();
    expect(NUMBER_FOREST_MAP.bridge.x).toBe(river?.x);
    expect(NUMBER_FOREST_MAP.bridge.width).toBe(river?.width);
  });
});

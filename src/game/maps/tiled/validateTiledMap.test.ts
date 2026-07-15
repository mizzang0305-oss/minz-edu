import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateTiledMap } from "./validateTiledMap";

const point = (id: number, name: string, objectClass: string, x: number, y: number) => ({ id, name, class: objectClass, point: true, x, y });
const rect = (id: number, name: string, objectClass: string, x: number, y: number, width = 16, height = 16) => ({ id, name, class: objectClass, x, y, width, height });

function validMap() {
  return {
    type: "map", orientation: "orthogonal", infinite: false, renderorder: "right-down", width: 4, height: 3, tilewidth: 32, tileheight: 32,
    properties: [
      { name: "schemaVersion", value: 1 }, { name: "mapId", value: "fixture" }, { name: "stageId", value: "number-forest" }, { name: "title", value: "테스트 맵" },
    ],
    tilesets: [{ firstgid: 1, source: "tiles/minz-rpg.tsj" }],
    layers: [
      { name: "ground", type: "tilelayer", data: Array(12).fill(1) },
      { name: "paths", type: "tilelayer", data: Array(12).fill(0) },
      { name: "water", type: "tilelayer", data: Array(12).fill(0) },
      { name: "decor", type: "tilelayer", data: Array(12).fill(0) },
      { name: "collision", type: "objectgroup", objects: [rect(1, "rock-1", "obstacle", 16, 0)] },
      { name: "entities", type: "objectgroup", objects: [point(2, "spawn", "player_spawn", 1, 1), point(3, "portal", "portal", 60, 40), point(4, "boss", "boss", 62, 42), point(5, "rune", "collectible", 20, 20), point(6, "guide", "npc", 10, 20)] },
      { name: "zones", type: "objectgroup", objects: [rect(7, "bridge", "bridge", 32, 16), rect(8, "secret", "secret_area", 0, 32)] },
    ],
  };
}

describe("Tiled map validator", () => {
  it("accepts the supported orthogonal object-layer contract", () => expect(validateTiledMap(validMap())).toEqual([]));
  it("accepts all rendered 32px Ninja Adventure stage maps", () => {
    ["number-forest", "word-island", "story-castle"].forEach((stageId) => {
      const map = JSON.parse(readFileSync(resolve(process.cwd(), `public/game-maps/${stageId}.tmj`), "utf8"));
      expect(map.tilewidth).toBe(32);
      expect(map.tileheight).toBe(32);
      expect(map.layers.filter((layer: { type: string }) => layer.type === "tilelayer").map((layer: { name: string }) => layer.name)).toEqual(["ground", "paths", "water", "decor"]);
      expect(validateTiledMap(map)).toEqual([]);
    });
  });
  it("collects deterministic diagnostics instead of throwing", () => {
    const broken = validMap();
    broken.infinite = true;
    broken.tilesets[0].source = "../secret.tsj";
    broken.layers = broken.layers.filter((layer) => layer.name !== "zones");
    const diagnostics = validateTiledMap(broken);
    expect(diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(["INFINITE_MAP_UNSUPPORTED", "TILESET_SOURCE_UNSAFE", "LAYER_MISSING", "ENTITY_COUNT_INVALID"]));
  });

  it("requires every runtime tile layer and 32px map tiles", () => {
    const broken = validMap();
    broken.tilewidth = 16;
    broken.layers = broken.layers.filter((layer) => layer.name !== "water");
    expect(validateTiledMap(broken).map((item) => item.code)).toEqual(
      expect.arrayContaining(["TILE_SIZE_UNSUPPORTED", "LAYER_MISSING"]),
    );
  });

  it("rejects malformed embedded tileset grids and out-of-range GIDs", () => {
    const broken = validMap();
    (broken as { tilesets: unknown[] }).tilesets = [{
      firstgid: 1,
      name: "ninja-adventure-32",
      image: "/game-assets/ninja-adventure/tileset-32.png",
      tilewidth: 32,
      tileheight: 32,
      tilecount: 4,
      columns: 2,
      margin: 0,
      spacing: 0,
      imagewidth: 65,
      imageheight: 64,
    }];
    const ground = broken.layers.find((layer) => layer.name === "ground");
    if (!ground || !("data" in ground) || !Array.isArray(ground.data)) {
      throw new Error("ground fixture is missing tile data");
    }
    ground.data[0] = 5;

    expect(validateTiledMap(broken).map((item) => item.code)).toEqual(
      expect.arrayContaining(["TILESET_GRID_INVALID", "TILE_GID_OUT_OF_RANGE"]),
    );
  });
});

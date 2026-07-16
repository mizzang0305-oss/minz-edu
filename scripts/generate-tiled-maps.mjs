import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "public/game-maps");
const width = 29;
const height = 16;
const tileSize = 32;
const columns = 28;
const gid = (column, row) => row * columns + column + 1;
const blankLayer = () => Array(width * height).fill(0);
const fillLayer = (tile) => Array(width * height).fill(tile);
const put = (layer, x, y, tile) => {
  if (x >= 0 && x < width && y >= 0 && y < height) layer[y * width + x] = tile;
};
const fillRect = (layer, x, y, rectWidth, rectHeight, tile) => {
  for (let row = y; row < y + rectHeight; row += 1) {
    for (let column = x; column < x + rectWidth; column += 1) put(layer, column, row, tile);
  }
};
const stamp = (layer, x, y, cells) => cells.forEach((row, rowIndex) => row.forEach((tile, columnIndex) => put(layer, x + columnIndex, y + rowIndex, tile)));
const pointObject = (id, name, className, x, y, properties = []) => ({ id, name, class: className, point: true, x, y, width: 0, height: 0, rotation: 0, visible: true, properties });
const rectObject = (id, name, className, { x, y, width: objectWidth, height: objectHeight }, properties = []) => ({ id, name, class: className, x, y, width: objectWidth, height: objectHeight, rotation: 0, visible: true, properties });
const property = (name, value, type = "string") => ({ name, type, value });

const maps = [
  {
    stageId: "number-forest",
    mapId: "number-forest-map-1",
    title: "숫자 숲의 봉인 다리",
    ground: gid(13, 16),
    path: gid(21, 16),
    river: { x: 15, y: 6, width: 3, height: 9 },
    treeStamp: [[gid(0, 10), gid(1, 10), gid(2, 10)], [gid(0, 11), gid(1, 11), gid(2, 11)]],
    rockStamp: [[gid(12, 10), gid(13, 10), gid(14, 10)], [gid(12, 11), gid(13, 11), gid(14, 11)]],
    playerSpawn: { x: 105, y: 315 },
    portal: { x: 775, y: 270 },
    boss: { id: "seed-slime", x: 828, y: 288 },
    chest: { id: "forest-chest", x: 235, y: 360 },
    collectibles: [{ id: "number-2", x: 280, y: 305, value: "2" }, { id: "number-5", x: 455, y: 265, value: "5" }, { id: "number-8", x: 625, y: 320, value: "8" }],
    npcs: [{ id: "forest-guide", x: 175, y: 300 }, { id: "bridge-sprite", x: 430, y: 340 }],
    obstacles: [{ id: "tree-north-1", kind: "tree", x: 330, y: 220, width: 76, height: 54 }, { id: "tree-south-1", kind: "tree", x: 350, y: 355, width: 78, height: 48 }, { id: "rock-north-1", kind: "rock", x: 570, y: 215, width: 70, height: 45 }, { id: "rock-south-1", kind: "rock", x: 555, y: 365, width: 82, height: 44 }, { id: "river", kind: "water", x: 485, y: 270, width: 92, height: 150 }],
    bridge: { id: "forest-bridge", x: 485, y: 292, width: 92, height: 58 },
    secret: { id: "lower-hidden-path", x: 610, y: 360, width: 145, height: 55 },
    battleSafeArea: { id: "battle-hud-safe-area", x: 64, y: 96, width: 800, height: 266 },
  },
  {
    stageId: "word-island",
    mapId: "word-island-map-1",
    title: "단어섬의 속삭이는 문",
    ground: gid(20, 8),
    path: gid(21, 13),
    river: { x: 15, y: 6, width: 3, height: 9 },
    treeStamp: [[gid(5, 16), gid(6, 16), gid(7, 16)], [gid(5, 17), gid(6, 17), gid(7, 17)]],
    rockStamp: [[gid(12, 10), gid(13, 10), gid(14, 10)], [gid(12, 11), gid(13, 11), gid(14, 11)]],
    playerSpawn: { x: 105, y: 315 },
    portal: { x: 775, y: 270 },
    boss: { id: "word-mimic", x: 824, y: 282 },
    chest: { id: "rune-chest", x: 230, y: 360 },
    collectibles: [{ id: "rune-first", x: 285, y: 282, value: "마" }, { id: "rune-second", x: 455, y: 330, value: "법" }, { id: "rune-third", x: 625, y: 275, value: "문" }],
    npcs: [{ id: "island-librarian", x: 175, y: 300 }, { id: "shell-poet", x: 440, y: 355 }],
    obstacles: [{ id: "island-rock-1", kind: "rock", x: 335, y: 210, width: 74, height: 56 }, { id: "island-rock-2", kind: "rock", x: 350, y: 370, width: 74, height: 44 }, { id: "ink-stream", kind: "water", x: 500, y: 250, width: 86, height: 165 }, { id: "island-tree", kind: "tree", x: 610, y: 360, width: 76, height: 48 }],
    bridge: { id: "word-bridge", x: 500, y: 300, width: 86, height: 60 },
    secret: { id: "shell-library", x: 625, y: 350, width: 135, height: 58 },
    battleSafeArea: { id: "battle-hud-safe-area", x: 64, y: 96, width: 800, height: 266 },
  },
  {
    stageId: "story-castle",
    mapId: "story-castle-map-1",
    title: "이야기 성의 세 증언",
    ground: gid(23, 32),
    path: gid(23, 32),
    river: { x: 15, y: 6, width: 3, height: 9 },
    treeStamp: [[gid(21, 21), gid(22, 21), gid(23, 21)], [gid(21, 22), gid(22, 22), gid(23, 22)]],
    rockStamp: [[gid(12, 10), gid(13, 10), gid(14, 10)], [gid(12, 11), gid(13, 11), gid(14, 11)]],
    playerSpawn: { x: 105, y: 315 },
    portal: { x: 780, y: 270 },
    boss: { id: "logic-guardian", x: 835, y: 285 },
    chest: { id: "archive-chest", x: 235, y: 360 },
    collectibles: [{ id: "story-beginning", x: 275, y: 330, value: "처음" }, { id: "story-middle", x: 465, y: 265, value: "가운데" }, { id: "story-ending", x: 645, y: 325, value: "끝" }],
    npcs: [{ id: "castle-witness", x: 175, y: 300 }, { id: "castle-knight", x: 445, y: 355 }],
    obstacles: [{ id: "castle-pillar-1", kind: "rock", x: 325, y: 210, width: 76, height: 62 }, { id: "castle-pillar-2", kind: "rock", x: 350, y: 365, width: 76, height: 46 }, { id: "memory-moat", kind: "water", x: 510, y: 250, width: 90, height: 165 }, { id: "archive-tree", kind: "tree", x: 620, y: 360, width: 78, height: 50 }],
    bridge: { id: "castle-drawbridge", x: 510, y: 300, width: 90, height: 60 },
    secret: { id: "hidden-archive", x: 630, y: 350, width: 130, height: 60 },
    battleSafeArea: { id: "battle-hud-safe-area", x: 64, y: 96, width: 800, height: 266 },
  },
];

function buildTileLayers(config) {
  const ground = fillLayer(config.ground);
  const paths = blankLayer();
  const water = blankLayer();
  const decor = blankLayer();
  fillRect(paths, 0, 5, 28, 10, config.path);
  if (config.stageId === "number-forest") fillRect(paths, 0, 8, 28, 4, gid(21, 16));
  fillRect(water, config.river.x, config.river.y, config.river.width, config.river.height, gid(20, 8));

  const bridge = [[gid(24, 7), gid(25, 7), gid(26, 7)], [gid(24, 8), gid(25, 8), gid(26, 8)]];
  stamp(decor, config.river.x, 9, bridge);
  config.obstacles.filter((item) => item.kind !== "water").forEach((item) => {
    const tileX = Math.floor(item.x / tileSize);
    const tileY = Math.floor(item.y / tileSize);
    stamp(decor, tileX, tileY, item.kind === "tree" ? config.treeStamp : config.rockStamp);
  });
  return { ground, paths, water, decor };
}

function buildObjects(config) {
  let objectId = 1;
  const next = () => objectId++;
  const collision = config.obstacles.map((item) => rectObject(next(), item.id, "obstacle", item, [property("kind", item.kind)]));
  const entities = [
    pointObject(next(), "player-spawn", "player_spawn", config.playerSpawn.x, config.playerSpawn.y),
    pointObject(next(), `${config.stageId}-portal`, "portal", config.portal.x, config.portal.y),
    pointObject(next(), config.boss.id, "boss", config.boss.x, config.boss.y),
    pointObject(next(), config.chest.id, "chest", config.chest.x, config.chest.y),
    ...config.collectibles.map((item) => pointObject(next(), item.id, "collectible", item.x, item.y, [property("value", item.value)])),
    ...config.npcs.map((item) => pointObject(next(), item.id, "npc", item.x, item.y)),
  ];
  const zones = [
    rectObject(next(), config.bridge.id, "bridge", config.bridge),
    rectObject(next(), config.secret.id, "secret_area", config.secret),
    rectObject(next(), config.battleSafeArea.id, "battle_safe_area", config.battleSafeArea),
  ];
  return { collision, entities, zones };
}

function buildMap(config) {
  const tiles = buildTileLayers(config);
  const objects = buildObjects(config);
  const tileLayer = (id, name, data) => ({ id, name, type: "tilelayer", x: 0, y: 0, width, height, opacity: 1, visible: true, data });
  const objectLayer = (id, name, items) => ({ id, name, type: "objectgroup", draworder: "topdown", opacity: 1, visible: true, objects: items });
  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.11.2",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    compressionlevel: -1,
    width,
    height,
    tilewidth: tileSize,
    tileheight: tileSize,
    nextlayerid: 8,
    nextobjectid: 30,
    properties: [property("schemaVersion", 1, "int"), property("mapId", config.mapId), property("stageId", config.stageId), property("title", config.title)],
    tilesets: [{ firstgid: 1, name: "ninja-adventure-32", tilewidth: tileSize, tileheight: tileSize, tilecount: 1120, columns, margin: 0, spacing: 0, image: "/game-assets/ninja-adventure/tileset-32.png", imagewidth: 896, imageheight: 1280 }],
    layers: [tileLayer(1, "ground", tiles.ground), tileLayer(2, "paths", tiles.paths), tileLayer(3, "water", tiles.water), tileLayer(4, "decor", tiles.decor), objectLayer(5, "collision", objects.collision), objectLayer(6, "entities", objects.entities), objectLayer(7, "zones", objects.zones)],
  };
}

await mkdir(outputDir, { recursive: true });
for (const config of maps) {
  await writeFile(resolve(outputDir, `${config.stageId}.tmj`), `${JSON.stringify(buildMap(config), null, 2)}\n`, "utf8");
}
console.log(`Generated ${maps.length} Tiled maps at ${outputDir}`);

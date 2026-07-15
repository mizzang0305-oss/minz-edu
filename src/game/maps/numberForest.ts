import type { ExplorationMapDefinition } from "@/types/exploration";

export const NUMBER_FOREST_MAP: ExplorationMapDefinition = {
  id: "number-forest-map-1",
  stageId: "number-forest",
  title: "숫자 숲의 숨은 다리",
  collectionLabel: "숫자 조각",
  objectiveCopy: "숲길잡이와 대화하고 보물 상자를 연 뒤 숫자 조각을 모아요.",
  worldSize: { width: 928, height: 512 },
  playerSpawn: { x: 105, y: 315 },
  collectibles: [
    { id: "number-2", x: 280, y: 305, value: "2" },
    { id: "number-5", x: 455, y: 265, value: "5" },
    { id: "number-8", x: 625, y: 320, value: "8" },
  ],
  obstacles: [
    { id: "tree-north-1", kind: "tree", x: 330, y: 220, width: 76, height: 54, frame: 584 },
    { id: "tree-south-1", kind: "tree", x: 350, y: 355, width: 78, height: 48, frame: 585 },
    { id: "rock-north-1", kind: "rock", x: 570, y: 215, width: 70, height: 45, frame: 690 },
    { id: "rock-south-1", kind: "rock", x: 555, y: 365, width: 82, height: 44, frame: 691 },
    { id: "river", kind: "water", x: 485, y: 270, width: 92, height: 150, frame: 0 },
  ],
  bridge: { id: "forest-bridge", x: 485, y: 292, width: 92, height: 58, frames: [1062, 1063, 1064], label: "빛나는 다리" },
  secretArea: { id: "lower-hidden-path", x: 610, y: 360, width: 145, height: 55, rewardLabel: "숨은 별길" },
  portal: { x: 775, y: 270 },
  boss: { id: "seed-slime", x: 828, y: 288, name: "잠든 씨앗 슬라임", attackName: "씨앗 파동", threatTier: 1, asset: "/game-assets/superpowers-rpg/boss-slime.png", exploreSize: { width: 141, height: 107 }, resolveCopy: "숫자 규칙을 되찾고 단어섬으로 가는 열쇠를 건넸어요." },
  chest: { id: "forest-chest", x: 235, y: 360, label: "숲 보물 상자 열기", rewardLabel: "숫자 탐험 나침반" },
  npcs: [
    { id: "forest-guide", x: 175, y: 300, name: "숲길잡이 루미", prompt: "숫자 조각 3개를 모으고 빛나는 다리를 건너 보스 게이트로 와 줘!" },
    { id: "bridge-sprite", x: 430, y: 340, name: "다리정령 모아", prompt: "강은 막혀 있지만 노란 다리 위는 안전해. 위아래로 움직여 다리 길을 맞춰 봐!" },
  ],
  visuals: { backgroundAsset: "/game-assets/duelyst/battle-arena.jpg", heroAsset: "/game-assets/superpowers-rpg/hero-warrior.png", friendAsset: "/game-assets/superpowers-rpg/hero-mage.png", tiledMapAsset: "/game-maps/number-forest.tmj", tilesetAsset: "/game-assets/ninja-adventure/tileset-32.png", tilesetName: "ninja-adventure-32", tileSize: 32, groundColor: 0x123d47, accentColor: 0x69d9e9, overlayColor: 0x031522 },
};

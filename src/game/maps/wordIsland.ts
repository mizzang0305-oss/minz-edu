import type { ExplorationMapDefinition } from "@/types/exploration";

export const WORD_ISLAND_MAP: ExplorationMapDefinition = {
  id: "word-island-map-1",
  stageId: "word-island",
  title: "단어섬의 뒤섞인 문",
  collectionLabel: "글자 룬",
  objectiveCopy: "사서 모아의 단서를 듣고 글자 룬을 모아 단어 문을 열어요.",
  worldSize: { width: 928, height: 512 },
  playerSpawn: { x: 105, y: 315 },
  collectibles: [
    { id: "rune-first", x: 285, y: 282, value: "마" },
    { id: "rune-second", x: 455, y: 330, value: "법" },
    { id: "rune-third", x: 625, y: 275, value: "문" },
  ],
  obstacles: [
    { id: "island-rock-1", kind: "rock", x: 335, y: 210, width: 74, height: 56, frame: 690 },
    { id: "island-rock-2", kind: "rock", x: 350, y: 370, width: 74, height: 44, frame: 691 },
    { id: "ink-stream", kind: "water", x: 500, y: 250, width: 86, height: 165, frame: 0 },
    { id: "island-tree", kind: "tree", x: 610, y: 360, width: 76, height: 48, frame: 584 },
  ],
  bridge: { id: "word-bridge", x: 500, y: 300, width: 86, height: 60, frames: [1062, 1063, 1064], label: "단어 문" },
  secretArea: { id: "shell-library", x: 625, y: 350, width: 135, height: 58, rewardLabel: "조개 도서관" },
  portal: { x: 775, y: 270 },
  boss: { id: "word-mimic", x: 824, y: 282, name: "단어 먹보 미믹", attackName: "낱말 이빨", threatTier: 2, asset: "/game-assets/superpowers-rpg/boss-mimic.png", exploreSize: { width: 231, height: 172 }, resolveCopy: "뒤섞인 낱말을 돌려주고 이야기 성의 문장을 건넸어요." },
  chest: { id: "rune-chest", x: 230, y: 360, label: "룬 상자 열기", rewardLabel: "글자 룬 주머니" },
  npcs: [
    { id: "island-librarian", x: 175, y: 300, name: "사서 모아", prompt: "섬 곳곳의 글자 룬 세 개를 순서대로 모으면 단어 문이 열려!", required: true },
    { id: "shell-poet", x: 440, y: 355, name: "조개시인 파도", prompt: "낱말은 소리와 뜻을 함께 보면 더 쉽게 기억할 수 있어." },
  ],
  visuals: { backgroundAsset: "/game-assets/superpowers-rpg/word-island-bg.png", heroAsset: "/game-assets/superpowers-rpg/hero-warrior.png", friendAsset: "/game-assets/superpowers-rpg/hero-mage.png", tiledMapAsset: "/game-maps/word-island.tmj", tilesetAsset: "/game-assets/ninja-adventure/tileset-32.png", tilesetName: "ninja-adventure-32", tileSize: 32, groundColor: 0x153d66, accentColor: 0x76e4ff, overlayColor: 0x041a3b },
};

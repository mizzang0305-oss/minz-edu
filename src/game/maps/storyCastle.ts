import type { ExplorationMapDefinition } from "@/types/exploration";

export const STORY_CASTLE_MAP: ExplorationMapDefinition = {
  id: "story-castle-map-1",
  stageId: "story-castle",
  title: "이야기 성의 세 증언",
  collectionLabel: "이야기 조각",
  objectiveCopy: "세 증언의 단서를 모아 처음·가운데·끝 순서를 완성해요.",
  worldSize: { width: 928, height: 512 },
  playerSpawn: { x: 105, y: 315 },
  collectibles: [
    { id: "story-beginning", x: 275, y: 330, value: "처음" },
    { id: "story-middle", x: 465, y: 265, value: "가운데" },
    { id: "story-ending", x: 645, y: 325, value: "끝" },
  ],
  obstacles: [
    { id: "castle-pillar-1", kind: "rock", x: 325, y: 210, width: 76, height: 62, frame: 690 },
    { id: "castle-pillar-2", kind: "rock", x: 350, y: 365, width: 76, height: 46, frame: 691 },
    { id: "memory-moat", kind: "water", x: 510, y: 250, width: 90, height: 165, frame: 0 },
    { id: "archive-tree", kind: "tree", x: 620, y: 360, width: 78, height: 50, frame: 585 },
  ],
  bridge: { id: "castle-drawbridge", x: 510, y: 300, width: 90, height: 60, frames: [1062, 1063, 1064], label: "기억의 도개교" },
  secretArea: { id: "hidden-archive", x: 630, y: 350, width: 130, height: 60, rewardLabel: "숨은 기록실" },
  battleSafeArea: { id: "battle-hud-safe-area", x: 64, y: 96, width: 800, height: 266 },
  portal: { x: 780, y: 270 },
  boss: { id: "logic-guardian", x: 835, y: 285, name: "논리의 장갑 수호자", attackName: "논리 충격파", threatTier: 3, asset: "/game-assets/duelyst/number-guardian.webp", exploreSize: { width: 270, height: 195 }, resolveCopy: "주장과 근거를 인정하고 영웅의 이야기 기록을 완성했어요." },
  chest: { id: "archive-chest", x: 235, y: 360, label: "기록 상자 열기", rewardLabel: "증언 기록판" },
  npcs: [
    { id: "castle-witness", x: 175, y: 300, name: "기록관 세리", prompt: "세 이야기 조각을 모아 사건의 순서를 되찾아 줘!", required: true },
    { id: "castle-knight", x: 445, y: 355, name: "증언기사 라온", prompt: "내 증언은 ‘수호자가 기록실에서 마지막 조각을 지켰다’야. 주장에는 근거가 따라야 해.", required: true },
  ],
  visuals: { backgroundAsset: "/game-assets/superpowers-rpg/story-castle-bg.png", heroAsset: "/game-assets/superpowers-rpg/hero-warrior.png", friendAsset: "/game-assets/superpowers-rpg/hero-mage.png", tiledMapAsset: "/game-maps/story-castle.tmj", tilesetAsset: "/game-assets/ninja-adventure/tileset-32.png", tilesetName: "ninja-adventure-32", tileSize: 32, groundColor: 0x273452, accentColor: 0xc7a8ff, overlayColor: 0x090d24 },
};

export type ExplorationPoint = { x: number; y: number };
export type ExplorationRect = ExplorationPoint & { width: number; height: number };
export type ExplorationStageId = "number-forest" | "word-island" | "story-castle";

export type ExplorationObstacle = ExplorationRect & {
  id: string;
  kind: "tree" | "rock" | "water";
  frame: number;
};

export type ExplorationMapDefinition = {
  id: string;
  stageId: ExplorationStageId;
  title: string;
  collectionLabel: string;
  objectiveCopy: string;
  worldSize: { width: number; height: number };
  playerSpawn: ExplorationPoint;
  collectibles: Array<ExplorationPoint & { id: string; value: string }>;
  obstacles: ExplorationObstacle[];
  bridge: ExplorationRect & { id: string; frames: number[]; label: string };
  secretArea: ExplorationRect & { id: string; rewardLabel: string };
  battleSafeArea: ExplorationRect & { id: string };
  portal: ExplorationPoint;
  boss: ExplorationPoint & {
    id: string;
    name: string;
    attackName: string;
    threatTier: 1 | 2 | 3;
    asset: string;
    exploreSize: { width: number; height: number };
    resolveCopy: string;
  };
  chest: ExplorationPoint & { id: string; label: string; rewardLabel: string };
  npcs: Array<ExplorationPoint & { id: string; name: string; prompt: string; required?: boolean }>;
  visuals: {
    backgroundAsset: string;
    heroAsset: string;
    friendAsset: string;
    tiledMapAsset: string;
    tilesetAsset: string;
    tilesetName: "ninja-adventure-32";
    tileSize: 32;
    groundColor: number;
    accentColor: number;
    overlayColor: number;
  };
};

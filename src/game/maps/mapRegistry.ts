import { NUMBER_FOREST_MAP } from "./numberForest";
import { WORD_ISLAND_MAP } from "./wordIsland";
import { STORY_CASTLE_MAP } from "./storyCastle";
import type { ExplorationMapDefinition, ExplorationStageId } from "@/types/exploration";

export const EXPLORATION_MAPS: Record<ExplorationStageId, ExplorationMapDefinition> = {
  "number-forest": NUMBER_FOREST_MAP,
  "word-island": WORD_ISLAND_MAP,
  "story-castle": STORY_CASTLE_MAP,
};

export function getExplorationMap(stageId: ExplorationStageId) {
  return EXPLORATION_MAPS[stageId];
}

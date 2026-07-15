import type { ExplorationMapDefinition, ExplorationPoint, ExplorationRect } from "@/types/exploration";

const contains = (rect: ExplorationRect, point: ExplorationPoint) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
const inBounds = (map: ExplorationMapDefinition, point: ExplorationPoint) => point.x >= 0 && point.y >= 0 && point.x <= map.worldSize.width && point.y <= map.worldSize.height;
const rectInBounds = (map: ExplorationMapDefinition, rect: ExplorationRect) => rect.width > 0 && rect.height > 0 && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= map.worldSize.width && rect.y + rect.height <= map.worldSize.height;
const intersects = (a: ExplorationRect, b: ExplorationRect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export function validateMapDefinition(map: ExplorationMapDefinition) {
  const errors: string[] = [];
  const ids = [map.bridge.id, map.secretArea.id, map.boss.id, map.chest.id, ...map.collectibles.map((item) => item.id), ...map.obstacles.map((item) => item.id), ...map.npcs.map((item) => item.id)];
  if (!map.id || !map.stageId) errors.push("map and stage ids are required");
  if (new Set(ids).size !== ids.length) errors.push("domain object ids must be unique");
  if (!inBounds(map, map.playerSpawn)) errors.push("player spawn must be in bounds");
  if (!inBounds(map, map.portal)) errors.push("portal must be in bounds");
  if (!inBounds(map, map.boss)) errors.push("boss must be in bounds");
  if (!inBounds(map, map.chest)) errors.push("chest must be in bounds");
  if (!rectInBounds(map, map.bridge) || !rectInBounds(map, map.secretArea) || map.obstacles.some((obstacle) => !rectInBounds(map, obstacle))) errors.push("all rectangles must have positive size and stay in bounds");
  if (map.obstacles.some((obstacle) => contains(obstacle, map.playerSpawn))) errors.push("player spawn cannot overlap an obstacle");
  if (map.collectibles.some((item) => !inBounds(map, item))) errors.push("collectibles must be in bounds");
  if (map.npcs.some((item) => !inBounds(map, item))) errors.push("npcs must be in bounds");
  const water = map.obstacles.find((obstacle) => obstacle.kind === "water");
  if (!water || !intersects(map.bridge, water)) errors.push("bridge must intersect a water obstacle");
  return errors;
}

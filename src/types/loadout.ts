export type CharacterId = "thunder-sword" | "flame-mage";
export type SkillId = "thunder-strike" | "flame-burst" | "shield-break";
export type EquipmentId = "training-sword" | "apprentice-wand" | "forest-armor" | "ember-robe";
export type UpgradeableItemId = EquipmentId | SkillId;
export type UpgradeLevel = 1 | 2 | 3 | 4 | 5;
export type AttackStyle = "slash" | "magic" | "breaker";
export type SkillElement = "thunder" | "fire" | "impact";

type ShopItemDetails = {
  name: string;
  description: string;
  cost: number;
};

export type ShopItem = ShopItemDetails & (
  | { id: EquipmentId; type: "weapon" | "armor" }
  | { id: SkillId; type: "skill" }
);

export const CHARACTERS: Array<{
  id: CharacterId;
  name: string;
  job: string;
  asset: string;
  defaultSkillId: SkillId;
  defaultWeaponId: EquipmentId;
}> = [
  {
    id: "thunder-sword",
    name: "라이오",
    job: "번개 검사",
    asset: "/game-assets/duelyst/hero-thunder.webp",
    defaultSkillId: "thunder-strike",
    defaultWeaponId: "training-sword",
  },
  {
    id: "flame-mage",
    name: "루미",
    job: "불꽃 마법사",
    asset: "/game-assets/duelyst/hero-magic.webp",
    defaultSkillId: "flame-burst",
    defaultWeaponId: "apprentice-wand",
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: "training-sword", type: "weapon", name: "훈련용 번개검", description: "정답 반격의 타격감을 높이는 기본 검", cost: 0 },
  { id: "apprentice-wand", type: "weapon", name: "별빛 수습 지팡이", description: "마법 스킬의 빛 효과를 여는 지팡이", cost: 45 },
  { id: "forest-armor", type: "armor", name: "숫자 숲 갑옷", description: "오답 뒤 다시 도전하는 보호막 장비", cost: 35 },
  { id: "ember-robe", type: "armor", name: "잿불 마법 로브", description: "불꽃 마법사에게 어울리는 방어구", cost: 55 },
  { id: "thunder-strike", type: "skill", name: "번개 베기", description: "빠르게 돌진해 약점을 베는 공격", cost: 0 },
  { id: "flame-burst", type: "skill", name: "화염 폭발", description: "정답의 힘을 모아 불꽃을 폭발시키는 공격", cost: 40 },
  { id: "shield-break", type: "skill", name: "수호벽 파쇄", description: "보스 보호막을 크게 흔드는 강타", cost: 60 },
];

export function getCharacter(characterId: string | undefined) {
  return CHARACTERS.find((character) => character.id === characterId) ?? CHARACTERS[0];
}

export function getSkill(skillId: string | undefined) {
  return SHOP_ITEMS.find((item) => item.type === "skill" && item.id === skillId) ?? SHOP_ITEMS.find((item) => item.id === "thunder-strike")!;
}

export function getShopItem(itemId: string | undefined) {
  return SHOP_ITEMS.find((item) => item.id === itemId);
}

export function normalizeUpgradeLevel(value: unknown): UpgradeLevel {
  if (typeof value !== "number" || !Number.isInteger(value)) return 1;
  return Math.max(1, Math.min(5, value)) as UpgradeLevel;
}

export function getUpgradeCost(itemId: UpgradeableItemId, currentLevel: UpgradeLevel) {
  if (currentLevel >= 5) return null;
  const item = getShopItem(itemId);
  if (!item) return null;
  return 20 + (currentLevel - 1) * 15 + Math.floor(item.cost / 4);
}

export function getAttackStyle(skillId: SkillId, weaponId: EquipmentId): AttackStyle {
  if (skillId === "shield-break") return "breaker";
  if (skillId === "flame-burst" || weaponId === "apprentice-wand") return "magic";
  return "slash";
}

export function getSkillElement(skillId: SkillId): SkillElement {
  if (skillId === "flame-burst") return "fire";
  if (skillId === "shield-break") return "impact";
  return "thunder";
}

export function getSkillElementLabel(skillId: SkillId) {
  const element = getSkillElement(skillId);
  if (element === "fire") return "🔥 화염";
  if (element === "impact") return "💥 파괴";
  return "⚡ 번개";
}

export function isSkillCompatible(characterId: CharacterId, skillId: SkillId) {
  if (skillId === "shield-break") return true;
  return characterId === "flame-mage" ? skillId === "flame-burst" : skillId === "thunder-strike";
}

export function isWeaponCompatible(characterId: CharacterId, weaponId: EquipmentId) {
  return characterId === "flame-mage" ? weaponId === "apprentice-wand" : weaponId === "training-sword";
}

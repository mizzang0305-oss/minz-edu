import {
  getAttackStyle,
  getSkillElement,
  normalizeUpgradeLevel,
  type AttackStyle,
  type CharacterId,
  type EquipmentId,
  type SkillElement,
  type SkillId,
  type UpgradeableItemId,
  type UpgradeLevel,
} from "@/types/loadout";

type UpgradeLevels = Partial<Record<UpgradeableItemId, UpgradeLevel>>;

export type PlayerAttackProfile = {
  style: AttackStyle;
  element: SkillElement;
  delivery: "melee" | "projectile";
  charged: boolean;
  damage: number;
  shieldDamageMultiplier: number;
  hitStopMs: 70;
  vibrationPattern: number[];
  weaponLevel: UpgradeLevel;
  skillLevel: UpgradeLevel;
};

export type ArmorDefenseProfile = {
  level: UpgradeLevel;
  shieldBonus: number;
  retryDamageReduction: number;
};

export function getItemLevel(levels: UpgradeLevels, itemId: UpgradeableItemId): UpgradeLevel {
  return normalizeUpgradeLevel(levels[itemId]);
}

export function resolvePlayerAttackProfile({
  weaponId,
  skillId,
  characterId,
  upgradeLevels,
  charged,
}: {
  weaponId: EquipmentId;
  skillId: SkillId;
  characterId: CharacterId;
  upgradeLevels: UpgradeLevels;
  charged: boolean;
}): PlayerAttackProfile {
  const weaponLevel = getItemLevel(upgradeLevels, weaponId);
  const skillLevel = getItemLevel(upgradeLevels, skillId);
  const style = getAttackStyle(skillId, weaponId);
  const element = getSkillElement(skillId);
  const baseDamage: Record<AttackStyle, number> = {
    slash: 24,
    magic: 23,
    breaker: 21,
  };
  const upgradedDamage = baseDamage[style] + (weaponLevel - 1) * 3 + (skillLevel - 1) * 4;
  const damage = charged ? Math.round(upgradedDamage * 1.45) : upgradedDamage;

  return {
    style,
    element,
    delivery: characterId === "flame-mage" || style === "magic" ? "projectile" : "melee",
    charged,
    damage,
    shieldDamageMultiplier: style === "breaker" ? 1.8 : 1,
    hitStopMs: 70,
    vibrationPattern: charged ? [35, 24, 55] : [24],
    weaponLevel,
    skillLevel,
  };
}

export function getArmorDefenseProfile(
  armorId: EquipmentId | undefined,
  upgradeLevels: UpgradeLevels,
): ArmorDefenseProfile | null {
  if (!armorId) return null;
  const level = getItemLevel(upgradeLevels, armorId);
  return {
    level,
    shieldBonus: 10 + (level - 1) * 5,
    retryDamageReduction: 1 + (level - 1) * 2,
  };
}

export function describeUpgradeEffect(
  item: { id: UpgradeableItemId; type: "weapon" | "armor" | "skill" },
  level: UpgradeLevel,
) {
  if (item.type === "armor") {
    const armor = getArmorDefenseProfile(item.id as EquipmentId, { [item.id]: level });
    return `보호막 +${armor?.shieldBonus ?? 0} · 오답 피해 -${armor?.retryDamageReduction ?? 0}`;
  }
  if (item.type === "weapon") return `직접 공격 강화 +${(level - 1) * 3}`;
  return `스킬 공격 강화 +${(level - 1) * 4}`;
}

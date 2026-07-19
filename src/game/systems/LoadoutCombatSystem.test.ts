import { describe, expect, it } from "vitest";
import { getArmorDefenseProfile, resolvePlayerAttackProfile } from "./LoadoutCombatSystem";
import { isSkillCompatible, isWeaponCompatible } from "@/types/loadout";

describe("LoadoutCombatSystem", () => {
  it("검, 지팡이, 방패 파괴 스킬의 타격 방식을 구분한다", () => {
    expect(resolvePlayerAttackProfile({ characterId: "thunder-sword", weaponId: "training-sword", skillId: "thunder-strike", upgradeLevels: {}, charged: false }).style).toBe("slash");
    expect(resolvePlayerAttackProfile({ characterId: "flame-mage", weaponId: "apprentice-wand", skillId: "flame-burst", upgradeLevels: {}, charged: false }).style).toBe("magic");
    expect(resolvePlayerAttackProfile({ characterId: "thunder-sword", weaponId: "training-sword", skillId: "shield-break", upgradeLevels: {}, charged: false }).style).toBe("breaker");
  });

  it("차지 공격과 강화 레벨을 실제 피해량에 반영한다", () => {
    const normal = resolvePlayerAttackProfile({
      weaponId: "training-sword",
      skillId: "thunder-strike",
      characterId: "thunder-sword",
      upgradeLevels: { "training-sword": 1, "thunder-strike": 1 },
      charged: false,
    });
    const charged = resolvePlayerAttackProfile({
      weaponId: "training-sword",
      skillId: "thunder-strike",
      characterId: "thunder-sword",
      upgradeLevels: { "training-sword": 5, "thunder-strike": 5 },
      charged: true,
    });

    expect(normal).toMatchObject({ damage: 24, hitStopMs: 70, charged: false });
    expect(charged.damage).toBeGreaterThan(normal.damage);
    expect(charged.vibrationPattern.length).toBeGreaterThan(1);
  });

  it("화염 마법사는 몸통 돌진 없이 원거리 속성 공격을 사용한다", () => {
    expect(resolvePlayerAttackProfile({
      characterId: "flame-mage",
      weaponId: "apprentice-wand",
      skillId: "flame-burst",
      upgradeLevels: {},
      charged: false,
    })).toMatchObject({ element: "fire", delivery: "projectile", style: "magic" });
  });

  it("캐릭터와 맞지 않는 속성 스킬과 무기를 구분한다", () => {
    expect(isSkillCompatible("flame-mage", "thunder-strike")).toBe(false);
    expect(isSkillCompatible("flame-mage", "flame-burst")).toBe(true);
    expect(isSkillCompatible("thunder-sword", "flame-burst")).toBe(false);
    expect(isWeaponCompatible("flame-mage", "training-sword")).toBe(false);
    expect(isWeaponCompatible("flame-mage", "apprentice-wand")).toBe(true);
  });

  it("방어구 레벨이 보호막과 재도전 피해 감소를 높인다", () => {
    expect(getArmorDefenseProfile(undefined, {})).toBeNull();
    expect(getArmorDefenseProfile("forest-armor", { "forest-armor": 1 })).toMatchObject({ shieldBonus: 10, retryDamageReduction: 1 });
    expect(getArmorDefenseProfile("forest-armor", { "forest-armor": 5 })).toMatchObject({ shieldBonus: 30, retryDamageReduction: 9 });
  });
});

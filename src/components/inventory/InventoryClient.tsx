"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createDefaultGameData,
  equipItem,
  purchaseShopItem,
  readGameData,
  selectBattleSkill,
  upgradeOwnedItem,
} from "@/stores/storage";
import type { StoredGameData } from "@/types/progress";
import { getCharacter, getSkill, getSkillElementLabel, getUpgradeCost, isSkillCompatible, isWeaponCompatible, normalizeUpgradeLevel, SHOP_ITEMS } from "@/types/loadout";
import { describeUpgradeEffect } from "@/game/systems/LoadoutCombatSystem";

export function InventoryClient() {
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  const [message, setMessage] = useState("가진 장비를 장착하거나 모험 코인으로 새 물품을 살 수 있어요.");

  useEffect(() => {
    const timer = window.setTimeout(() => setData(readGameData()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const character = getCharacter(data.playerProfile.characterId);
  const owned = SHOP_ITEMS.filter((item) => data.inventory.ownedItemIds.includes(item.id));
  const shop = SHOP_ITEMS.filter((item) => !data.inventory.ownedItemIds.includes(item.id));
  const selectedSkill = getSkill(data.parentSettings.selectedSkillId);

  const buy = (itemId: string) => {
    const result = purchaseShopItem(itemId);
    setData(result.data);
    setMessage(result.message);
  };

  const use = (itemId: string) => {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const next = item.type === "skill" ? selectBattleSkill(itemId) : equipItem(itemId);
    setData(next);
    setMessage(`${item.name}${item.type === "skill" ? " 스킬을 선택" : " 장비를 장착"}했습니다.`);
  };

  const upgrade = (itemId: string) => {
    const result = upgradeOwnedItem(itemId);
    setData(result.data);
    setMessage(result.message);
  };

  const isEquipped = (itemId: string) => itemId === data.inventory.equippedWeaponId
    || itemId === data.inventory.equippedArmorId
    || itemId === data.parentSettings.selectedSkillId;

  return (
    <main className="inventory-page game-inventory-page">
      <section className="inventory-hero"><div><span className="eyebrow">HERO LOADOUT & SHOP</span><h1>{data.playerProfile.displayName}의 장비·스킬 상점</h1><p>보상은 진열만 되는 카드가 아니라 실제로 장착하고 전투에서 선택할 수 있습니다.</p><div className="coin-display"><strong>{data.inventory.coins}</strong><span>사용 가능한 모험 코인</span></div></div><Image src={character.asset} alt={`${character.name} ${character.job}`} width="420" height="304" loading="eager" /></section>

      <p className="inventory-message" role="status" aria-live="polite">{message}</p>

      <section className="loadout-summary" aria-label="현재 장착 상태">
        <article><span>캐릭터</span><strong>{character.name}</strong><small>{character.job}</small></article>
        <article><span>무기</span><strong>{SHOP_ITEMS.find((item) => item.id === data.inventory.equippedWeaponId)?.name}</strong><small>정답 반격에 사용</small></article>
        <article><span>방어구</span><strong>{SHOP_ITEMS.find((item) => item.id === data.inventory.equippedArmorId)?.name ?? "장비 없음"}</strong><small>오답 뒤 재도전 보호</small></article>
        <article><span>선택 스킬</span><strong>{selectedSkill.name}</strong><small>{selectedSkill.description}</small></article>
      </section>

      <div className="inventory-title-row"><div><span>INVENTORY</span><h2>보유 장비와 기술</h2></div><strong>{owned.length}개</strong></div>
      <section className="functional-inventory-grid">{owned.map((item) => {
        const level = normalizeUpgradeLevel(data.inventory.upgradeLevels[item.id]);
        const upgradeCost = getUpgradeCost(item.id, level);
        const compatible = item.type === "skill"
          ? isSkillCompatible(data.playerProfile.characterId, item.id)
          : item.type === "weapon"
            ? isWeaponCompatible(data.playerProfile.characterId, item.id)
            : true;
        return <article key={item.id} className={isEquipped(item.id) ? "equipped" : ""}>
          <div className="inventory-item-level"><span>{item.type === "weapon" ? "무기" : item.type === "armor" ? "방어구" : "스킬"}</span><strong>Lv.{level}</strong></div>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
          {item.type === "skill" && <small className="item-element-label">{getSkillElementLabel(item.id)}</small>}
          <small className="upgrade-effect">{describeUpgradeEffect(item, level)}</small>
          <div className="inventory-card-actions">
            <button type="button" disabled={isEquipped(item.id) || !compatible} onClick={() => use(item.id)}>{isEquipped(item.id) ? "사용 중" : !compatible ? `${character.job} 사용 불가` : item.type === "skill" ? "전투 스킬로 선택" : "장착하기"}</button>
            <button type="button" className="upgrade-button" disabled={upgradeCost === null || data.inventory.coins < upgradeCost} onClick={() => upgrade(item.id)}>{upgradeCost === null ? "최고 레벨" : `강화 · 🪙 ${upgradeCost}`}</button>
          </div>
        </article>;
      })}</section>

      <div className="inventory-title-row"><div><span>COIN SHOP</span><h2>모험 포인트 상점</h2></div><strong>잔액 {data.inventory.coins}</strong></div>
      <section className="game-shop-grid">{shop.length === 0 ? <p className="empty-shop">상점의 모든 장비와 스킬을 모았습니다.</p> : shop.map((item) => <article key={item.id}><span>{item.type === "weapon" ? "무기" : item.type === "armor" ? "방어구" : "스킬"}</span><h3>{item.name}</h3><p>{item.description}</p><strong>🪙 {item.cost}</strong><button type="button" disabled={data.inventory.coins < item.cost} onClick={() => buy(item.id)}>{data.inventory.coins >= item.cost ? "모험 코인으로 구매" : `${item.cost - data.inventory.coins} 코인 부족`}</button></article>)}</section>

      {data.inventory.badges.length > 0 && <section className="badge-vault"><h2>모험 배지</h2><div>{data.inventory.badges.map((badge) => <span key={badge}>◆ {badge}</span>)}</div></section>}
      <div className="inventory-actions"><Link href="/world" className="secondary-button">STATUS로 돌아가기</Link><Link href="/goals" className="primary-button">다음 문제 퀘스트</Link></div>
    </main>
  );
}

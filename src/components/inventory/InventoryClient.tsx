"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { GameScreenNav } from "@/components/common/GameScreenNav";
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

const INVENTORY_PAGE_SIZE = 4;

export function InventoryClient() {
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  const [message, setMessage] = useState("가진 장비를 장착하거나 모험 코인으로 새 물품을 살 수 있어요.");
  const [activePanel, setActivePanel] = useState<"owned" | "shop">("owned");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setData(readGameData()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const character = getCharacter(data.playerProfile.characterId);
  const owned = SHOP_ITEMS.filter((item) => data.inventory.ownedItemIds.includes(item.id));
  const shop = SHOP_ITEMS.filter((item) => !data.inventory.ownedItemIds.includes(item.id));
  const selectedSkill = getSkill(data.parentSettings.selectedSkillId);
  const panelItems = activePanel === "owned" ? owned : shop;
  const pageCount = Math.max(1, Math.ceil(panelItems.length / INVENTORY_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleItems = panelItems.slice(safePage * INVENTORY_PAGE_SIZE, (safePage + 1) * INVENTORY_PAGE_SIZE);

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

  const openPanel = (panel: "owned" | "shop") => {
    setActivePanel(panel);
    setPage(0);
  };

  return (
    <main className="inventory-page game-inventory-page game-screen-shell">
      <GameScreenNav current="inventory" />
      <section className="inventory-hero">
        <div><span className="eyebrow">HERO LOADOUT</span><h1>{data.playerProfile.displayName}의 장비·스킬</h1><p>장착, 강화, 구매를 한 화면에서 관리해요.</p></div>
        <Image src={character.asset} alt={`${character.name} ${character.job}`} width="420" height="304" loading="eager" />
        <div className="coin-display"><strong>{data.inventory.coins}</strong><span>모험 코인</span></div>
      </section>

      <p className="inventory-message" role="status" aria-live="polite">{message}</p>

      <section className="loadout-summary" aria-label="현재 장착 상태">
        <article><span>캐릭터</span><strong>{character.name}</strong><small>{character.job}</small></article>
        <article><span>무기</span><strong>{SHOP_ITEMS.find((item) => item.id === data.inventory.equippedWeaponId)?.name}</strong><small>정답 반격에 사용</small></article>
        <article><span>방어구</span><strong>{SHOP_ITEMS.find((item) => item.id === data.inventory.equippedArmorId)?.name ?? "장비 없음"}</strong><small>오답 뒤 재도전 보호</small></article>
        <article><span>선택 스킬</span><strong>{selectedSkill.name}</strong><small>{selectedSkill.description}</small></article>
      </section>

      <div className="inventory-panel-tabs" role="tablist" aria-label="인벤토리 보기">
        <button type="button" role="tab" aria-selected={activePanel === "owned"} className={activePanel === "owned" ? "is-active" : undefined} onClick={() => openPanel("owned")}>보유 장비 <span>{owned.length}</span></button>
        <button type="button" role="tab" aria-selected={activePanel === "shop"} className={activePanel === "shop" ? "is-active" : undefined} onClick={() => openPanel("shop")}>코인 상점 <span>{shop.length}</span></button>
      </div>

      <section className="inventory-screen-content" role="tabpanel" aria-label={activePanel === "owned" ? "보유 장비와 기술" : "모험 포인트 상점"}>
        {activePanel === "owned" ? <div className="functional-inventory-grid">{visibleItems.map((item) => {
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
      })}</div> : <div className="game-shop-grid">{visibleItems.length === 0 ? <p className="empty-shop">상점의 모든 장비와 스킬을 모았습니다.</p> : visibleItems.map((item) => <article key={item.id}><span>{item.type === "weapon" ? "무기" : item.type === "armor" ? "방어구" : "스킬"}</span><h3>{item.name}</h3><p>{item.description}</p><strong>🪙 {item.cost}</strong><button type="button" disabled={data.inventory.coins < item.cost} onClick={() => buy(item.id)}>{data.inventory.coins >= item.cost ? "모험 코인으로 구매" : `${item.cost - data.inventory.coins} 코인 부족`}</button></article>)}</div>}
      </section>

      <div className="inventory-pager" aria-label="장비 목록 페이지">
        <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>이전</button>
        <strong>{safePage + 1} / {pageCount}</strong>
        <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>다음</button>
      </div>
    </main>
  );
}

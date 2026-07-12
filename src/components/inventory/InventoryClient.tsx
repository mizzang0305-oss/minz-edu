"use client";

import { useEffect, useState } from "react";
import { createDefaultGameData, readGameData } from "@/stores/storage";
import type { StoredGameData } from "@/types/progress";

export function InventoryClient() {
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  useEffect(() => {
    const timer = window.setTimeout(() => setData(readGameData()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const rewards = [...data.inventory.badges, ...data.teamRewards];
  return <main className="inventory-page"><span className="eyebrow">민표의 방</span><h1>보물 가방</h1><p>모험에서 발견한 조각과 함께 만든 보물이 여기에 모여요.</p><div className="coin-display">🪙 <strong>{data.inventory.coins}</strong> 코인</div><div className="inventory-grid">{rewards.length === 0 ? <div className="empty-inventory">첫 번째 숫자 숲 보물을 기다리고 있어요.</div> : rewards.map((reward) => <article key={reward}><span>★</span><strong>{reward}</strong></article>)}</div></main>;
}

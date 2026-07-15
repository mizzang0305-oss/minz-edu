"use client";

import Image from "next/image";
import Link from "next/link";
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
  const rewardImage = (index: number) => ["/game-assets/duelyst/number-guardian.webp", "/game-assets/duelyst/hero-magic.webp", "/game-assets/duelyst/hero-thunder.webp"][index % 3];
  return <main className="inventory-page game-inventory-page">
    <section className="inventory-hero"><div><span className="eyebrow">HERO VAULT</span><h1>{data.playerProfile.displayName}의 보물 가방</h1><p>모험에서 획득한 개념 조각과 협동 보상을 이미지 카드로 모아 봅니다.</p><div className="coin-display"><strong>{data.inventory.coins}</strong><span>모험 코인</span></div></div><Image src="/game-assets/duelyst/hero-thunder.webp" alt="보물 가방을 지키는 번개 영웅" width="420" height="304" /></section>
    <div className="inventory-title-row"><div><span>COLLECTION</span><h2>획득 보물</h2></div><strong>{rewards.length} / 12</strong></div>
    <div className="inventory-grid">{rewards.length === 0 ? <div className="empty-inventory"><Image src="/game-assets/duelyst/number-guardian.webp" alt="아직 잠든 첫 보물" width="480" height="347" /><div><h2>첫 보물이 아직 잠들어 있어요</h2><p>Stage 1의 숫자 수호자를 깨우면 이곳에 보상 카드가 나타납니다.</p><Link href="/world" className="primary-button">첫 모험 시작</Link></div></div> : rewards.map((reward, index) => <article key={`${reward}-${index}`}><span className="inventory-rarity">{index === 0 ? "LEGEND" : "FOUND"}</span><Image src={rewardImage(index)} alt="" width="420" height="304" /><strong>{reward}</strong><small>모험에서 획득</small></article>)}</div>
    <div className="inventory-actions"><Link href="/world" className="secondary-button">스테이지 지도</Link><Link href="/battle" className="primary-button">새 보물 찾으러 가기</Link></div>
  </main>;
}

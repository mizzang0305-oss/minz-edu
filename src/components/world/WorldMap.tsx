"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readGameData } from "@/stores/storage";
import type { ParentSettings } from "@/types/progress";

export function WorldMap() {
  const [settings, setSettings] = useState<ParentSettings | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettings(readGameData().parentSettings), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="world-shell">
      <div className="world-copy">
        <span className="eyebrow">오늘의 모험 지도</span>
        <h1>{settings?.playerName ?? "민표"}, 어느 길로 떠날까?</h1>
        <p>{settings?.mode === "local-shared-screen" ? `${settings.friendName}와 힘을 모을 준비가 됐어.` : "번개 검에 숫자 기운을 모아 보자."}</p>
      </div>
      <div className="map-path" aria-label="모험 장소 목록">
        <article className="world-card available">
          <div className="world-art number-forest"><span className="slime-mini">8</span><span className="slime-mini second">7</span><span className="forest-glow" /></div>
          <div className="world-card-copy"><span className="status-pill">오늘 열림</span><h2>숫자 숲</h2><p>흩어진 숫자 조각을 모아 슬라임의 방어막을 열자.</p><ul><li>약 5~10분</li><li>{settings?.mode === "local-shared-screen" ? "2인 협동" : "1인 모험"}</li></ul><Link className="primary-button" href="/battle">숫자 숲 입장</Link></div>
        </article>
        <article className="world-card locked"><div className="world-art word-island">ABC</div><div className="world-card-copy"><span className="status-pill muted">다음 지역</span><h2>마법 단어섬</h2><p>소리와 행동을 연결하는 섬. 다음 모험에서 열려요.</p></div></article>
        <article className="world-card locked"><div className="world-art story-castle">♜</div><div className="world-card-copy"><span className="status-pill muted">다음 지역</span><h2>이야기 성</h2><p>단서를 모아 성의 비밀을 찾는 길이에요.</p></div></article>
      </div>
    </div>
  );
}

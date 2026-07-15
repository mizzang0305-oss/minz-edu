"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdventureProgress } from "@/components/common/AdventureProgress";
import { readGameData, saveThought } from "@/stores/storage";
import type { AdventureRecord } from "@/types/progress";
import { findLearningGoal } from "@/learning/curriculumCatalog";
import { analyzeGoalPerformance } from "@/learning/performanceAnalysis";
import type { LearningGoalProgress } from "@/types/curriculum";
import { getExplorationMap } from "@/game/maps/mapRegistry";
import { withJosa } from "@/utils/koreanText";

export function ResultClient() {
  const [record, setRecord] = useState<AdventureRecord | null>(null);
  const [thought, setThought] = useState("");
  const [saved, setSaved] = useState(false);
  const [goalProgress, setGoalProgress] = useState<LearningGoalProgress | undefined>();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const gameData = readGameData();
      const history = gameData.playHistory;
      const latest = history.at(-1) ?? null;
      setRecord(latest);
      setThought(latest?.thought ?? "");
      setGoalProgress(latest?.learningGoalId ? gameData.learningGoalProgress[latest.learningGoalId] : undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!record) return <div className="empty-state"><h1>아직 열린 보물 상자가 없어요.</h1><Link href="/world" className="primary-button">모험 지도로</Link></div>;

  const coop = record.playerNames.length === 2;
  const gameData = readGameData();
  const stageMap = getExplorationMap(record.stageId ?? "number-forest");
  const goal = findLearningGoal(gameData.playerProfile, record.learningGoalId ?? gameData.parentSettings.selectedLearningGoalId);
  const insight = analyzeGoalPerformance(goalProgress ?? (record ? { goalId: goal.id, status: "in-progress", attempts: 1, firstTryCorrect: Math.max(0, record.completedMissions - record.retryCount), questionCount: Math.max(1, record.completedMissions), retryCount: record.retryCount, hintCount: record.hintCount, updatedAt: record.completedAt } : undefined));
  const loot = [
    { rarity: "LEGEND", image: "/game-assets/duelyst/hero-thunder.webp", title: record.specialSkill, copy: "필살기 기억 조각", tone: "legend" },
    { rarity: "RARE", image: stageMap.boss.asset, title: record.badges[0] ?? "개념 조각", copy: `${stageMap.boss.name}에게서 받은 우정의 증표`, tone: "rare" },
    { rarity: "UNCOMMON", image: coop ? "/game-assets/duelyst/hero-magic.webp" : "/game-assets/duelyst/hero-thunder.webp", title: coop ? "협동 영웅의 증표" : "용기 배지", copy: coop ? "파티 협동 보상" : "도전 완료 보상", tone: "uncommon" },
  ];

  return (
    <main className="result-page loot-result-page">
      <AdventureProgress current="result" />
      <section className="victory-stage">
        <div className="victory-rays" aria-hidden="true" />
        <Image className={`victory-boss threat-${stageMap.boss.threatTier}`} src={stageMap.boss.asset} alt="" width={stageMap.boss.exploreSize.width} height={stageMap.boss.exploreSize.height} />
        <div className="victory-copy"><span className="victory-kicker">MISSION COMPLETE · 위협도 {stageMap.boss.threatTier}</span><h1>{record.playerNames.join("와 ")},<br /><em>{withJosa(stageMap.boss.name, "과", "와")} 친구가 됐어!</em></h1><p>{stageMap.boss.resolveCopy}</p><div className="victory-score"><span><small>획득 코인</small><strong>+{record.coins}</strong></span><span><small>완료 임무</small><strong>{record.completedMissions}</strong></span><span><small>모험 기록</small><strong>완료</strong></span></div></div>
        <div className="victory-party" aria-label="승리한 영웅 파티"><Image src="/game-assets/duelyst/hero-thunder.webp" alt="번개 영웅" width="420" height="304" />{coop && <Image src="/game-assets/duelyst/hero-magic.webp" alt="불꽃 영웅" width="420" height="304" />}</div>
      </section>

      <section className="growth-card">
        <div><span>{insight.label}</span><h2>{goal.week}주차 · {goal.title}</h2><p>{goal.objective}</p></div>
        <article><small>잘한 점</small><strong>{insight.strength}</strong></article>
        <article><small>다음 연습</small><strong>{insight.nextPractice}</strong></article>
        <Link className="primary-button" href={`/training?goal=${goal.id}`}>추천 훈련 시작</Link>
      </section>

      <section className="loot-section">
        <div className="loot-heading"><div><span>QUEST REWARDS</span><h2>획득한 전리품</h2></div><p>도전과 발견이 영웅의 보물로 기록됐어요.</p></div>
        <div className="loot-grid">
          {loot.map((item) => (
            <article className={`loot-card ${item.tone}`} key={item.title}>
              <span className="loot-rarity">{item.rarity}</span><Image className="loot-item-image" src={item.image} alt="" width="420" height="304" /><h3>{item.title}</h3><p>{item.copy}</p><small>NEW</small>
            </article>
          ))}
        </div>
        {record.teamRewards.length > 0 && <div className="party-bonus"><span>🤝 PARTY BONUS</span><strong>{record.teamRewards.join(" · ")}</strong></div>}
      </section>

      <section className="thought-card quest-journal"><span className="mission-kind">HERO JOURNAL</span><h2>오늘 어떤 공격이 가장 멋졌어?</h2><p>영웅의 한마디를 모험 일지에 남겨 보세요. 평가하지 않고 그대로 보관합니다.</p><textarea value={thought} maxLength={240} placeholder="예: 두 드래곤이 합쳐질 때가 멋졌어!" onChange={(event) => { setThought(event.target.value); setSaved(false); }} /><button className="primary-button" disabled={!thought.trim()} onClick={() => { saveThought(record.id, thought.trim()); setSaved(true); }}>내 생각 보관하기</button><span className="save-note" aria-live="polite">{saved ? "오늘의 생각을 이 기기에 보관했어." : `${thought.length}/240`}</span></section>
      <div className="result-actions"><Link href="/inventory" className="primary-button">획득한 보물 가방 열기</Link><Link href="/goals" className="secondary-button">다음 주차 목표 보기</Link><Link href={`/battle?stage=${record.stageId ?? "number-forest"}&goal=${goal.id}`} className="secondary-button">다시 도전</Link></div>
    </main>
  );
}

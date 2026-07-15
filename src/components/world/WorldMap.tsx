"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdventureProgress } from "@/components/common/AdventureProgress";
import { readGameData } from "@/stores/storage";
import type { StoredGameData } from "@/types/progress";
import { findLearningGoal } from "@/learning/curriculumCatalog";
import { getExplorationMap } from "@/game/maps/mapRegistry";

export function WorldMap() {
  const [data, setData] = useState<StoredGameData | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setData(readGameData()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const settings = data?.parentSettings;
  const playerName = settings?.playerName ?? "민표";
  const coop = settings?.mode === "local-shared-screen";
  const stage1Cleared = data?.stageProgress["number-forest"].status === "cleared";
  const stage2Status = data?.stageProgress["word-island"].status ?? "locked";
  const stage3Status = data?.stageProgress["story-castle"].status ?? "locked";
  const stage2Unlocked = stage2Status !== "locked";
  const stage3Unlocked = stage3Status !== "locked";
  const selectedGoal = settings ? findLearningGoal(data?.playerProfile ?? settings, settings.selectedLearningGoalId) : null;
  const startHref = !selectedGoal ? "/goals" : `/battle?stage=${selectedGoal.stageId}&goal=${selectedGoal.id}`;
  const selectedStageMap = getExplorationMap(selectedGoal?.stageId ?? "number-forest");

  return (
    <div className="world-shell rpg-world-shell">
      <AdventureProgress current="world" />
      <section className="world-command-deck">
        <div className="world-player-card">
          <span className="player-level">LV. 01</span>
          <Image src="/game-assets/duelyst/hero-thunder.webp" alt="" width="420" height="304" />
          <div><small>오늘의 영웅</small><strong>{playerName}</strong><span>번개 검사 · 숫자 숲 탐험대</span></div>
        </div>
        <div className="world-resource-bar" aria-label="모험 자원">
          <span><i>⚡</i><small>모험 기력</small><strong>100</strong></span>
          <span><i>◆</i><small>발견 조각</small><strong>0</strong></span>
          <span><i>♛</i><small>보물 등급</small><strong>ROOKIE</strong></span>
        </div>
      </section>

      <section className="world-map-hero">
        <div className="world-map-copy">
          <span className="map-zone-code">WEEK {selectedGoal?.week ?? 1} · {selectedGoal?.subject === "korean" ? "LANGUAGE QUEST" : "NUMBER QUEST"}</span>
          <h1>{playerName},<br /><em>{selectedGoal?.unitTitle ?? "숫자 숲"}</em> 모험 시작!</h1>
          <p>{coop ? `${settings?.friendName}와 파티를 결성했어. 두 영웅의 힘으로 ${selectedStageMap.boss.name}의 혼란을 풀자.` : `${selectedStageMap.boss.name}의 위협도는 ${selectedStageMap.boss.threatTier}. 학습 작전으로 친구가 되어 보자.`}</p>
          <div className="quest-objectives"><span>{selectedGoal?.week ?? 1}주차 학습 목표</span><strong>{selectedGoal?.title ?? "10 만들기"}</strong><small>{selectedGoal?.objective ?? "10을 이용해 덧셈을 해결해요."}</small></div>
          <Link href={startHref} className="map-quick-start" aria-label="선택한 목표 시작">▶ 선택 목표 시작</Link>
          <Link href="/goals" className="quiet-link">다른 주차·목표 고르기</Link>
        </div>
        <div className="world-map-cast" aria-hidden="true">
          <Image className="map-hero-unit" src="/game-assets/duelyst/hero-thunder.webp" alt="" width="420" height="304" />
          {coop && <Image className="map-friend-unit" src="/game-assets/duelyst/hero-magic.webp" alt="" width="420" height="304" />}
          <Image className={`map-boss-unit threat-${selectedStageMap.boss.threatTier}`} src={selectedStageMap.boss.asset} alt="" width={selectedStageMap.boss.exploreSize.width} height={selectedStageMap.boss.exploreSize.height} />
        </div>
      </section>

      <section className="world-learning-command">
        <div><span>오늘의 경로</span><h2>{selectedGoal ? `${selectedGoal.week}주차 · ${selectedGoal.title}` : "주별 목표를 먼저 골라요"}</h2><p>아는 내용은 진단 후 건너뛰고, 필요한 목표만 모험하거나 훈련할 수 있어요.</p></div>
        <div><Link className="primary-button" href={startHref}>선택 목표 시작</Link><Link className="secondary-button" href={selectedGoal ? `/training?goal=${selectedGoal.id}` : "/training"}>훈련장</Link></div>
      </section>

      <section className="rpg-stage-route" aria-label="모험 장소 목록">
        <article className={stage1Cleared ? "rpg-stage-card completed-stage" : "rpg-stage-card active-stage"}>
          <Image className="stage-card-art threat-1" src="/game-assets/superpowers-rpg/boss-slime.png" alt="숫자 숲의 작은 씨앗 슬라임" width="141" height="107" />
          <div className="stage-number"><span>STAGE</span><strong>1</strong></div>
          <div className="stage-card-copy"><span className="stage-status">{stage1Cleared ? "CLEAR" : "도전 가능"}</span><h2>숫자 숲의 봉인</h2><p>흩어진 숫자 조각을 모아 수호자의 방어막을 파괴하자.</p><ul><li>{coop ? "2인 협동" : "1인 모험"}</li><li>보상 3개</li><li>5~10분</li></ul></div>
          <Link className="stage-enter-button" href="/battle?stage=number-forest"><strong>{stage1Cleared ? "다시 도전" : "숫자 숲 입장"}</strong><small>{stage1Cleared ? "완료 기록 있음" : "전투 준비 완료"}</small></Link>
        </article>
        <div className="route-connector"><span>◆</span></div>
        <article className={stage2Status === "cleared" ? "rpg-stage-card completed-stage" : stage2Unlocked ? "rpg-stage-card active-stage" : "rpg-stage-card locked-stage"}><Image className="stage-card-art threat-2" src="/game-assets/superpowers-rpg/boss-mimic.png" alt="단어를 삼키는 미믹" width="231" height="172" /><div className="stage-number"><span>STAGE</span><strong>2</strong></div><div className="stage-card-copy"><span className="stage-status">{stage2Status === "cleared" ? "CLEAR" : stage2Unlocked ? "위협도 2" : "LOCKED"}</span><h2>마법 단어섬</h2><p>{stage2Unlocked ? "글자 룬을 모아 단어 먹보 미믹이 뒤섞은 낱말을 되찾아요." : "숫자 숲의 작은 수호자와 친구가 되면 항로가 열립니다."}</p></div>{stage2Unlocked ? <Link className="stage-enter-button" href="/battle?stage=word-island"><strong>{stage2Status === "cleared" ? "다시 도전" : "단어섬 출정"}</strong><small>{stage2Status === "cleared" ? "완료 기록 있음" : "독립 맵 준비 완료"}</small></Link> : <div className="stage-lock" aria-label="잠김">LOCK</div>}</article>
        <div className="route-connector"><span>◆</span></div>
        <article className={stage3Status === "cleared" ? "rpg-stage-card completed-stage" : stage3Unlocked ? "rpg-stage-card active-stage" : "rpg-stage-card locked-stage"}><Image className="stage-card-art threat-3" src="/game-assets/duelyst/number-guardian.webp" alt="이야기 성의 장갑 수호자" width="480" height="347" /><div className="stage-number"><span>STAGE</span><strong>3</strong></div><div className="stage-card-copy"><span className="stage-status">{stage3Status === "cleared" ? "CLEAR" : stage3Unlocked ? "위협도 3" : "LOCKED"}</span><h2>이야기 성</h2><p>{stage3Unlocked ? "세 증언을 모아 이야기 순서와 주장·근거의 문을 열어요." : "숫자 숲과 단어섬의 수호자와 친구가 되면 성문이 열립니다."}</p></div>{stage3Unlocked ? <Link className="stage-enter-button" href="/battle?stage=story-castle"><strong>{stage3Status === "cleared" ? "다시 도전" : "이야기 성 입장"}</strong><small>{stage3Status === "cleared" ? "완료 기록 있음" : "독립 맵 준비 완료"}</small></Link> : <div className="stage-lock" aria-label="잠김">LOCK</div>}</article>
      </section>
    </div>
  );
}

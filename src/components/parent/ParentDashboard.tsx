"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createDefaultGameData, readGameData } from "@/stores/storage";
import type { StoredGameData } from "@/types/progress";
import { formatLearningStage, getLearningBattleProfile } from "@/learning/stages";
import { findLearningGoal } from "@/learning/curriculumCatalog";
import { analyzeGoalPerformance } from "@/learning/performanceAnalysis";
import { useGameSyncStatus } from "@/components/sync/GameSyncProvider";

type Props = {
  onlineAccountConnected: boolean;
};

export function ParentDashboard({ onlineAccountConnected }: Props) {
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  const syncStatus = useGameSyncStatus();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setData(readGameData());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const latest = data.playHistory.at(-1);
  const profile = getLearningBattleProfile(data.playerProfile);
  const selectedGoal = findLearningGoal(data.playerProfile, data.parentSettings.selectedLearningGoalId);
  const goalProgress = data.learningGoalProgress[selectedGoal.id];
  const insight = analyzeGoalPerformance(goalProgress);
  return (
    <main className="parent-page"><div className="parent-heading"><div><span className="eyebrow">보호자 전용</span><h1>{data.playerProfile.displayName}의 모험 흐름</h1><p>정답 수나 다른 아이와의 순위 대신 시도·설명·협력 행동을 보여줍니다.</p>{onlineAccountConnected && <span className={`sync-status ${syncStatus}`}>{syncStatus === "synced" ? "프로필·진행도·학습 결과·보물 동기화됨" : syncStatus === "error" ? "기기에는 안전하게 저장됨 · 연결 후 다시 동기화" : "Google 계정에 모험 기록 저장 중"}</span>}</div><div className="parent-actions"><Link href="/children" className="primary-button">자녀 선택</Link><Link href="/parent/observation" className="secondary-button">협동 UX 관찰</Link><Link href="/setup" className="secondary-button">설정 바꾸기</Link></div></div>
      <section className="summary-grid"><article><span>현재 단계</span><strong>{formatLearningStage(data.playerProfile)}</strong><small>{profile.conceptName} 모험 적용 중</small></article><article><span>다시 도전</span><strong>{latest?.retryCount ?? 0}회</strong><small>시도 자체를 용기로 기록</small></article><article><span>힌트 사용</span><strong>{latest?.hintCount ?? 0}회</strong><small>도움받는 방법도 중요한 기술</small></article><article><span>협동 모험</span><strong>{data.coopBattleHistory.length}회</strong><small>비교 없는 공동 기록</small></article></section>
      <section className="parent-section learning-plan-summary"><div className="section-title"><div><h2>2학기 주별 학습 경로</h2><p>교육과정 기반 추천 경로이며 실제 학교 진도에 맞게 목표를 바꿀 수 있습니다.</p></div><Link href="/goals" className="secondary-button">주차·목표 바꾸기</Link></div><div className="concept-list"><div><span>현재 목표</span><strong>{selectedGoal.week}주차 · {selectedGoal.title}</strong><p>{selectedGoal.objective}</p></div><div><span>{insight.label} · 잘한 점</span><strong>{insight.strength}</strong><p>문항 수 {goalProgress?.questionCount ?? 0}개 · 훈련 {goalProgress?.attempts ?? 0}회</p></div><div><span>다음 연습</span><strong>{insight.nextPractice}</strong><p><Link href={`/training?goal=${selectedGoal.id}`}>이 목표 훈련장 열기 →</Link></p></div></div></section>
      <section className="parent-section"><div className="section-title"><div><h2>개념 발견 지도</h2><p>학생 화면에는 등급 대신 모험 언어로 표현합니다.</p></div></div><div className="concept-list"><div><span>{profile.conceptName}</span><strong>현재 모험</strong><p>{profile.introCopy}</p></div><div><span>도전 방식</span><strong>{profile.opening.kind === "blocks" ? "손으로 조작" : "근거 선택"}</strong><p>단계에 맞춰 문제 표현과 힌트를 조정</p></div><div><span>자기 설명</span><strong>{data.opinionEntries.length > 0 ? "표현 기록 있음" : "발견 중"}</strong><p>평가 없이 생각을 보관</p></div></div></section>
      {latest && <section className="parent-section coop-summary"><div className="section-title"><div><h2>최근 모험 이야기</h2><p>{new Date(latest.completedAt).toLocaleString("ko-KR")}</p></div></div><ul><li>{latest.playerNames.join("와 ")}이 역할을 나누어 {latest.completedMissions}개의 작전을 완성했습니다.</li><li>도움 단서를 {latest.hintCount}번 사용하고 {latest.retryCount}번 다시 시도했습니다.</li><li>{latest.specialSkill}을 사용해 숫자 보스의 약점을 발견했습니다.</li>{latest.thought && <li>오늘의 생각: “{latest.thought}”</li>}</ul></section>}
      {latest?.coopMetrics && <section className="parent-section"><div className="section-title"><div><h2>최근 협동 행동</h2><p>개인 비교 없이 함께한 행동만 집계합니다.</p></div></div><div className="mini-coop-metrics"><span>함께 완료 <strong>{latest.coopMetrics.jointMissionsCompleted}</strong></span><span>도움 단서 <strong>{latest.coopMetrics.hintsShared}</strong></span><span>설명 공유 <strong>{latest.coopMetrics.explanationsShared}</strong></span><span>차례 기다림 <strong>{latest.coopMetrics.waitedTurns}</strong></span><span>합동 스킬 <strong>{latest.coopMetrics.specialActivations}</strong></span></div></section>}
      <section className="safety-note"><strong>안전 범위</strong><p>보호자 Google 계정으로 연결하면 자녀 프로필·스테이지 진행도·학습 결과·보물 가방을 안전한 서버 경로로 동기화합니다. 아이의 자유 글과 보호자 관찰 메모는 현재 기기에만 남으며 공개 채팅, 위치, 결제 기능은 없습니다.</p></section>
    </main>
  );
}

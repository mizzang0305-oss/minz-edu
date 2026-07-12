"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createDefaultGameData, readGameData } from "@/stores/storage";
import type { StoredGameData } from "@/types/progress";

export function ParentDashboard() {
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  useEffect(() => {
    const timer = window.setTimeout(() => setData(readGameData()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const latest = data.playHistory.at(-1);
  return (
    <main className="parent-page"><div className="parent-heading"><div><span className="eyebrow">보호자 전용</span><h1>{data.playerProfile.displayName}의 모험 흐름</h1><p>정답 수나 다른 아이와의 순위 대신 시도·설명·협력 행동을 보여줍니다.</p></div><div className="parent-actions"><Link href="/parent/observation" className="primary-button">협동 UX 관찰</Link><Link href="/setup" className="secondary-button">설정 바꾸기</Link></div></div>
      <section className="summary-grid"><article><span>오늘 모험</span><strong>{latest ? "1회" : "아직 없음"}</strong><small>{latest ? `${data.parentSettings.playMinutes}분 모드` : "첫 모험을 기다려요"}</small></article><article><span>다시 도전</span><strong>{latest?.retryCount ?? 0}회</strong><small>시도 자체를 용기로 기록</small></article><article><span>힌트 사용</span><strong>{latest?.hintCount ?? 0}회</strong><small>도움받는 방법도 중요한 기술</small></article><article><span>협동 모험</span><strong>{data.coopBattleHistory.length}회</strong><small>비교 없는 공동 기록</small></article></section>
      <section className="parent-section"><div className="section-title"><div><h2>개념 발견 지도</h2><p>화면에는 단계 이름이 직접 노출되지 않습니다.</p></div></div><div className="concept-list"><div><span>10 만들기</span><strong>{data.conceptProgress["make-ten"]}</strong><p>10칸 틀에 블록을 직접 옮기는 활동</p></div><div><span>받아올림</span><strong>{data.conceptProgress["carrying-addition"]}</strong><p>10 묶음과 남은 수를 연결하는 활동</p></div><div><span>자기 설명</span><strong>{data.opinionEntries.length > 0 ? "표현 기록 있음" : "발견 중"}</strong><p>평가 없이 생각을 보관</p></div></div></section>
      {latest && <section className="parent-section coop-summary"><div className="section-title"><div><h2>최근 모험 이야기</h2><p>{new Date(latest.completedAt).toLocaleString("ko-KR")}</p></div></div><ul><li>{latest.playerNames.join("와 ")}이 역할을 나누어 {latest.completedMissions}개의 작전을 완성했습니다.</li><li>도움 단서를 {latest.hintCount}번 사용하고 {latest.retryCount}번 다시 시도했습니다.</li><li>{latest.specialSkill}을 사용해 숫자 보스의 약점을 발견했습니다.</li>{latest.thought && <li>오늘의 생각: “{latest.thought}”</li>}</ul></section>}
      {latest?.coopMetrics && <section className="parent-section"><div className="section-title"><div><h2>최근 협동 행동</h2><p>개인 비교 없이 함께한 행동만 집계합니다.</p></div></div><div className="mini-coop-metrics"><span>함께 완료 <strong>{latest.coopMetrics.jointMissionsCompleted}</strong></span><span>도움 단서 <strong>{latest.coopMetrics.hintsShared}</strong></span><span>설명 공유 <strong>{latest.coopMetrics.explanationsShared}</strong></span><span>차례 기다림 <strong>{latest.coopMetrics.waitedTurns}</strong></span><span>합동 스킬 <strong>{latest.coopMetrics.specialActivations}</strong></span></div></section>}
      <section className="safety-note"><strong>안전 범위</strong><p>모든 기록은 현재 브라우저의 localStorage에만 있습니다. 계정, 외부 전송, 공개 채팅, 위치, 결제 기능은 없습니다.</p></section>
    </main>
  );
}

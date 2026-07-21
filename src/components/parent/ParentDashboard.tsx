"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createDefaultGameData, readGameData, SESSION_REPORT_DELIVERY_EVENT, SESSION_REPORT_READY_EVENT } from "@/stores/storage";
import type { LearningSessionReport, StoredGameData } from "@/types/progress";
import { formatLearningStage, getLearningBattleProfile } from "@/learning/stages";
import { findLearningGoal } from "@/learning/curriculumCatalog";
import { analyzeGoalPerformance } from "@/learning/performanceAnalysis";
import { useGameSyncStatus } from "@/components/sync/GameSyncProvider";
import { GuardianLearningLogs } from "@/components/parent/GuardianLearningLogs";

type Props = {
  onlineAccountConnected: boolean;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}분 ${remainder}초` : `${remainder}초`;
}

function deliveryLabel(report: LearningSessionReport, onlineAccountConnected: boolean) {
  if (report.deliveryStatus === "sent") return "보호자 메일 발송 완료";
  if (!onlineAccountConnected) return "보호자 로그인 후 자동 발송 대기";
  if (report.deliveryStatus === "configuration-required") return "메일 발송 환경 설정 필요";
  if (report.deliveryStatus === "failed") return "발송 실패 · 자동 재시도 대기";
  return "자동 발송 대기 중";
}

export function ParentDashboard({ onlineAccountConnected }: Props) {
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  const syncStatus = useGameSyncStatus();

  useEffect(() => {
    const refresh = () => setData(readGameData());
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(SESSION_REPORT_DELIVERY_EVENT, refresh);
    window.addEventListener(SESSION_REPORT_READY_EVENT, refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SESSION_REPORT_DELIVERY_EVENT, refresh);
      window.removeEventListener(SESSION_REPORT_READY_EVENT, refresh);
    };
  }, []);

  const latest = data.playHistory.at(-1);
  const latestReport = data.sessionReports.at(-1);
  const profile = getLearningBattleProfile(data.playerProfile);
  const selectedGoal = findLearningGoal(data.playerProfile, data.parentSettings.selectedLearningGoalId, data.parentSettings.academicSemester);
  const goalProgress = data.learningGoalProgress[selectedGoal.id];
  const insight = analyzeGoalPerformance(goalProgress);
  const reportGoal = latestReport
    ? findLearningGoal(data.playerProfile, latestReport.goalId, data.parentSettings.academicSemester)
    : null;

  return (
    <main className="parent-page">
      <div className="parent-heading">
        <div>
          <span className="eyebrow">보호자 전용</span>
          <h1>{data.playerProfile.displayName}의 모험 흐름</h1>
          <p>문제 수·첫 시도 정답·재도전·힌트·실행 시간과 복습할 부분을 한눈에 봅니다.</p>
          {onlineAccountConnected && <span className={`sync-status ${syncStatus}`}>{syncStatus === "synced" ? "프로필·진행도·학습 결과·보물 동기화됨" : syncStatus === "error" ? "기기에는 안전하게 저장됨 · 연결 후 다시 동기화" : "Google 계정에 모험 기록 저장 중"}</span>}
        </div>
        <div className="parent-actions"><Link href="/children" className="primary-button">자녀 선택</Link><Link href="/parent/observation" className="secondary-button">협동 UX 관찰</Link><Link href="/setup" className="secondary-button">설정 바꾸기</Link></div>
      </div>

      <section className="summary-grid">
        <article><span>현재 단계</span><strong>{formatLearningStage(data.playerProfile)}</strong><small>{profile.conceptName} 모험 적용 중</small></article>
        <article><span>문제 기록</span><strong>{latestReport?.questionCount ?? 0}개</strong><small>가장 최근 세션 기준</small></article>
        <article><span>다시 도전</span><strong>{latestReport?.retryCount ?? 0}회</strong><small>틀린 답은 진행시키지 않고 다시 풀이</small></article>
        <article><span>실행 시간</span><strong>{latestReport ? formatDuration(latestReport.durationSeconds) : "기록 전"}</strong><small>화면을 닫은 세션도 로컬에 보존</small></article>
      </section>

      {latestReport && reportGoal && <section className="parent-section session-report-card">
        <div className="section-title"><div><h2>최근 학습 세션 분석</h2><p>{new Date(latestReport.completedAt).toLocaleString("ko-KR")} · {latestReport.source === "training" ? "훈련장" : "보스 전투"}</p></div><span className={`report-delivery-status is-${latestReport.deliveryStatus}`}>{deliveryLabel(latestReport, onlineAccountConnected)}</span></div>
        <div className="session-report-grid">
          <article><span>학습 목표</span><strong>{reportGoal.week}주차 · {latestReport.goalTitle ?? reportGoal.title}</strong><small>{latestReport.learningObjective ?? reportGoal.objective}</small></article>
          <article><span>풀이 결과</span><strong>{latestReport.correctCount}/{latestReport.questionCount} 정답 확인</strong><small>첫 시도 정답 {latestReport.firstTryCorrect}개 · 힌트 {latestReport.hintCount}회</small></article>
          <article><span>약한 부분</span><strong>{latestReport.weakSkillTag ? reportGoal.title : "뚜렷한 경고 없음"}</strong><small>{latestReport.weakSkillTag ? "재도전 또는 힌트를 사용해 다음 연습 대상으로 표시했습니다." : "한 번의 결과만으로 능력을 단정하지 않습니다."}</small></article>
        </div>
        {latestReport.deliveryStatus !== "sent" && <button type="button" className="secondary-button report-retry-button" onClick={() => window.dispatchEvent(new Event(SESSION_REPORT_READY_EVENT))}>{onlineAccountConnected ? "요약 메일 다시 보내기" : "보호자 로그인 후 자동 발송"}</button>}
      </section>}

      <section className="parent-section learning-plan-summary">
        <div className="section-title"><div><h2>{data.parentSettings.academicSemester}학기 주별 학습 경로</h2><p>완료한 주차와 재도전 기록을 남겨 같은 목표만 반복하지 않도록 합니다.</p></div><Link href="/goals" className="secondary-button">주차·목표 바꾸기</Link></div>
        <div className="concept-list"><div><span>현재 목표</span><strong>{selectedGoal.week}주차 · {selectedGoal.title}</strong><p>{selectedGoal.objective}</p></div><div><span>{insight.label} · 강한 점</span><strong>{insight.strength}</strong><p>문항 {goalProgress?.questionCount ?? 0}개 · 훈련 {goalProgress?.attempts ?? 0}회</p></div><div><span>다음 연습</span><strong>{insight.nextPractice}</strong><p><Link href={`/training?goal=${selectedGoal.id}`}>이 목표 훈련장 열기 →</Link></p></div></div>
      </section>

      {latest && <section className="parent-section coop-summary"><div className="section-title"><div><h2>최근 모험 이야기</h2><p>{new Date(latest.completedAt).toLocaleString("ko-KR")}</p></div></div><ul><li>{latest.playerNames.join("와 ")}가 함께 나누어 {latest.completedMissions}개의 작전을 완성했습니다.</li><li>힌트를 {latest.hintCount}회 사용하고 {latest.retryCount}회 다시 시도했습니다.</li><li>{latest.specialSkill}을 사용해 수호자의 약점을 발견했습니다.</li>{latest.thought && <li>오늘의 생각: “{latest.thought}”</li>}</ul></section>}

      <section className="safety-note"><strong>개인정보·평가 안전 범위</strong><p>메일에는 문제 원문, 아이의 자유 글, 계정 식별자나 다른 아이와의 순위를 넣지 않고 세션 합계만 보냅니다. 공개 채팅·위치·결제 기능은 없습니다.</p></section>
      {onlineAccountConnected && <GuardianLearningLogs />}
    </main>
  );
}

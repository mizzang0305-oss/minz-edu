"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readGameData, saveThought } from "@/stores/storage";
import type { AdventureRecord } from "@/types/progress";

export function ResultClient() {
  const [record, setRecord] = useState<AdventureRecord | null>(null);
  const [thought, setThought] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const history = readGameData().playHistory;
      const latest = history.at(-1) ?? null;
      setRecord(latest);
      setThought(latest?.thought ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!record) return <div className="empty-state"><h1>아직 열린 보물 상자가 없어요.</h1><Link href="/world" className="primary-button">모험 지도로</Link></div>;

  return (
    <main className="result-page">
      <section className="result-hero"><div className="chest" aria-hidden="true"><span>★</span></div><span className="eyebrow">오늘의 모험 결과</span><h1>{record.playerNames.join("와 ")}, 멋진 작전이었어!</h1><p>블록을 옮기고, 다시 시도하고, 함께 생각한 모든 행동이 보물이 됐어.</p></section>
      <section className="result-grid"><article className="result-card highlight"><span className="card-icon">⚡</span><h2>{record.specialSkill}</h2><p>서로 다른 길이 같은 답으로 만나는 것을 발견했어.</p></article><article className="result-card"><span className="card-icon">🧩</span><h2>10 만들기</h2><p>8에 2를 모아 10을 만들고, 남은 5를 더했어.</p></article><article className="result-card"><span className="card-icon">🏅</span><h2>새 보물</h2><p>{record.badges.join(" · ")}{record.teamRewards.length > 0 ? ` · ${record.teamRewards.join(" · ")}` : ""}</p></article></section>
      <section className="thought-card"><span className="mission-kind">생각 보관함</span><h2>오늘 어떤 공격이 가장 멋졌어?</h2><p>어떤 말을 적어도 좋아. 평가하지 않고 그대로 보관할게.</p><textarea value={thought} maxLength={240} placeholder="예: 두 드래곤이 합쳐질 때가 멋졌어!" onChange={(event) => { setThought(event.target.value); setSaved(false); }} /><button className="primary-button" disabled={!thought.trim()} onClick={() => { saveThought(record.id, thought.trim()); setSaved(true); }}>내 생각 보관하기</button><span className="save-note" aria-live="polite">{saved ? "오늘의 생각을 이 기기에 보관했어." : `${thought.length}/240`}</span></section>
      <div className="result-actions"><Link href="/world" className="secondary-button">다른 모험 보기</Link><Link href="/battle" className="primary-button">새로운 작전으로 다시 도전</Link></div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createDefaultGameData, readGameData, saveObservation } from "@/stores/storage";
import type {
  AdventureRecord,
  CoopObservationRecord,
  ObservationRating,
  StoredGameData,
} from "@/types/progress";

type ObservationDraft = Omit<CoopObservationRecord, "id" | "adventureId" | "observedAt">;

const DEFAULT_DRAFT: ObservationDraft = {
  turnClarity: 3,
  waitComfort: 3,
  helpOccurred: "partly",
  specialSatisfaction: 3,
  askedToReplay: false,
  notes: "",
};

function RatingField({
  legend,
  name,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  value: ObservationRating;
  onChange: (value: ObservationRating) => void;
}) {
  return (
    <fieldset className="observation-field rating-field">
      <legend>{legend}</legend>
      <div className="rating-options">
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <label key={rating} className={value === rating ? "rating-option selected" : "rating-option"}>
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
            />
            <strong>{rating}</strong>
            <span>{rating === 1 ? "관찰 필요" : rating === 5 ? "매우 자연스러움" : ""}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AutomaticMetrics({ adventure }: { adventure: AdventureRecord }) {
  const metrics = adventure.coopMetrics;
  if (!metrics) return null;
  return (
    <section className="automatic-metrics" aria-labelledby="automatic-metrics-title">
      <div className="section-title">
        <div>
          <h2 id="automatic-metrics-title">게임이 자동 기록한 협력 행동</h2>
          <p>정답 수나 개인 점수는 기록하지 않습니다.</p>
        </div>
      </div>
      <div className="observation-metric-grid">
        <article><span>함께 완료</span><strong>{metrics.jointMissionsCompleted}</strong><small>협동 심화 작전</small></article>
        <article><span>도움 단서</span><strong>{metrics.hintsShared}</strong><small>힌트·응원 선택</small></article>
        <article><span>설명 공유</span><strong>{metrics.explanationsShared}</strong><small>서로 다른 풀이 연결</small></article>
        <article><span>차례 기다림</span><strong>{metrics.waitedTurns}</strong><small>턴을 넘긴 횟수</small></article>
        <article><span>다시 도전</span><strong>{metrics.retries}</strong><small>링크 손실 없음</small></article>
        <article><span>합동 스킬</span><strong>{metrics.specialActivations}</strong><small>둘이 함께 발동</small></article>
      </div>
    </section>
  );
}

export function CoopObservationForm() {
  const [data, setData] = useState<StoredGameData>(createDefaultGameData());
  const [draft, setDraft] = useState<ObservationDraft>(DEFAULT_DRAFT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readGameData();
      const latest = stored.coopBattleHistory.at(-1);
      const existing = latest
        ? stored.observationRecords.find((record) => record.adventureId === latest.id)
        : undefined;
      setData(stored);
      if (existing) {
        setDraft({
          turnClarity: existing.turnClarity,
          waitComfort: existing.waitComfort,
          helpOccurred: existing.helpOccurred,
          specialSatisfaction: existing.specialSatisfaction,
          askedToReplay: existing.askedToReplay,
          notes: existing.notes,
        });
        setSaved(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const latest = data.coopBattleHistory.at(-1);
  if (!latest) {
    return (
      <main className="observation-page">
        <span className="eyebrow">보호자 전용 · 협동 UX</span>
        <h1>관찰할 협동 모험이 아직 없습니다</h1>
        <p>같은 기기 2인 모험을 한 번 완료하면 자동 협력 기록과 관찰지가 열립니다.</p>
        <Link href="/setup" className="primary-button">2인 모험 준비하기</Link>
      </main>
    );
  }

  const updateDraft = <K extends keyof ObservationDraft>(key: K, value: ObservationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return (
    <main className="observation-page">
      <div className="observation-heading">
        <div>
          <span className="eyebrow">보호자 전용 · 협동 UX</span>
          <h1>2인 모험 관찰 기록</h1>
          <p>{latest.playerNames.join(" · ")} · {new Date(latest.completedAt).toLocaleString("ko-KR")}</p>
        </div>
        <Link href="/parent" className="secondary-button">대시보드로</Link>
      </div>

      <AutomaticMetrics adventure={latest} />

      <form
        className="observation-form"
        onSubmit={(event) => {
          event.preventDefault();
          const record: CoopObservationRecord = {
            id: `observation-${crypto.randomUUID()}`,
            adventureId: latest.id,
            observedAt: new Date().toISOString(),
            ...draft,
          };
          setData(saveObservation(record));
          setSaved(true);
        }}
      >
        <div className="section-title">
          <div><h2>세션 직후 2분 관찰지</h2><p>아이에게 점수를 묻지 말고 보호자가 실제 행동만 기록합니다.</p></div>
        </div>

        <RatingField legend="누구 차례인지 두 아이가 쉽게 알아차렸나요?" name="turnClarity" value={draft.turnClarity} onChange={(value) => updateDraft("turnClarity", value)} />
        <RatingField legend="기다리는 시간이 편안하고 짧게 느껴졌나요?" name="waitComfort" value={draft.waitComfort} onChange={(value) => updateDraft("waitComfort", value)} />

        <fieldset className="observation-field">
          <legend>서로 설명하거나 도와주는 행동이 실제로 있었나요?</legend>
          <div className="choice-observation">
            {([
              ["yes", "분명히 있었음"],
              ["partly", "조금 있었음"],
              ["no", "관찰되지 않음"],
            ] as const).map(([value, label]) => (
              <label key={value} className={draft.helpOccurred === value ? "selected" : ""}>
                <input type="radio" name="helpOccurred" checked={draft.helpOccurred === value} onChange={() => updateDraft("helpOccurred", value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <RatingField legend="합동 필살기 순간의 만족도와 반응은 어땠나요?" name="specialSatisfaction" value={draft.specialSatisfaction} onChange={(value) => updateDraft("specialSatisfaction", value)} />

        <label className="replay-check">
          <input type="checkbox" checked={draft.askedToReplay} onChange={(event) => updateDraft("askedToReplay", event.target.checked)} />
          <span>아이가 먼저 “다시 하자” 또는 비슷한 의사를 표현함</span>
        </label>

        <label className="observation-notes">
          관찰 메모
          <textarea
            value={draft.notes}
            maxLength={800}
            placeholder="예: 친구 차례에는 화면을 가리키며 기다렸고, 두 방법 문제에서 서로 설명하려고 했음"
            onChange={(event) => updateDraft("notes", event.target.value)}
          />
          <small>{draft.notes.length}/800 · 이름, 연락처 등 개인정보는 적지 마세요.</small>
        </label>

        <button type="submit" className="primary-button wide">관찰 기록 저장</button>
        <p className="save-note" role="status" aria-live="polite">{saved ? "이 기기에 관찰 기록을 저장했습니다." : "저장 전입니다."}</p>
      </form>
    </main>
  );
}

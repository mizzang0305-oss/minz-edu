"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParentSettings } from "@/types/progress";
import { DEFAULT_SETTINGS, readGameData, saveSettings } from "@/stores/storage";

const roles = [
  ["attack", "번개 검사"],
  ["defense", "숲 방패기사"],
  ["magic", "불꽃 마법사"],
  ["support", "별빛 도우미"],
] as const;

export function SetupForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<ParentSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettings(readGameData().parentSettings), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return (
    <form
      className="setup-form"
      onSubmit={(event) => {
        event.preventDefault();
        saveSettings(settings);
        setSaved(true);
        router.push("/world");
      }}
    >
      <section className="form-section">
        <div className="section-heading">
          <span className="step-chip">1</span>
          <div><h2>주인공 설정</h2><p>아이 화면에는 모험 이름으로만 보여요.</p></div>
        </div>
        <div className="field-grid">
          <label>아이 이름<input value={settings.playerName} maxLength={12} onChange={(event) => update("playerName", event.target.value)} /></label>
          <label>학년<select value={settings.grade} onChange={(event) => update("grade", Number(event.target.value))}>{[1,2,3,4,5,6].map((grade) => <option key={grade} value={grade}>초등 {grade}학년</option>)}</select></label>
          <label>현재 수준<select value={settings.level} onChange={(event) => update("level", event.target.value as ParentSettings["level"])}><option value="foundation">기초 다지기</option><option value="grade">학년 흐름</option><option value="advanced">깊이 탐험</option></select></label>
          <label>하루 모험 시간<select value={settings.playMinutes} onChange={(event) => update("playMinutes", Number(event.target.value) as 5 | 10 | 15)}><option value={5}>가볍게 탐험 · 5분</option><option value={10}>기본 모험 · 10분</option><option value={15}>보스 도전 · 15분</option></select></label>
        </div>
        <fieldset className="role-picker"><legend>주인공 직업</legend>{roles.map(([value, label]) => <label key={value} className={settings.role === value ? "role-option selected" : "role-option"}><input type="radio" name="role" value={value} checked={settings.role === value} onChange={() => update("role", value)} /><span>{label}</span></label>)}</fieldset>
      </section>

      <section className="form-section">
        <div className="section-heading">
          <span className="step-chip">2</span>
          <div><h2>모험 방식</h2><p>같은 기기 협동은 네트워크 없이 작동해요.</p></div>
        </div>
        <div className="mode-picker">
          <label className={settings.mode === "solo" ? "mode-card selected" : "mode-card"}>
            <input type="radio" name="mode" checked={settings.mode === "solo"} onChange={() => update("mode", "solo")} />
            <strong>혼자 모험</strong><span>민표가 숫자 슬라임과 대결해요.</span>
          </label>
          <label className={settings.mode === "local-shared-screen" ? "mode-card selected" : "mode-card"}>
            <input type="radio" name="mode" checked={settings.mode === "local-shared-screen"} onChange={() => update("mode", "local-shared-screen")} />
            <strong>친구와 같은 화면</strong><span>차례를 나누고 합동 필살기를 써요.</span>
          </label>
        </div>
        {settings.mode === "local-shared-screen" && (
          <div className="friend-panel" data-testid="friend-settings">
            <label>친구 이름<input value={settings.friendName} maxLength={12} onChange={(event) => update("friendName", event.target.value)} /></label>
            <label>친구 학년<select value={settings.friendGrade} onChange={(event) => update("friendGrade", Number(event.target.value))}>{[1,2,3,4,5,6].map((grade) => <option key={grade} value={grade}>초등 {grade}학년</option>)}</select></label>
            <label>친구 직업<select value={settings.friendRole} onChange={(event) => update("friendRole", event.target.value as ParentSettings["friendRole"])}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
        )}
      </section>

      <section className="form-section compact">
        <div className="section-heading"><span className="step-chip">3</span><div><h2>편안한 화면</h2><p>효과를 줄여도 보상과 진행은 같아요.</p></div></div>
        <label className="range-label">효과음 크기 <output>{settings.soundVolume}%</output><input type="range" min="0" max="100" step="10" value={settings.soundVolume} onChange={(event) => update("soundVolume", Number(event.target.value))} /></label>
        <label>화면 움직임<select value={settings.shakeIntensity} onChange={(event) => update("shakeIntensity", Number(event.target.value) as 0 | 1 | 2)}><option value={0}>끄기</option><option value={1}>약하게</option><option value={2}>보통</option></select></label>
      </section>
      <button className="primary-button wide" type="submit">설정 저장하고 모험 지도로</button>
      <p className="save-note" aria-live="polite">{saved ? "설정이 이 기기에 저장됐어요." : "모든 기록은 이 기기에만 저장됩니다."}</p>
    </form>
  );
}

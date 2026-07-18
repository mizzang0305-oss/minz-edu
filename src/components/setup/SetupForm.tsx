"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParentSettings } from "@/types/progress";
import type { SchoolLevel } from "@/types/learning";
import { SCHOOL_LEVEL_GRADES, SCHOOL_LEVEL_LABELS } from "@/learning/stages";
import { getWeeklyLearningGoals } from "@/learning/curriculumCatalog";
import { DEFAULT_SETTINGS, readGameData, saveSettings } from "@/stores/storage";
import { CHARACTERS } from "@/types/loadout";

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettings(readGameData().parentSettings);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const changeStage = (schoolLevel: SchoolLevel, friend = false) => {
    const firstGrade = SCHOOL_LEVEL_GRADES[schoolLevel][0];
    setSettings((current) => friend
      ? { ...current, friendSchoolLevel: schoolLevel, friendGrade: firstGrade }
      : { ...current, schoolLevel, grade: firstGrade, selectedLearningGoalId: getWeeklyLearningGoals({ schoolLevel, grade: firstGrade }, current.academicSemester)[0].id });
    setSaved(false);
  };

  const changeGrade = (grade: number) => {
    setSettings((current) => ({ ...current, grade, selectedLearningGoalId: getWeeklyLearningGoals({ schoolLevel: current.schoolLevel, grade }, current.academicSemester)[0].id }));
    setSaved(false);
  };

  const gradeLabel = (schoolLevel: SchoolLevel, grade: number) => schoolLevel === "kindergarten"
    ? `${grade}세`
    : `${grade}학년`;

  return (
    <form
      className="setup-form"
      onSubmit={(event) => {
        event.preventDefault();
        saveSettings(settings);
        setSaved(true);
        router.push("/goals");
      }}
    >
      <section className="form-section">
        <div className="section-heading">
          <span className="step-chip">1</span>
          <div><h2>주인공 설정</h2><p>아이 화면에는 모험 이름으로만 보여요.</p></div>
        </div>
        <div className="field-grid">
          <label>아이 이름<input value={settings.playerName} maxLength={12} onChange={(event) => update("playerName", event.target.value)} /></label>
          <label>학습 단계<select value={settings.schoolLevel} onChange={(event) => changeStage(event.target.value as SchoolLevel)}>{Object.entries(SCHOOL_LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>{settings.schoolLevel === "kindergarten" ? "나이" : "학년"}<select value={settings.grade} onChange={(event) => changeGrade(Number(event.target.value))}>{SCHOOL_LEVEL_GRADES[settings.schoolLevel].map((grade) => <option key={grade} value={grade}>{gradeLabel(settings.schoolLevel, grade)}</option>)}</select></label>
          <label>학기<select value={settings.academicSemester} onChange={(event) => { const semester = Number(event.target.value) as 1 | 2; setSettings((current) => ({ ...current, academicSemester: semester, selectedLearningGoalId: getWeeklyLearningGoals(current, semester)[0].id })); setSaved(false); }}><option value={1}>1학기</option><option value={2}>2학기 · 지금 추천</option></select></label>
          <label>현재 수준<select value={settings.level} onChange={(event) => update("level", event.target.value as ParentSettings["level"])}><option value="foundation">기초 다지기</option><option value="grade">학년 흐름</option><option value="advanced">깊이 탐험</option></select></label>
          <label>하루 모험 시간<select value={settings.playMinutes} onChange={(event) => update("playMinutes", Number(event.target.value) as 5 | 10 | 15)}><option value={5}>가볍게 탐험 · 5분</option><option value={10}>기본 모험 · 10분</option><option value={15}>보스 도전 · 15분</option></select></label>
        </div>
        <p className="save-note">저장 후 수학 8주차·국어 9주차·영어 10주차 추천 경로에서 시작 목표를 고를 수 있습니다.</p>
        <fieldset className="character-picker"><legend>게임 캐릭터 선택</legend><div className="character-choice-grid">{CHARACTERS.map((character) => <label key={character.id} className={settings.characterId === character.id ? "character-choice selected" : "character-choice"}><input type="radio" name="character" value={character.id} checked={settings.characterId === character.id} onChange={() => setSettings((current) => ({ ...current, characterId: character.id, selectedSkillId: character.defaultSkillId, role: character.id === "flame-mage" ? "magic" : "attack" }))} /><Image src={character.asset} alt={`${character.name} ${character.job}`} width={420} height={304} /><strong>{character.name}</strong><span>{character.job}</span></label>)}</div></fieldset>
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
            <strong>혼자 모험</strong><span>민표가 지역 수호자의 혼란을 풀어요.</span>
          </label>
          <label className={settings.mode === "local-shared-screen" ? "mode-card selected" : "mode-card"}>
            <input type="radio" name="mode" checked={settings.mode === "local-shared-screen"} onChange={() => update("mode", "local-shared-screen")} />
            <strong>친구와 같은 화면</strong><span>차례를 나누고 합동 필살기를 써요.</span>
          </label>
        </div>
        {settings.mode === "local-shared-screen" && (
          <div className="friend-panel" data-testid="friend-settings">
            <label>친구 이름<input value={settings.friendName} maxLength={12} onChange={(event) => update("friendName", event.target.value)} /></label>
            <label>친구 학습 단계<select value={settings.friendSchoolLevel} onChange={(event) => changeStage(event.target.value as SchoolLevel, true)}>{Object.entries(SCHOOL_LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>{settings.friendSchoolLevel === "kindergarten" ? "친구 나이" : "친구 학년"}<select value={settings.friendGrade} onChange={(event) => update("friendGrade", Number(event.target.value))}>{SCHOOL_LEVEL_GRADES[settings.friendSchoolLevel].map((grade) => <option key={grade} value={grade}>{gradeLabel(settings.friendSchoolLevel, grade)}</option>)}</select></label>
            <label>친구 직업<select value={settings.friendRole} onChange={(event) => update("friendRole", event.target.value as ParentSettings["friendRole"])}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
        )}
      </section>

      <section className="form-section compact">
        <div className="section-heading"><span className="step-chip">3</span><div><h2>편안한 화면</h2><p>효과를 줄여도 보상과 진행은 같아요.</p></div></div>
        <label className="range-label">효과음 크기 <output>{settings.soundVolume}%</output><input type="range" min="0" max="100" step="10" value={settings.soundVolume} onChange={(event) => update("soundVolume", Number(event.target.value))} /></label>
        <label>화면 움직임<select value={settings.shakeIntensity} onChange={(event) => update("shakeIntensity", Number(event.target.value) as 0 | 1 | 2)}><option value={0}>끄기</option><option value={1}>약하게</option><option value={2}>보통</option></select></label>
      </section>
      <button className="primary-button wide" type="submit" disabled={!hydrated}>
        {hydrated ? "저장하고 주별 학습 목표 고르기" : "모험 설정 불러오는 중…"}
      </button>
      <p className="save-note" aria-live="polite">{saved ? "기기에 저장했어요. 계정 연결 시 다른 기기에도 이어집니다." : "기기에 먼저 저장하고, 보호자 계정 연결 시 안전하게 동기화합니다."}</p>
    </form>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SCHOOL_LEVEL_GRADES, SCHOOL_LEVEL_LABELS } from "@/learning/stages";
import type { SchoolLevel } from "@/types/learning";
import type { SafeChildProfile } from "@/services/online/childProfileSync";
import {
  activateChildProfile,
  getActiveChildProfileId,
} from "@/stores/storage";

type ChildListResponse = { children?: SafeChildProfile[]; error?: string };

async function readJson<T>(response: Response) {
  return await response.json() as T;
}

export function ChildProfileSelector() {
  const router = useRouter();
  const [children, setChildren] = useState<SafeChildProfile[]>([]);
  const [activeId, setActiveId] = useState("primary");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>("kindergarten");
  const [grade, setGrade] = useState(SCHOOL_LEVEL_GRADES.kindergarten[0]);

  useEffect(() => {
    let active = true;
    void fetch("/api/guardian/children", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await readJson<ChildListResponse>(response);
        if (!response.ok) throw new Error(result.error ?? "자녀 프로필을 불러오지 못했습니다.");
        if (!active) return;
        setChildren(result.children ?? []);
        setActiveId(getActiveChildProfileId());
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "자녀 프로필을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const selectChild = (child: SafeChildProfile, destination: "/world" | "/setup") => {
    if (!activateChildProfile(child)) {
      setError("자녀 프로필을 선택하지 못했습니다.");
      return;
    }
    setActiveId(child.id);
    router.push(destination);
  };

  const createChild = async () => {
    const safeName = displayName.trim();
    if (!safeName) {
      setError("아이의 모험 이름을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
      const csrf = await readJson<{ csrfToken?: string }>(csrfResponse);
      if (!csrfResponse.ok || typeof csrf.csrfToken !== "string") throw new Error("보안 확인을 준비하지 못했습니다.");
      const response = await fetch("/api/guardian/children", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createNew: true,
          displayName: safeName,
          schoolLevel,
          grade,
          characterId: "thunder-sword",
          csrfToken: csrf.csrfToken,
        }),
      });
      const result = await readJson<{ child?: SafeChildProfile; error?: string }>(response);
      if (!response.ok || !result.child) throw new Error(result.error ?? "새 모험가를 만들지 못했습니다.");
      setChildren((current) => [...current, result.child as SafeChildProfile]);
      selectChild(result.child, "/setup");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "새 모험가를 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="child-selector-loading" role="status">모험가 명단을 펼치는 중…</div>;

  return (
    <div className="child-selector-shell">
      {error && <p className="child-selector-error" role="alert">{error}</p>}
      <section className="child-card-grid" aria-label="자녀 프로필 선택">
        {children.map((child, index) => (
          <article className={child.id === activeId ? "child-profile-card active" : "child-profile-card"} key={child.id}>
            <span className="child-card-status">{child.id === activeId ? "현재 모험가" : `모험가 ${index + 1}`}</span>
            <Image
              src={index % 2 === 0 ? "/game-assets/duelyst/hero-thunder.webp" : "/game-assets/duelyst/hero-magic.webp"}
              alt=""
              width={420}
              height={304}
            />
            <h2>{child.displayName}</h2>
            <p>{SCHOOL_LEVEL_LABELS[child.schoolLevel]} · {child.schoolLevel === "kindergarten" ? `${child.grade}세` : `${child.grade}학년`}</p>
            <div className="child-card-actions">
              <button className="primary-button" type="button" onClick={() => selectChild(child, "/world")}>이 모험가로 출발</button>
              <button className="secondary-button" type="button" onClick={() => selectChild(child, "/setup")}>설정 바꾸기</button>
            </div>
          </article>
        ))}
        <button className="child-create-card" type="button" onClick={() => setShowCreate((current) => !current)}>
          <span aria-hidden="true">＋</span>
          <strong>새 모험가 추가</strong>
          <small>형제·자매의 기록을 따로 보관해요</small>
        </button>
      </section>

      {(showCreate || children.length === 0) && (
        <section className="child-create-panel">
          <div><span className="eyebrow">NEW ADVENTURER</span><h2>새로운 모험가를 불러요</h2><p>각 아이의 스테이지·학습 결과·보물은 서로 섞이지 않아요.</p></div>
          <div className="child-create-fields">
            <label>모험 이름<input value={displayName} maxLength={20} autoComplete="off" onChange={(event) => setDisplayName(event.target.value)} /></label>
            <label>학습 단계<select value={schoolLevel} onChange={(event) => { const next = event.target.value as SchoolLevel; setSchoolLevel(next); setGrade(SCHOOL_LEVEL_GRADES[next][0]); }}>{Object.entries(SCHOOL_LEVEL_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>{schoolLevel === "kindergarten" ? "나이" : "학년"}<select value={grade} onChange={(event) => setGrade(Number(event.target.value))}>{SCHOOL_LEVEL_GRADES[schoolLevel].map((item) => <option value={item} key={item}>{schoolLevel === "kindergarten" ? `${item}세` : `${item}학년`}</option>)}</select></label>
            <button className="primary-button" type="button" disabled={saving} onClick={() => void createChild()}>{saving ? "모험가를 부르는 중…" : "모험가 만들기"}</button>
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { STORAGE_KEY } from "@/stores/storage";

function subscribeToProfile(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getProfileSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}

export function AdventureStartLink() {
  const hasProfile = useSyncExternalStore(subscribeToProfile, getProfileSnapshot, () => false);

  return (
    <Link href={hasProfile ? "/world" : "/setup"} className="game-start-button">
      <span aria-hidden="true">▶</span>
      <strong>{hasProfile ? "모험 이어하기" : "내 영웅 만들기"}</strong>
      <small>{hasProfile ? "오늘의 길로 출발" : "나이와 학습 목표 고르기"}</small>
    </Link>
  );
}

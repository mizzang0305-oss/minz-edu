import type { Metadata } from "next";
import { LearningBattlePoc } from "@/components/game-poc/LearningBattlePoc";

export const metadata: Metadata = {
  title: "민즈 결계전 · Phaser 학습 전투 PoC",
  description: "수학 문제를 풀어 공격과 스페셜 스킬을 여는 2D 학습 전투 실험",
};

export default function GamePocPage() {
  return <LearningBattlePoc />;
}

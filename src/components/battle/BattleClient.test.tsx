import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BattleClient } from "./BattleClient";
import { createDefaultGameData, writeGameData } from "@/stores/storage";

vi.mock("@/components/game/PhaserStage", () => ({
  PhaserStage: ({ battle, onExploreComplete }: { battle: { message: string }; onExploreComplete: () => void }) => (
    <div>
      <span data-testid="scene-message">{battle.message}</span>
      <button type="button" onClick={onExploreComplete}>탐험 완료</button>
    </div>
  ),
}));

vi.mock("@/utils/audioFeedback", () => ({
  playBattleTone: vi.fn(),
  speakBattleLine: vi.fn(),
}));

describe("BattleClient learning goal binding", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.history.replaceState({}, "", "/battle");
  });

  function storeElementaryGoal(goalId: string) {
    const data = createDefaultGameData();
    data.parentSettings = { ...data.parentSettings, selectedLearningGoalId: goalId };
    writeGameData(data);
  }

  function storeLearningStage(schoolLevel: "kindergarten" | "elementary" | "middle", grade: number) {
    const data = createDefaultGameData();
    data.playerProfile = { ...data.playerProfile, schoolLevel, grade };
    data.parentSettings = { ...data.parentSettings, schoolLevel, grade };
    writeGameData(data);
  }

  async function finishExplorationAndStart() {
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "탐험 완료" }));
  }

  it("수호자 상호작용 직후 별도 시작 버튼 없이 전투 문제가 열린다", async () => {
    render(<BattleClient />);
    await finishExplorationAndStart();
    expect(await screen.findByRole("heading", { name: "352에서 5가 나타내는 값은?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "학습 작전 시작" })).not.toBeInTheDocument();
  });

  it("TenFrame 비호환 수학 목표는 선택 목표의 첫 문항으로 시작한다", async () => {
    storeElementaryGoal("elementary-2-s2-math-w8");
    window.history.replaceState({}, "", "/battle?stage=number-forest&goal=elementary-2-s2-math-w8");
    render(<BattleClient />);

    await finishExplorationAndStart();

    expect(await screen.findByRole("heading", { name: "352에서 5가 나타내는 값은?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1번째 블록 옮기기" })).not.toBeInTheDocument();
    expect(screen.getByTestId("scene-message")).toHaveTextContent("세 자리 수 결계");
  });

  it("스테이지가 목표와 다르면 해당 스테이지 목표와 문제를 함께 교체한다", async () => {
    storeElementaryGoal("elementary-2-s2-math-w8");
    window.history.replaceState({}, "", "/battle?stage=word-island&goal=elementary-2-s2-math-w8");
    render(<BattleClient />);

    await finishExplorationAndStart();

    expect(await screen.findByRole("heading", { name: "‘민수는 매일 화분에 물을 줍니다. 햇빛도 잘 받게 합니다.’의 중요 내용은?" })).toBeInTheDocument();
    expect(screen.getByTestId("scene-message")).toHaveTextContent("중요 내용 찾기 결계");
  });

  it("보스 공격은 문제 오답 때 보호막을 줄이고 정답 때 회피·반격으로 바뀐다", async () => {
    storeElementaryGoal("elementary-2-s2-math-w8");
    render(<BattleClient />);
    await finishExplorationAndStart();
    const user = userEvent.setup();

    expect(screen.getByText(/씨앗 파동 (준비|접근)/)).toBeInTheDocument();
    expect(screen.getByText(/정답을 맞히면 직접 공격 버튼/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /공격! 짧게/ })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "5" }));
    expect(screen.getByText(/보호막이 막아 줬어. 다시 회피해 보자!/)).toBeInTheDocument();
    expect(screen.getByText(/5는 십의 자리에 있어요./)).toBeInTheDocument();
    expect(screen.getByText("보호막 17")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "50" }));
    expect(screen.getByText(/50, 회피 성공!/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "스킬을 고르고 직접 공격!" })).toBeInTheDocument();
    expect(screen.getAllByText(/공격을 피한 뒤 반격/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /번개 베기/ }));
    expect(screen.getByRole("button", { name: /공격! 짧게/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /공격! 짧게/ }));
    expect(await screen.findByRole("heading", { name: "407과 470 중 더 큰 수는?" })).toBeInTheDocument();
  });

  it("유아에게 6초의 느린 보스 공격 예고를 보여준다", async () => {
    storeLearningStage("kindergarten", 6);
    render(<BattleClient />);

    await finishExplorationAndStart();

    expect(await screen.findByText(/씨앗 파동 준비 6초/)).toBeInTheDocument();
    expect(screen.getByText(/천천히 준비/)).toBeInTheDocument();
  });

  it("초등 고학년에게 4초의 조금 빠른 보스 공격 예고를 보여준다", async () => {
    storeLearningStage("elementary", 5);
    render(<BattleClient />);

    await finishExplorationAndStart();

    expect(await screen.findByText(/씨앗 파동 준비 4초/)).toBeInTheDocument();
    expect(screen.getByText(/빠르게 집중/)).toBeInTheDocument();
  });

  it("학습 문제를 전투 화면 내부 명령 콘솔에 표시한다", async () => {
    render(<BattleClient />);

    await finishExplorationAndStart();

    const console = await screen.findByTestId("battle-command-console");
    expect(console).toHaveAccessibleName("전투 학습 명령");
    expect(console.closest(".battle-overlay-dock.is-combat")?.parentElement).toHaveClass("battle-visual");
    expect(screen.getByRole("heading", { name: "352에서 5가 나타내는 값은?" })).toBeInTheDocument();
  });

  it("장착한 방어구가 시작 보호막에 실제 보너스를 준다", async () => {
    const data = createDefaultGameData();
    data.inventory.ownedItemIds.push("forest-armor");
    data.inventory.equippedArmorId = "forest-armor";
    writeGameData(data);
    render(<BattleClient />);

    expect(await screen.findByText("보호막 35")).toBeInTheDocument();
  });

  it("강화한 방어구가 더 큰 시작 보호막을 준다", async () => {
    const data = createDefaultGameData();
    data.inventory.ownedItemIds.push("forest-armor");
    data.inventory.equippedArmorId = "forest-armor";
    data.inventory.upgradeLevels["forest-armor"] = 5;
    writeGameData(data);
    render(<BattleClient />);

    expect(await screen.findByText("보호막 55")).toBeInTheDocument();
  });
});

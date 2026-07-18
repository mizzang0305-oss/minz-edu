import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultGameData, parseStoredGameData, STORAGE_KEY } from "@/stores/storage";
import { TrainingClient } from "./TrainingClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("TrainingClient", () => {
  beforeEach(() => localStorage.clear());

  const tapTwiceInOneFrame = (button: HTMLElement) => act(() => {
    button.click();
    button.click();
  });

  it("빠른 연속 탭으로 문항을 건너뛰거나 힌트를 중복 기록하지 않는다", async () => {
    render(<TrainingClient />);

    await screen.findByRole("heading", { name: "352에서 5가 나타내는 값은?" });
    tapTwiceInOneFrame(screen.getByRole("button", { name: "힌트 보기" }));
    tapTwiceInOneFrame(screen.getByRole("button", { name: "50" }));

    expect(screen.getByRole("heading", { name: "352에서 5가 나타내는 값은?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "해설 확인하고 다음 문제" }));
    await screen.findByRole("heading", { name: "407과 470 중 더 큰 수는?" });
    fireEvent.click(screen.getByRole("button", { name: "470" }));
    fireEvent.click(screen.getByRole("button", { name: "해설 확인하고 다음 문제" }));
    await screen.findByRole("heading", { name: "600 + 30 + 2로 나타내는 수는?" });
    tapTwiceInOneFrame(screen.getByRole("button", { name: "632" }));
    fireEvent.click(screen.getByRole("button", { name: "해설 확인하고 훈련 완료" }));

    await screen.findByText(/힌트 1회/);
    await waitFor(() => {
      const stored = parseStoredGameData(localStorage.getItem(STORAGE_KEY));
      expect(stored.trainingHistory).toHaveLength(1);
      expect(stored.trainingHistory[0].hintCount).toBe(1);
    });
  });

  it("중등 재시도는 선택한 답 대신 익명 오답 유형만 세션에 기록한다", async () => {
    const data = createDefaultGameData();
    data.playerProfile = { ...data.playerProfile, schoolLevel: "middle", grade: 1 };
    data.parentSettings = {
      ...data.parentSettings,
      schoolLevel: "middle",
      grade: 1,
      selectedLearningGoalId: "middle-1-s2-math-w8",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.history.replaceState({}, "", "/training?goal=middle-1-s2-math-w8");
    render(<TrainingClient />);

    await screen.findByRole("heading", { name: "60을 소인수분해한 것은?" });
    fireEvent.click(screen.getByRole("button", { name: "2 × 3 × 10" }));
    await screen.findByText(/아직 문은 열리지 않았어요/);
    act(() => window.dispatchEvent(new Event("pagehide")));

    await waitFor(() => {
      const stored = parseStoredGameData(localStorage.getItem(STORAGE_KEY));
      expect(stored.sessionReports.at(-1)?.misconceptionTagCounts).toEqual({ "m1-number-factorization": 1 });
      expect(JSON.stringify(stored.sessionReports.at(-1))).not.toContain("2 × 3 × 10");
    });
  });
});

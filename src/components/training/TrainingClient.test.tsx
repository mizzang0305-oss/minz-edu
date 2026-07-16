import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseStoredGameData, STORAGE_KEY } from "@/stores/storage";
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

    await screen.findByRole("heading", { name: "407과 470 중 더 큰 수는?" });
    fireEvent.click(screen.getByRole("button", { name: "470" }));
    await screen.findByRole("heading", { name: "600 + 30 + 2로 나타내는 수는?" });
    tapTwiceInOneFrame(screen.getByRole("button", { name: "632" }));

    await screen.findByText(/힌트 1회/);
    await waitFor(() => {
      const stored = parseStoredGameData(localStorage.getItem(STORAGE_KEY));
      expect(stored.trainingHistory).toHaveLength(1);
      expect(stored.trainingHistory[0].hintCount).toBe(1);
    });
  });
});

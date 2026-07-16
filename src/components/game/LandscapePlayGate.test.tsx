import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandscapePlayGate } from "./LandscapePlayGate";

describe("LandscapePlayGate", () => {
  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    vi.unstubAllGlobals();
  });

  it("asks a small portrait device to rotate without stretching the game", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: true,
      media: "(max-width: 900px) and (orientation: portrait)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: requestFullscreen });

    render(<LandscapePlayGate />);
    const start = await screen.findByRole("button", { name: "가로 전체화면 시작" });
    fireEvent.click(start);

    await waitFor(() => expect(requestFullscreen).toHaveBeenCalledOnce());
    expect(screen.getByRole("dialog", { name: "가로 화면 안내" })).toBeInTheDocument();
  });

  it("does not cover an already-landscape screen", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      media: "(max-width: 900px) and (orientation: portrait)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    render(<LandscapePlayGate />);
    expect(screen.queryByRole("dialog", { name: "가로 화면 안내" })).not.toBeInTheDocument();
  });
});

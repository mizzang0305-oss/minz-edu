import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { GAME_INTRO_SEEN_KEY, GameIntro } from "./GameIntro";

describe("GameIntro", () => {
  beforeEach(() => localStorage.clear());

  it("첫 방문에는 세계관과 최종 목표를 안내한다", async () => {
    render(<GameIntro />);

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByRole("heading", { name: "세 개의 세계가 길을 잃었어!" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /다음 이야기/ }));
    expect(screen.getByText("1. 찾아요")).toBeVisible();
    expect(screen.getByText("2. 풀어요")).toBeVisible();
    expect(screen.getByText("3. 모아요")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /다음 이야기/ }));
    expect(screen.getByRole("heading", { name: "배움의 별빛을 완성해 줘!" })).toBeVisible();
    expect(screen.getByText(/세 수호자와 친구가 되는 것/)).toBeVisible();
  });

  it("건너뛰면 본 것으로 저장하고 다시 자동으로 열지 않는다", async () => {
    const view = render(<GameIntro />);
    fireEvent.click(await screen.findByRole("button", { name: "건너뛰기" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(localStorage.getItem(GAME_INTRO_SEEN_KEY)).toBe("1");

    view.unmount();
    render(<GameIntro />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("본 뒤에도 이야기 다시 보기로 열 수 있다", async () => {
    localStorage.setItem(GAME_INTRO_SEEN_KEY, "1");
    render(<GameIntro />);

    fireEvent.click(screen.getByRole("button", { name: /이야기 다시 보기/ }));
    expect(await screen.findByRole("dialog")).toBeVisible();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameScreenNav } from "./GameScreenNav";

describe("GameScreenNav", () => {
  it("현재 게임 화면을 표시하고 설정으로 이동할 수 있다", () => {
    render(<GameScreenNav current="inventory" />);

    expect(screen.getByRole("navigation", { name: "게임 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "인벤토리" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute("href", "/setup");
  });
});

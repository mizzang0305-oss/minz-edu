import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { InventoryClient } from "./InventoryClient";

describe("InventoryClient", () => {
  beforeEach(() => localStorage.clear());

  it("보유 장비와 상점을 탭으로 바꾸고 한 번에 네 개만 표시한다", () => {
    const { container } = render(<InventoryClient />);

    expect(container.querySelector(".game-screen-shell")).toBeInTheDocument();
    const ownedPanel = screen.getByRole("tabpanel", { name: "보유 장비와 기술" });
    expect(ownedPanel).toBeInTheDocument();
    expect(within(ownedPanel).getByText("훈련용 번개검")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /코인 상점/ }));

    expect(screen.getByRole("tabpanel", { name: "모험 포인트 상점" })).toBeInTheDocument();
    expect(screen.getByText("별빛 수습 지팡이")).toBeInTheDocument();
    expect(screen.queryByText("수호벽 파쇄")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(screen.getByText("수호벽 파쇄")).toBeInTheDocument();
    expect(screen.queryByText("별빛 수습 지팡이")).not.toBeInTheDocument();
  });
});

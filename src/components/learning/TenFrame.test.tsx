import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenFrame } from "./TenFrame";

describe("TenFrame", () => {
  it("블록 두 개를 직접 옮긴 뒤에만 방어막을 연다", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TenFrame onComplete={onComplete} />);
    const openButton = screen.getByRole("button", { name: "2개 더 옮기기" });
    expect(openButton).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "1번째 블록 옮기기" }));
    await user.click(screen.getByRole("button", { name: "2번째 블록 옮기기" }));
    await user.click(screen.getByRole("button", { name: "10칸 방어막 열기" }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("아이를 평가하는 금지 표현을 사용하지 않는다", () => {
    const { container } = render(<TenFrame onComplete={() => undefined} />);
    expect(container.textContent).not.toMatch(/공부|숙제|시험|오답|실패|틀렸다|점수 미달|뒤처짐/);
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppError from "./error";

describe("AppError", () => {
  it("아이에게 저장 안전성과 복구 경로를 안내한다", async () => {
    const retry = vi.fn();
    render(<AppError error={new Error("hidden detail")} unstable_retry={retry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("이미 저장된 모험 기록은 그대로예요");
    expect(screen.getByRole("link", { name: "모험 지도로 돌아가기" })).toHaveAttribute("href", "/world");
    expect(screen.queryByText("hidden detail")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

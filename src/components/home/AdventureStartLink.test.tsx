import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "@/stores/storage";
import { AdventureStartLink } from "./AdventureStartLink";

describe("AdventureStartLink", () => {
  beforeEach(() => localStorage.clear());

  it("처음 온 아이를 영웅과 학습 목표 설정으로 안내한다", () => {
    render(<AdventureStartLink />);
    expect(screen.getByRole("link", { name: /내 영웅 만들기/ })).toHaveAttribute("href", "/setup");
  });

  it("저장된 프로필이 있으면 오늘의 모험을 이어 간다", async () => {
    localStorage.setItem(STORAGE_KEY, "{}");
    render(<AdventureStartLink />);
    await waitFor(() => expect(screen.getByRole("link", { name: /모험 이어하기/ })).toHaveAttribute("href", "/world"));
  });
});

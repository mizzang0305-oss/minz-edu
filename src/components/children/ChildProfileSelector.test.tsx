import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_CHILD_PROFILE_KEY, getChildStorageKey } from "@/stores/storage";
import { ChildProfileSelector } from "./ChildProfileSelector";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  vi.restoreAllMocks();
  push.mockReset();
});

describe("ChildProfileSelector", () => {
  it("선택한 자녀의 독립 저장소를 열고 모험 지도로 이동한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      children: [
        { id: "primary", displayName: "민즈", schoolLevel: "elementary", grade: 2, characterId: "thunder-sword", friendCode: "ABCD2345" },
        { id: "child_second", displayName: "하람", schoolLevel: "kindergarten", grade: 6, characterId: "thunder-sword", friendCode: "EFGH6789" },
      ],
    })));

    render(<ChildProfileSelector />);
    expect(await screen.findByRole("heading", { name: "하람" })).toBeInTheDocument();
    const cards = screen.getAllByRole("button", { name: "이 모험가로 출발" });
    fireEvent.click(cards[1]);

    expect(localStorage.getItem(ACTIVE_CHILD_PROFILE_KEY)).toBe("child_second");
    expect(localStorage.getItem(getChildStorageKey("child_second"))).toContain("하람");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/world"));
  });
});

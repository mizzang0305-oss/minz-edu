import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_CHILD_PROFILE_KEY, getChildStorageKey } from "@/stores/storage";
import { ChildProfileSelector } from "./ChildProfileSelector";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  vi.restoreAllMocks();
  push.mockReset();
  localStorage.clear();
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

  it("두 단계 확인 후 보조 자녀의 원격·로컬 기록을 정리하고 기본 자녀로 돌아간다", async () => {
    const children = [
      { id: "primary", displayName: "민표", schoolLevel: "elementary", grade: 5, characterId: "thunder-sword", friendCode: "ABCD2345" },
      { id: "child_second", displayName: "전환테스트", schoolLevel: "kindergarten", grade: 5, characterId: "thunder-sword", friendCode: "EFGH6789" },
    ];
    localStorage.setItem(ACTIVE_CHILD_PROFILE_KEY, "child_second");
    localStorage.setItem(getChildStorageKey("child_second"), JSON.stringify({ version: 5 }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/guardian/children" && !init?.method) return Response.json({ children });
      if (url === "/api/auth/csrf") return Response.json({ csrfToken: "csrf-token" });
      if (url === "/api/guardian/children" && init?.method === "DELETE") {
        expect(JSON.parse(String(init.body))).toEqual({ childProfileId: "child_second", csrfToken: "csrf-token" });
        return Response.json({ deletedChildProfileId: "child_second" });
      }
      return Response.json({}, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ChildProfileSelector />);
    expect(await screen.findByRole("heading", { name: "전환테스트" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "모험가 삭제" }));
    expect(screen.getByText("진행도와 보물까지 영구 삭제됩니다.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "기록까지 삭제" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "전환테스트" })).not.toBeInTheDocument());
    expect(screen.getByText("전환테스트의 모험 기록을 안전하게 정리했습니다.")).toBeVisible();
    expect(localStorage.getItem(getChildStorageKey("child_second"))).toBeNull();
    expect(localStorage.getItem(ACTIVE_CHILD_PROFILE_KEY)).toBe("primary");
  });
});

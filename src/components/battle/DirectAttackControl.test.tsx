import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHARGE_HOLD_MS, DirectAttackControl } from "./DirectAttackControl";

const upgradeLevels = { "thunder-strike": 2 as const, "flame-burst": 3 as const };

afterEach(() => {
  vi.useRealTimers();
});

describe("DirectAttackControl", () => {
  it("짧게 누르면 일반 공격을 실행한다", () => {
    const onAttack = vi.fn();
    render(<DirectAttackControl skillIds={["thunder-strike"]} selectedSkillId="thunder-strike" upgradeLevels={upgradeLevels} onSelectSkill={vi.fn()} onAttack={onAttack} />);

    fireEvent.click(screen.getByRole("button", { name: /공격! 짧게/ }));

    expect(onAttack).toHaveBeenCalledWith("tap");
  });

  it("길게 누르면 차지 공격을 실행한다", () => {
    vi.useFakeTimers();
    const onAttack = vi.fn();
    render(<DirectAttackControl skillIds={["thunder-strike"]} selectedSkillId="thunder-strike" upgradeLevels={upgradeLevels} onSelectSkill={vi.fn()} onAttack={onAttack} />);
    const attackButton = screen.getByRole("button", { name: /공격! 짧게/ });

    fireEvent.pointerDown(attackButton, { pointerId: 1, button: 0 });
    act(() => vi.advanceTimersByTime(CHARGE_HOLD_MS));
    expect(screen.getByText("차지 공격!")).toBeInTheDocument();
    fireEvent.pointerUp(attackButton, { pointerId: 1, button: 0 });

    expect(onAttack).toHaveBeenCalledTimes(1);
    expect(onAttack).toHaveBeenCalledWith("charged");
  });

  it("공격 전에 보유 스킬을 직접 선택할 수 있다", () => {
    const onSelectSkill = vi.fn();
    render(<DirectAttackControl skillIds={["thunder-strike", "flame-burst"]} selectedSkillId="thunder-strike" upgradeLevels={upgradeLevels} onSelectSkill={onSelectSkill} onAttack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /화염 폭발/ }));

    expect(onSelectSkill).toHaveBeenCalledWith("flame-burst");
  });
});

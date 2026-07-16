import Link from "next/link";

type AdventureStage = "world" | "battle" | "result";

const stages = [
  { id: "world", label: "모험 지도", icon: "🗺️", href: "/world" },
  { id: "battle", label: "학습 작전", icon: "⚔️", href: "/battle" },
  { id: "result", label: "보물 결과", icon: "🏆", href: "/result" },
] as const;

export function AdventureProgress({ current }: { current: AdventureStage }) {
  const currentIndex = stages.findIndex((stage) => stage.id === current);

  return (
    <nav className="adventure-progress" aria-label="오늘의 모험 진행">
      <span className="adventure-progress-title">오늘의 퀘스트</span>
      <ol>
        {stages.map((stage, index) => {
          const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "locked";
          const content = (
            <>
              <span className="adventure-stage-icon" aria-hidden="true">{state === "complete" ? "✓" : stage.icon}</span>
              <span>{stage.label}</span>
            </>
          );

          return (
            <li key={stage.id} data-state={state}>
              {state === "complete" ? (
                <Link href={stage.href}>{content}</Link>
              ) : (
                <span aria-current={state === "current" ? "step" : undefined}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

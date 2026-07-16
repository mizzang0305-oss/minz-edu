"use client";

import { useState } from "react";

type TenFrameProps = {
  onComplete: () => void;
  target?: number;
  base?: number;
  source?: number;
  move?: number;
  title?: string;
  copy?: string;
};

export function TenFrame({ onComplete, target = 10, base = 8, source = 7, move = 2, title = "8의 빈칸을 채워 10을 만들어 줘!", copy = "오른쪽 블록을 빈칸으로 끌거나 눌러서 옮길 수 있어." }: TenFrameProps) {
  const [moved, setMoved] = useState<number[]>([]);
  const moveBlock = (index: number) => setMoved((current) => current.includes(index) || current.length >= move ? current : [...current, index]);

  return (
    <div className="ten-frame-mission" data-testid="ten-frame">
      <div className="mission-copy"><span className="mission-kind">번개 암호 · 블록 작전</span><h2>{title}</h2><p>{copy}</p></div>
      <div className="block-workspace">
        <div
          className="ten-frame"
          style={{ gridTemplateColumns: `repeat(${Math.min(target, 5)}, 1fr)` }}
          aria-label={`${target}칸 틀, ${base + moved.length}칸 채움`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => moveBlock(Number(event.dataTransfer.getData("text/plain")))}
        >
          {Array.from({ length: target }, (_, index) => {
            const filled = index < base || index < base + moved.length;
            const movedCell = index >= base && filled;
            return (
              <div
                key={index}
                className={filled ? (movedCell ? "frame-cell moved" : "frame-cell filled") : "frame-cell empty"}
                aria-label={filled ? (movedCell ? "옮겨 채운 한 칸" : "채워진 한 칸") : "비어 있는 한 칸"}
              >
                {filled ? <span aria-hidden="true" /> : <span className="slot-mark" aria-hidden="true">?</span>}
              </div>
            );
          })}
        </div>
        <div className="plus-sign" aria-hidden="true">+</div>
        <div className="source-blocks" aria-label={`${source}개 중 ${source - moved.length}개 남음`}>
          {Array.from({ length: source }, (_, index) => !moved.includes(index) && (
            <button key={index} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onClick={() => moveBlock(index)} className="number-block" aria-label={`${index + 1}번째 블록 옮기기`}>1</button>
          ))}
        </div>
      </div>
      <div className="equation-strip" aria-live="polite"><strong>{base + moved.length}</strong><span>칸이 찼어</span><span className="arrow">→</span><strong>{source - moved.length}</strong><span>개가 남아</span></div>
      <button className="primary-button wide" type="button" disabled={moved.length !== move} onClick={onComplete}>{moved.length === move ? `${target}칸 방어막 열기` : `${move - moved.length}개 더 옮기기`}</button>
    </div>
  );
}

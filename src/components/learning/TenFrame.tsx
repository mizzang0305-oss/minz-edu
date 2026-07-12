"use client";

import { useState } from "react";

export function TenFrame({ onComplete }: { onComplete: () => void }) {
  const [moved, setMoved] = useState<number[]>([]);
  const moveBlock = (index: number) => setMoved((current) => current.includes(index) || current.length >= 2 ? current : [...current, index]);

  return (
    <div className="ten-frame-mission" data-testid="ten-frame">
      <div className="mission-copy"><span className="mission-kind">번개 암호 · 블록 작전</span><h2>8의 빈칸을 채워 10을 만들어 줘!</h2><p>오른쪽 블록을 빈칸으로 끌거나 눌러서 옮길 수 있어.</p></div>
      <div className="block-workspace">
        <div
          className="ten-frame"
          aria-label={`10칸 틀, ${8 + moved.length}칸 채움`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => moveBlock(Number(event.dataTransfer.getData("text/plain")))}
        >
          {Array.from({ length: 10 }, (_, index) => {
            const filled = index < 8 || index < 8 + moved.length;
            return <div key={index} className={filled ? (index < 8 ? "frame-cell filled" : "frame-cell moved") : "frame-cell empty"}>{filled ? <span>{index < 8 ? "8" : "+1"}</span> : <span className="slot-mark">?</span>}</div>;
          })}
        </div>
        <div className="plus-sign" aria-hidden="true">+</div>
        <div className="source-blocks" aria-label={`7개 중 ${7 - moved.length}개 남음`}>
          {Array.from({ length: 7 }, (_, index) => !moved.includes(index) && (
            <button key={index} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onClick={() => moveBlock(index)} className="number-block" aria-label={`${index + 1}번째 블록 옮기기`}>1</button>
          ))}
        </div>
      </div>
      <div className="equation-strip" aria-live="polite"><strong>{8 + moved.length}</strong><span>칸이 찼어</span><span className="arrow">→</span><strong>{7 - moved.length}</strong><span>개가 남아</span></div>
      <button className="primary-button wide" type="button" disabled={moved.length !== 2} onClick={onComplete}>{moved.length === 2 ? "10칸 방어막 열기" : `${2 - moved.length}개 더 옮기기`}</button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

const MOBILE_PORTRAIT_QUERY = "(max-width: 900px) and (orientation: portrait)";

export function LandscapePlayGate() {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(MOBILE_PORTRAIT_QUERY);
    const update = () => setPortrait(query.matches);
    update();
    if (typeof query.addEventListener === "function") query.addEventListener("change", update);
    else query.addListener?.(update);
    return () => {
      if (typeof query.removeEventListener === "function") query.removeEventListener("change", update);
      else query.removeListener?.(update);
    };
  }, []);

  async function enterLandscape() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    } catch {
      // iOS Safari may reject fullscreen; physical rotation still works.
    }

    try {
      await (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape");
    } catch {
      // Orientation lock is optional and normally requires an installed PWA or fullscreen.
    }
  }

  if (!portrait) return null;

  return (
    <aside className="landscape-play-gate" role="dialog" aria-modal="true" aria-label="가로 화면 안내">
      <div className="landscape-device-icon" aria-hidden="true"><span /></div>
      <strong>휴대폰을 가로로 돌려 주세요</strong>
      <p>이동 공간과 보스 전투를 넓고 선명하게 보여 드릴게요.</p>
      <button type="button" onClick={enterLandscape}>가로 전체화면 시작</button>
    </aside>
  );
}

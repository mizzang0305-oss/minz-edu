"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallGameButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const updateStandalone = () => setStandalone(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    updateStandalone();
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", updateStandalone);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", updateStandalone);
    };
  }, []);

  if (standalone) return <span className="installed-game-chip">앱 모드</span>;

  const install = async () => {
    if (!promptEvent) {
      setMessage("브라우저 메뉴에서 ‘홈 화면에 추가’ 또는 ‘앱 설치’를 선택하면 다음 실행부터 주소창 없이 열립니다.");
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    setMessage(choice.outcome === "accepted" ? "설치가 완료되면 홈 화면의 민즈 모험 아이콘으로 실행해 주세요." : "나중에 브라우저 메뉴에서 다시 설치할 수 있어요.");
  };

  return <div className="install-game-control"><button type="button" onClick={() => void install()}>게임 앱 설치</button>{message && <p role="status">{message}</p>}</div>;
}

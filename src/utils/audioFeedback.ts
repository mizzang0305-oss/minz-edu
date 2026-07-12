type ToneKind = "strong" | "magic" | "special";

export function playBattleTone(kind: ToneKind, volumePercent: number) {
  if (typeof window === "undefined" || volumePercent <= 0) return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;
  const frequencies = kind === "strong" ? [220, 520] : kind === "magic" ? [280, 720] : [180, 880];
  oscillator.type = kind === "special" ? "sawtooth" : "triangle";
  oscillator.frequency.setValueAtTime(frequencies[0], start);
  oscillator.frequency.exponentialRampToValueAtTime(frequencies[1], start + (kind === "special" ? 0.55 : 0.18));
  gain.gain.setValueAtTime(Math.min(0.12, volumePercent / 1000), start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + (kind === "special" ? 0.65 : 0.25));
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + (kind === "special" ? 0.65 : 0.25));
  oscillator.addEventListener("ended", () => void context.close(), { once: true });
}

export function speakBattleLine(message: string, volumePercent: number) {
  if (typeof window === "undefined" || volumePercent <= 0 || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "ko-KR";
  utterance.rate = 0.95;
  utterance.pitch = 1.1;
  utterance.volume = Math.min(1, volumePercent / 100);
  window.speechSynthesis.speak(utterance);
}

export type DifficultySignals = {
  recentSuccesses: number;
  hintCount: number;
  applicationSuccess: boolean;
  manipulationFailures: number;
  stopped: boolean;
};

export function nextDifficulty(current: number, signals: DifficultySignals): number {
  if (signals.stopped || signals.manipulationFailures >= 3 || signals.hintCount >= 3) {
    return Math.max(1, current - 1);
  }
  if (signals.recentSuccesses >= 4 && signals.hintCount <= 1 && signals.applicationSuccess) {
    return Math.min(4, current + 1);
  }
  return current;
}

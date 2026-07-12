import type { CoopBattleState } from "@/types/battle";

type GameEventMap = {
  sync: CoopBattleState;
  attack: { playerIndex: number; kind: "strong" | "magic" };
  special: { coop: boolean; skillName: string };
  specialComplete: undefined;
};

type Listener<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

class GameEventBridge {
  private listeners = new Map<keyof GameEventMap, Set<(payload: never) => void>>();

  on<K extends keyof GameEventMap>(event: K, listener: Listener<K>) {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as (payload: never) => void);
    this.listeners.set(event, set);
    return () => {
      set.delete(listener as (payload: never) => void);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]) {
    this.listeners.get(event)?.forEach((listener) => listener(payload as never));
  }
}

export const gameEventBridge = new GameEventBridge();

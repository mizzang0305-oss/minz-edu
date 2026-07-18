import type { BossAttackSignal, CoopBattleState } from "@/types/battle";

export type ExplorationInteraction = {
  npcId: string;
  kind: "talk" | "chest" | "secret" | "boss" | "enemy";
  label: string;
  hint: string;
  xPercent: number;
  yPercent: number;
};

type GameEventMap = {
  sync: CoopBattleState;
  attack: { playerIndex: number; kind: "strong" | "magic" };
  bossAttack: Omit<BossAttackSignal, "id">;
  special: { coop: boolean; skillName: string };
  specialComplete: undefined;
  move: { direction: "left" | "right" | "up" | "down"; active: boolean };
  dash: undefined;
  fieldAttack: { enemyId: string };
  explorationProgress: { collected: number; total: number; bridgeCrossed?: boolean; secretDiscovered?: boolean; npcTalked?: boolean; chestOpened?: boolean; nextDirection?: "왼쪽" | "오른쪽" | "위쪽" | "아래쪽" | "도착"; zonePage?: 1 | 2; fieldEnemiesDefeated?: number; fieldEnemiesTotal?: number };
  explorationComplete: undefined;
  interactionAvailable: ExplorationInteraction | null;
  interact: { npcId: string };
  sceneReady: undefined;
  viewportChanged: { width: number; height: number };
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

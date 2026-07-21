"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { PhaserStage } from "@/components/game/PhaserStage";
import { MathLiveAnswerField } from "./MathLiveAnswerField";
import { GAME_POC_QUESTIONS } from "@/data/gamePocQuestions";
import {
  ColyseusLearningClient,
  type LearningRoomClientStatus,
} from "@/game/online/ColyseusLearningClient";
import {
  createLearningBattlePocState,
  POC_CHARGED_ATTACK_DAMAGE,
  POC_NORMAL_ATTACK_DAMAGE,
  resolveLearningBattleAttack,
  resolveLearningBattleSpecial,
  submitLearningBattleAnswer,
} from "@/game/poc/LearningBattlePocEngine";
import type { BossAttackSignal, CoopBattleState, PlayerAttackSignal } from "@/types/battle";
import type {
  ColyseusLearningServerMessages,
  LearningPlayerSessionLog,
  LearningBattleMode,
  LearningBattlePocState,
} from "@/types/learningBattlePoc";
import { getActiveChildProfileId } from "@/stores/storage";
import { persistSignedLearningLog } from "@/services/online/learningLogClient";
import styles from "./LearningBattlePoc.module.css";

type PlayMode = LearningBattleMode | "online-coop";

type OnlineUiState = {
  status: LearningRoomClientStatus;
  roomId: string;
  playerId: string;
  error: string;
};

const INITIAL_ONLINE_UI: OnlineUiState = {
  status: "idle",
  roomId: "",
  playerId: "",
  error: "",
};

const DIFFICULTY_LABEL = {
  core: "기본 결계",
  application: "응용 결계",
  deep: "심화 룬",
} as const;

const EMPTY_METRICS = {
  jointMissionsCompleted: 0,
  hintsShared: 0,
  explanationsShared: 0,
  retries: 0,
  specialActivations: 0,
  waitedTurns: 0,
  roleChanges: 0,
};

function toPhaserBattle(state: LearningBattlePocState): CoopBattleState {
  const phase = state.phase === "complete"
    ? "BATTLE_WIN"
    : state.phase === "special-ready"
      ? "SPECIAL_READY"
      : state.phase === "attack-ready"
        ? "RESOLVE_ATTACK"
        : "PLAYER_ANSWER";
  return {
    mode: "local-shared-screen",
    players: state.players.map((player, index) => ({
      ...player,
      schoolLevel: "middle" as const,
      grade: 1,
      levelProfile: { math: "linear-equation" },
      role: index === 0 ? "attack" as const : "magic" as const,
      battleGauge: state.skillGauge,
      conceptGauge: state.conceptGauge,
      ready: state.phase === "special-ready",
    })),
    activePlayerIndex: state.activePlayerIndex,
    teamLinkGauge: state.mode === "local-coop" ? state.skillGauge : 0,
    teamCombo: state.correctCount,
    bossHp: state.bossHp,
    bossMaxHp: state.bossMaxHp,
    bossShield: 0,
    battlePhase: phase,
    specialSkillReady: state.phase === "special-ready",
    attemptCount: state.correctCount + state.wrongCount,
    completedMissionIds: GAME_POC_QUESTIONS.slice(0, state.questionIndex).map((question) => question.id),
    firstTryCorrectCount: state.correctCount,
    currentQuestionRetried: state.wrongCount > 0,
    currentQuestionHintUsed: state.wrongCount > 0,
    hintCount: state.wrongCount,
    retryCount: state.wrongCount,
    successfulDodges: 0,
    failedDodges: state.wrongCount,
    dodgeStreak: 0,
    damageTaken: state.wrongCount * 15,
    message: state.feedback.title,
    shakeIntensity: 1,
    soundVolume: 0,
    coopMetrics: EMPTY_METRICS,
  };
}

export function LearningBattlePoc() {
  const [state, setState] = useState(() => createLearningBattlePocState());
  const [playMode, setPlayMode] = useState<PlayMode>("solo");
  const [answer, setAnswer] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [online, setOnline] = useState<OnlineUiState>(INITIAL_ONLINE_UI);
  const [learningLog, setLearningLog] = useState<LearningPlayerSessionLog | null>(null);
  const [attackSignal, setAttackSignal] = useState<PlayerAttackSignal | null>(null);
  const [bossAttackSignal, setBossAttackSignal] = useState<BossAttackSignal | null>(null);
  const [specialSignal, setSpecialSignal] = useState(0);
  const [specialPlaying, setSpecialPlaying] = useState(false);
  const attackId = useRef(0);
  const pressStartedAt = useRef(0);
  const stateRef = useRef(state);
  const onlineClientRef = useRef<ColyseusLearningClient | null>(null);
  const question = GAME_POC_QUESTIONS[state.questionIndex];
  const activePlayer = state.players[state.activePlayerIndex];
  const phaserBattle = useMemo(() => toPhaserBattle(state), [state]);
  const onlineReady = playMode === "online-coop" && online.status === "ready";
  const canOnlineAct = onlineReady && online.playerId === activePlayer.id;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => () => {
    void onlineClientRef.current?.disconnect();
  }, []);

  function reset(mode: LearningBattleMode = state.mode) {
    const next = createLearningBattlePocState(mode);
    stateRef.current = next;
    setState(next);
    setAnswer("");
    setAttackSignal(null);
    setBossAttackSignal(null);
    setSpecialSignal(0);
    setSpecialPlaying(false);
    setLearningLog(null);
  }

  function selectLocalMode(mode: LearningBattleMode) {
    void onlineClientRef.current?.disconnect();
    onlineClientRef.current = null;
    setOnline(INITIAL_ONLINE_UI);
    setPlayMode(mode);
    reset(mode);
  }

  function selectOnlineMode() {
    if (playMode === "online-coop") return;
    setPlayMode("online-coop");
    reset("local-coop");
  }

  async function connectOnline(match: "create" | "join-by-id") {
    await onlineClientRef.current?.disconnect();
    setOnline({ ...INITIAL_ONLINE_UI, status: "connecting" });
    const childProfileId = getActiveChildProfileId();
    const client = new ColyseusLearningClient({
      onAssigned: (payload) => {
        setOnline((current) => ({
          ...current,
          playerId: payload.playerId,
          roomId: payload.roomId,
          error: "",
        }));
      },
      onSnapshot: (payload) => {
        stateRef.current = payload.battle;
        setState(payload.battle);
        setOnline((current) => ({
          ...current,
          status: payload.connectionStatus,
          roomId: payload.roomId,
          error: "",
        }));
      },
      onAnswer: playAnswerResolution,
      onAttack: playAttackResolution,
      onSpecial: () => {
        setSpecialPlaying(true);
        setSpecialSignal((value) => value + 1);
        navigator.vibrate?.([45, 30, 70]);
      },
      onLearningLog: ({ log, receipt }) => {
        setLearningLog(log);
        void persistSignedLearningLog(childProfileId, receipt).catch(() => undefined);
      },
      onStatus: (status) => setOnline((current) => ({ ...current, status })),
      onError: (message) => {
        setSpecialPlaying(false);
        setOnline((current) => ({ ...current, status: current.status === "connecting" ? "error" : current.status, error: message }));
      },
    });
    onlineClientRef.current = client;
    try {
      const connectedRoomId = await client.connect({
        childProfileId,
        match,
        roomId: roomIdInput,
      });
      setOnline((current) => ({ ...current, roomId: connectedRoomId }));
    } catch {
      if (onlineClientRef.current === client) onlineClientRef.current = null;
    }
  }

  async function leaveOnlineRoom() {
    const client = onlineClientRef.current;
    onlineClientRef.current = null;
    await client?.disconnect();
    setOnline(INITIAL_ONLINE_UI);
    setPlayMode("solo");
    reset("solo");
  }

  function playAnswerResolution(payload: ColyseusLearningServerMessages["answer:resolved"]) {
    if (payload.correct) return;
    attackId.current += 1;
    setBossAttackSignal({
      id: attackId.current,
      targetPlayerIndex: payload.playerIndex,
      outcome: "hit",
      attackName: "결계 반격",
    });
    navigator.vibrate?.([28, 20, 28]);
  }

  function playAttackResolution(payload: ColyseusLearningServerMessages["attack:resolved"]) {
    const attacker = stateRef.current.players[payload.playerIndex];
    if (!attacker) return;
    attackId.current += 1;
    const mage = attacker.characterId === "flame-mage";
    setAttackSignal({
      id: attackId.current,
      playerIndex: payload.playerIndex,
      style: mage ? "magic" : "slash",
      element: mage ? "fire" : "thunder",
      delivery: mage ? "projectile" : "melee",
      charged: payload.charged,
      damage: payload.damage,
      hitStopMs: 70,
      weaponLevel: 1,
      skillLevel: 1,
    });
    navigator.vibrate?.(payload.charged ? [35, 24, 55] : [24]);
  }

  function submitAnswer() {
    if (!answer.trim() || state.phase !== "question") return;
    if (playMode === "online-coop") {
      if (!canOnlineAct) return;
      onlineClientRef.current?.sendAnswer(question.id, answer);
      setAnswer("");
      return;
    }
    const next = submitLearningBattleAnswer(state, answer);
    if (next.feedback.kind === "wrong") {
      attackId.current += 1;
      setBossAttackSignal({
        id: attackId.current,
        targetPlayerIndex: state.activePlayerIndex,
        outcome: "hit",
        attackName: "결계 반격",
      });
      navigator.vibrate?.([28, 20, 28]);
    }
    setState(next);
    setAnswer("");
  }

  function attack(charged: boolean) {
    if (state.phase !== "attack-ready") return;
    if (playMode === "online-coop") {
      if (!canOnlineAct) return;
      onlineClientRef.current?.sendAttack(question.id, charged);
      return;
    }
    attackId.current += 1;
    const mage = activePlayer.characterId === "flame-mage";
    setAttackSignal({
      id: attackId.current,
      playerIndex: state.activePlayerIndex,
      style: mage ? "magic" : "slash",
      element: mage ? "fire" : "thunder",
      delivery: mage ? "projectile" : "melee",
      charged,
      damage: charged ? POC_CHARGED_ATTACK_DAMAGE : POC_NORMAL_ATTACK_DAMAGE,
      hitStopMs: 70,
      weaponLevel: 1,
      skillLevel: 1,
    });
    navigator.vibrate?.(charged ? [35, 24, 55] : [24]);
    setState(resolveLearningBattleAttack(state, charged));
    setAnswer("");
  }

  function activateSpecial() {
    if (state.phase !== "special-ready" || specialPlaying) return;
    setSpecialPlaying(true);
    if (playMode === "online-coop") {
      if (!canOnlineAct) {
        setSpecialPlaying(false);
        return;
      }
      onlineClientRef.current?.sendSpecial();
      return;
    }
    setSpecialSignal((value) => value + 1);
    navigator.vibrate?.([45, 30, 70]);
  }

  function finishSpecial() {
    if (playMode === "online-coop") {
      setSpecialPlaying(false);
      return;
    }
    setState((current) => resolveLearningBattleSpecial(current));
    setSpecialPlaying(false);
  }

  return (
    <main className={`${styles.screen} poc-game-screen`}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Link href="/" aria-label="홈으로 나가기">나가기</Link>
          <span><small>PHASER LEARNING BATTLE</small><strong>민즈 결계전</strong></span>
        </div>
        <div className={styles.modeControls} role="group" aria-label="플레이 모드">
          <button type="button" className={playMode === "solo" ? styles.selected : ""} onClick={() => selectLocalMode("solo")}>1인</button>
          <button type="button" className={playMode === "local-coop" ? styles.selected : ""} onClick={() => selectLocalMode("local-coop")}>같은 화면 2인</button>
          <button type="button" className={playMode === "online-coop" ? styles.selected : ""} onClick={selectOnlineMode}>온라인 2인</button>
          {playMode === "online-coop" && online.roomId
            ? <button type="button" onClick={() => void leaveOnlineRoom()}>방 나가기</button>
            : <button type="button" onClick={() => reset()}>다시 시작</button>}
        </div>
      </header>

      <div className={styles.battleGrid}>
        <section className={styles.visualShell} aria-label="전투 장면">
          <PhaserStage
            battle={phaserBattle}
            attackSignal={attackSignal}
            bossAttackSignal={bossAttackSignal}
            specialSignal={specialSignal}
            onSpecialComplete={finishSpecial}
            onExploreComplete={() => undefined}
            stageId="number-forest"
            characterId="thunder-sword"
          />

          <div className={styles.bossHud}>
            <span>숲의 결계 수호자</span>
            <div><i style={{ width: `${(state.bossHp / state.bossMaxHp) * 100}%` }} /></div>
            <strong>{state.bossHp} / {state.bossMaxHp}</strong>
          </div>

          <div className={styles.partyHud}>
            {state.players.map((player, index) => (
              <article key={player.id} className={index === state.activePlayerIndex ? styles.activePlayer : ""}>
                <Image
                  src={player.characterId === "flame-mage" ? "/game-assets/duelyst/hero-magic.webp" : "/game-assets/duelyst/hero-thunder.webp"}
                  width={30}
                  height={30}
                  alt=""
                />
                <div>
                  <strong>{player.displayName}{playMode === "online-coop" && online.playerId === player.id ? " · 나" : ""}</strong>
                  <small>HP {player.hp} · 보호막 {player.shield}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.commandPanel} aria-label="학습 전투 명령">
          <div className={styles.gaugeRow}>
            <Gauge label="개념 룬" value={state.conceptGauge} tone="concept" />
            <Gauge label="스킬 게이지" value={state.skillGauge} tone="skill" />
          </div>

          {playMode === "online-coop" && (online.status === "idle" || online.status === "error") ? (
            <div className={styles.onlineLobby}>
              <span>ONLINE CO-OP</span>
              <h1>친구와 각자 화면에서 결계전</h1>
              <p>한 명이 방을 만들고, 친구가 표시된 방 ID로 참가하면 전투가 시작돼.</p>
              <p>보호자 로그인과 현재 선택된 자녀 프로필을 확인한 뒤 90초 room ticket으로 연결해.</p>
              <div className={styles.onlineActions}>
                <button type="button" onClick={() => void connectOnline("create")}>새 방 만들기</button>
              </div>
              <div className={styles.roomJoinRow}>
                <input
                  aria-label="참가할 방 ID"
                  placeholder="친구 방 ID"
                  value={roomIdInput}
                  onChange={(event) => setRoomIdInput(event.target.value)}
                />
                <button type="button" disabled={!roomIdInput.trim()} onClick={() => void connectOnline("join-by-id")}>방 참가</button>
              </div>
              {online.error && <p className={styles.onlineError} role="alert">{online.error}</p>}
              <small>로컬 PoC 서버: <code>npm run dev:colyseus</code></small>
            </div>
          ) : playMode === "online-coop" && !onlineReady ? (
            <div className={styles.onlineLobby} aria-live="polite">
              <span>{online.status === "reconnecting" ? "RECONNECTING" : "ROOM READY"}</span>
              <h1>{online.status === "reconnecting" ? "친구 연결을 복구하는 중…" : "친구를 기다리는 중…"}</h1>
              <p className={styles.roomCode}>{online.roomId || "방을 여는 중"}</p>
              {online.roomId && (
                <button type="button" onClick={() => void navigator.clipboard?.writeText(online.roomId)}>방 ID 복사</button>
              )}
              <small>두 플레이어가 연결되기 전에는 답과 공격이 서버에서 잠겨.</small>
              {online.error && <p className={styles.onlineError} role="alert">{online.error}</p>}
            </div>
          ) : state.phase !== "complete" ? (
            <div className={styles.questionCard}>
              <div className={styles.questionMeta}>
                <span>{question.grade}학년 · {question.subject}</span>
                <strong>{DIFFICULTY_LABEL[question.difficulty]} {state.questionIndex + 1}/{GAME_POC_QUESTIONS.length}</strong>
              </div>
              <p className={styles.concept}>{question.concept}</p>
              <h1>{question.question}</h1>

              {playMode === "online-coop" && !canOnlineAct ? (
                <div className={styles.turnWait} aria-live="polite">
                  <strong>{activePlayer.displayName}의 차례</strong>
                  <span>친구가 결계를 풀고 공격할 때까지 전투 장면을 지켜보자.</span>
                </div>
              ) : state.phase === "question" ? (
                <form onSubmit={(event) => { event.preventDefault(); submitAnswer(); }} className={styles.answerForm}>
                  <MathLiveAnswerField
                    className={styles.mathField}
                    value={answer}
                    onValueChange={setAnswer}
                    resetKey={`${question.id}-${state.wrongCount}`}
                  />
                  <div className={styles.quickPad} role="group" aria-label="빠른 숫자 입력">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "−", "0"].map((key) => (
                      <button
                        key={key}
                        type="button"
                        aria-label={`${key === "−" ? "빼기" : `숫자 ${key}`} 입력`}
                        onClick={() => setAnswer((current) => `${current}${key === "−" ? "-" : key}`)}
                      >
                        {key}
                      </button>
                    ))}
                    <button type="button" aria-label="한 칸 지우기" onClick={() => setAnswer((current) => current.slice(0, -1))}>지우기</button>
                  </div>
                  <button type="submit" disabled={!answer.trim()}>답으로 결계 해독</button>
                </form>
              ) : null}

              {state.phase === "attack-ready" && (playMode !== "online-coop" || canOnlineAct) && (
                <button
                  type="button"
                  className={styles.attackButton}
                  onPointerDown={() => { pressStartedAt.current = performance.now(); }}
                  onPointerUp={() => attack(performance.now() - pressStartedAt.current >= 500)}
                  onPointerCancel={() => { pressStartedAt.current = 0; }}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") attack(false); }}
                >
                  <span>정답 공격!</span><small>누르면 공격 · 0.5초 길게 누르면 차지</small>
                </button>
              )}

              {state.phase === "special-ready" && (playMode !== "online-coop" || canOnlineAct) && (
                <button type="button" className={styles.specialButton} disabled={specialPlaying} onClick={activateSpecial}>
                  <span>{specialPlaying ? "스페셜 발동 중…" : "개념 마스터 스페셜"}</span>
                  <small>심화 룬의 힘으로 마지막 결계를 끝내자!</small>
                </button>
              )}
            </div>
          ) : (
            <div className={styles.victoryCard}>
              <span>STAGE CLEAR</span>
              <h1>수호자의 혼란이 풀렸어!</h1>
              <p>정답 {state.correctCount}회 · 다시 시도 {state.wrongCount}회</p>
              {playMode === "online-coop"
                ? <button type="button" onClick={() => void leaveOnlineRoom()}>협동 방 나가기</button>
                : <button type="button" onClick={() => reset()}>한 번 더 도전</button>}
            </div>
          )}

          <div className={`${styles.feedback} ${styles[state.feedback.kind]}`} aria-live="polite">
            <span>{state.feedback.kind === "wrong" ? "방어" : state.feedback.kind === "correct" ? "해독" : "전투"}</span>
            <div>
              <strong>{online.error || state.feedback.title}</strong>
              <p>{playMode === "online-coop" && online.roomId ? `방 ${online.roomId} · ${state.feedback.detail}` : state.feedback.detail}</p>
            </div>
          </div>
          {playMode === "online-coop" && learningLog && (
            <div className={styles.learningLogCard} aria-label="내 문제별 학습 로그">
              <strong>내 학습 로그</strong>
              <span>시도 {learningLog.totalAttempts}회 · 힌트 {learningLog.totalHints}회 · {Math.ceil(learningLog.totalElapsedMs / 1_000)}초</span>
              <small>원답은 저장하지 않고 문제별 시도·오답 유형만 기록해.</small>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Gauge({ label, value, tone }: { label: string; value: number; tone: "concept" | "skill" }) {
  return (
    <div className={`${styles.gauge} ${styles[tone]}`}>
      <span>{label}</span><strong>{value}%</strong>
      <div><i style={{ width: `${value}%` }} /></div>
    </div>
  );
}

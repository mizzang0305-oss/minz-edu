"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { PhaserStage } from "@/components/game/PhaserStage";
import { MathLiveAnswerField } from "./MathLiveAnswerField";
import { GAME_POC_QUESTIONS } from "@/data/gamePocQuestions";
import {
  createLearningBattlePocState,
  POC_CHARGED_ATTACK_DAMAGE,
  POC_NORMAL_ATTACK_DAMAGE,
  resolveLearningBattleAttack,
  resolveLearningBattleSpecial,
  submitLearningBattleAnswer,
} from "@/game/poc/LearningBattlePocEngine";
import type { BossAttackSignal, CoopBattleState, PlayerAttackSignal } from "@/types/battle";
import type { LearningBattleMode, LearningBattlePocState } from "@/types/learningBattlePoc";
import styles from "./LearningBattlePoc.module.css";

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
  const [answer, setAnswer] = useState("");
  const [attackSignal, setAttackSignal] = useState<PlayerAttackSignal | null>(null);
  const [bossAttackSignal, setBossAttackSignal] = useState<BossAttackSignal | null>(null);
  const [specialSignal, setSpecialSignal] = useState(0);
  const [specialPlaying, setSpecialPlaying] = useState(false);
  const attackId = useRef(0);
  const pressStartedAt = useRef(0);
  const question = GAME_POC_QUESTIONS[state.questionIndex];
  const activePlayer = state.players[state.activePlayerIndex];
  const phaserBattle = useMemo(() => toPhaserBattle(state), [state]);

  function reset(mode: LearningBattleMode = state.mode) {
    setState(createLearningBattlePocState(mode));
    setAnswer("");
    setAttackSignal(null);
    setBossAttackSignal(null);
    setSpecialSignal(0);
    setSpecialPlaying(false);
  }

  function submitAnswer() {
    if (!answer.trim() || state.phase !== "question") return;
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
    setSpecialSignal((value) => value + 1);
    navigator.vibrate?.([45, 30, 70]);
  }

  function finishSpecial() {
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
          <button type="button" className={state.mode === "solo" ? styles.selected : ""} onClick={() => reset("solo")}>1인</button>
          <button type="button" className={state.mode === "local-coop" ? styles.selected : ""} onClick={() => reset("local-coop")}>같은 화면 2인</button>
          <button type="button" onClick={() => reset()}>다시 시작</button>
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
                <div><strong>{player.displayName}</strong><small>HP {player.hp} · 보호막 {player.shield}</small></div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.commandPanel} aria-label="학습 전투 명령">
          <div className={styles.gaugeRow}>
            <Gauge label="개념 룬" value={state.conceptGauge} tone="concept" />
            <Gauge label="스킬 게이지" value={state.skillGauge} tone="skill" />
          </div>

          {state.phase !== "complete" ? (
            <div className={styles.questionCard}>
              <div className={styles.questionMeta}>
                <span>{question.grade}학년 · {question.subject}</span>
                <strong>{DIFFICULTY_LABEL[question.difficulty]} {state.questionIndex + 1}/{GAME_POC_QUESTIONS.length}</strong>
              </div>
              <p className={styles.concept}>{question.concept}</p>
              <h1>{question.question}</h1>

              {state.phase === "question" && (
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
              )}

              {state.phase === "attack-ready" && (
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

              {state.phase === "special-ready" && (
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
              <button type="button" onClick={() => reset()}>한 번 더 도전</button>
            </div>
          )}

          <div className={`${styles.feedback} ${styles[state.feedback.kind]}`} aria-live="polite">
            <span>{state.feedback.kind === "wrong" ? "방어" : state.feedback.kind === "correct" ? "해독" : "전투"}</span>
            <div><strong>{state.feedback.title}</strong><p>{state.feedback.detail}</p></div>
          </div>
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

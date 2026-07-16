"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PhaserStage } from "@/components/game/PhaserStage";
import { TenFrame } from "@/components/learning/TenFrame";
import { AdventureProgress } from "@/components/common/AdventureProgress";
import { GaugePanel } from "./GaugePanel";
import { BattleMomentumHUD } from "./BattleMomentumHUD";
import { battleModeFromPlayers, battleReducer, createBattleState, resolveBattleSelection, supportsTenFrame } from "@/game/systems/CombatSystem";
import { buildCorrectFeedback, buildHintFeedback, buildRetryFeedback } from "@/game/systems/LearningFeedback";
import { DEFAULT_SETTINGS, readGameData, saveAdventure } from "@/stores/storage";
import type { AdventureRecord } from "@/types/progress";
import type { PracticeQuestion, WeeklyLearningGoal } from "@/types/curriculum";
import { playBattleTone, speakBattleLine } from "@/utils/audioFeedback";
import { getLearningBattleProfile } from "@/learning/stages";
import { getWeeklyLearningGoals } from "@/learning/curriculumCatalog";
import { getExplorationMap } from "@/game/maps/mapRegistry";
import { withJosa } from "@/utils/koreanText";
import type { BossAttackSignal } from "@/types/battle";
import { getBossAttackWarningProfile } from "@/game/systems/BossAttackTiming";

const supportiveMessages = ["그림 힌트 보내기", "한 단계 나누기", "내 방법 설명하기", "응원 보내기"];
const BOSS_QUESTION_PHASES = ["PLAYER_MANIPULATE", "PLAYER_ANSWER", "SPECIAL_CHALLENGE"] as const;

type BossWarningState = {
  targetPlayerIndex: number;
  secondsLeft: number;
  paceLabel: string;
  incoming: boolean;
};

export function BattleClient() {
  const [battle, setBattle] = useState(() => createBattleState(DEFAULT_SETTINGS));
  const [hydrated, setHydrated] = useState(false);
  const [attackSignal, setAttackSignal] = useState<{ id: number; playerIndex: number; kind: "strong" | "magic" } | null>(null);
  const [bossAttackSignal, setBossAttackSignal] = useState<BossAttackSignal | null>(null);
  const [specialSignal, setSpecialSignal] = useState(0);
  const [readyCountdownActive, setReadyCountdownActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [stageId, setStageId] = useState<"number-forest" | "word-island" | "story-castle">("number-forest");
  const [learningGoal, setLearningGoal] = useState<WeeklyLearningGoal | null>(null);
  const [learningFeedback, setLearningFeedback] = useState<ReturnType<typeof buildCorrectFeedback> | null>(null);
  const [bossWarning, setBossWarning] = useState<BossWarningState | null>(null);
  const savedRef = useRef(false);
  const attackCounterRef = useRef(0);
  const bossAttackCounterRef = useRef(0);
  const specialCounterRef = useRef(0);
  const counterAttackTimersRef = useRef<number[]>([]);
  const bossWarningHandledRef = useRef(false);

  const dispatch = useCallback((action: Parameters<typeof battleReducer>[1]) => setBattle((current) => battleReducer(current, action)), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readGameData();
      const params = new URLSearchParams(window.location.search);
      const requestedStage = params.get("stage");
      const qaCombat = process.env.NODE_ENV === "development" && params.get("qa") === "combat";
      const goals = getWeeklyLearningGoals(stored.playerProfile, stored.parentSettings.academicSemester);
      const selection = resolveBattleSelection(goals, requestedStage, params.get("goal") ?? stored.parentSettings.selectedLearningGoalId);
      const resolvedStage = selection.stageId;
      const encounter = getExplorationMap(resolvedStage).boss;
      const initialBattle = createBattleState(stored.parentSettings);
      const bossMaxHp = 90 + encounter.threatTier * 45;
      setBattle({ ...initialBattle, battlePhase: qaCombat ? "PLAYER_MANIPULATE" : "INTRO", bossHp: bossMaxHp, bossMaxHp, bossShield: encounter.threatTier === 1 ? 10 : encounter.threatTier === 2 ? 25 : 40, message: qaCombat ? `${initialBattle.players[0].displayName} 차례 · ${selection.goal.unitTitle} 첫 번째 결계를 열어 보자!` : `${withJosa(encounter.name, "이", "가")} 학습 길을 헷갈리게 만들었어!` });
      setLearningGoal(selection.goal);
      setStageId(resolvedStage);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    counterAttackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    counterAttackTimersRef.current = [];
  }, []);

  const signalBossAttack = useCallback((outcome: BossAttackSignal["outcome"], targetPlayerIndex: number) => {
    bossAttackCounterRef.current += 1;
    setBossAttackSignal({
      id: bossAttackCounterRef.current,
      targetPlayerIndex,
      outcome,
      attackName: getExplorationMap(stageId).boss.attackName,
    });
  }, [stageId]);

  const activePlayer = battle.players[battle.activePlayerIndex] ?? battle.players[0];
  const activePlayerSchoolLevel = activePlayer.schoolLevel;
  const activePlayerGrade = activePlayer.grade;

  useEffect(() => {
    if (!hydrated || !BOSS_QUESTION_PHASES.some((phase) => phase === battle.battlePhase)) return;

    const warningProfile = getBossAttackWarningProfile({
      schoolLevel: activePlayerSchoolLevel,
      grade: activePlayerGrade,
    });
    const targetPlayerIndex = battle.activePlayerIndex;
    const startedAt = Date.now();
    let interval: number | undefined;
    bossWarningHandledRef.current = false;

    const startTimer = window.setTimeout(() => {
      setBossWarning({
        targetPlayerIndex,
        secondsLeft: Math.ceil(warningProfile.durationMs / 1000),
        paceLabel: warningProfile.paceLabel,
        incoming: false,
      });

      interval = window.setInterval(() => {
        if (bossWarningHandledRef.current) {
          if (interval !== undefined) window.clearInterval(interval);
          return;
        }

        const remainingMs = Math.max(0, warningProfile.durationMs - (Date.now() - startedAt));
        if (remainingMs > 0) {
          const secondsLeft = Math.ceil(remainingMs / 1000);
          setBossWarning((current) => current && current.targetPlayerIndex === targetPlayerIndex
            ? { ...current, secondsLeft }
            : current);
          return;
        }

        bossWarningHandledRef.current = true;
        if (interval !== undefined) window.clearInterval(interval);
        setBossWarning({
          targetPlayerIndex,
          secondsLeft: 0,
          paceLabel: warningProfile.paceLabel,
          incoming: true,
        });
        signalBossAttack("telegraph", targetPlayerIndex);
      }, 200);
    }, 0);

    return () => {
      bossWarningHandledRef.current = true;
      window.clearTimeout(startTimer);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [activePlayerGrade, activePlayerSchoolLevel, battle.activePlayerIndex, battle.battlePhase, hydrated, signalBossAttack]);

  useEffect(() => {
    if (!readyCountdownActive || battle.battlePhase !== "SPECIAL_READY") return;
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;
        dispatch({ type: "RESET_READY" });
        setReadyCountdownActive(false);
        return 5;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [battle.battlePhase, dispatch, readyCountdownActive]);

  useEffect(() => {
    if (!learningFeedback) return;
    const timer = window.setTimeout(() => setLearningFeedback(null), 4200);
    return () => window.clearTimeout(timer);
  }, [learningFeedback]);

  useEffect(() => {
    if (battle.battlePhase !== "RESULT" || savedRef.current || !learningGoal) return;
    savedRef.current = true;
    const coop = battle.players.length === 2;
    const stageMap = getExplorationMap(stageId);
    const record: AdventureRecord = {
      id: `adventure-${Date.now()}`,
      completedAt: new Date().toISOString(),
      mode: battleModeFromPlayers(battle.players),
      playerNames: battle.players.map((player) => player.displayName),
      completedMissions: battle.completedMissionIds.length,
      firstTryCorrect: battle.firstTryCorrectCount,
      retryCount: battle.retryCount,
      hintCount: battle.hintCount,
      specialSkill: coop ? "민즈 트윈 드래곤 브레이크" : "민즈 썬더 드래곤 브레이크",
      coins: coop ? 60 : 35,
      badges: [`${stageMap.collectionLabel} 수호 배지`, ...(battle.retryCount > 0 ? ["다시 도전 용기 배지"] : [])],
      teamRewards: coop ? ["우정 코인", "합동 스킬 조각", `${stageMap.boss.name} 우정 트로피`] : [],
      coopMetrics: coop ? battle.coopMetrics : undefined,
      stageId,
      mapId: stageMap.id,
      completedQuestIds: [`meet-${stageMap.npcs[0].id}`, `open-${stageMap.chest.id}`, `collect-${stageMap.collectibles.length}`, `cross-${stageMap.bridge.id}`, `meet-${stageMap.boss.id}`],
      learningGoalId: learningGoal.id,
    };
    saveAdventure(record);
  }, [battle, learningGoal, stageId]);

  const attack = (playerIndex: number, kind: "strong" | "magic") => {
    attackCounterRef.current += 1;
    playBattleTone(kind, battle.soundVolume);
    setAttackSignal({ id: attackCounterRef.current, playerIndex, kind });
  };

  const dodgeAndCounter = (playerIndex: number, kind: "strong" | "magic") => {
    bossWarningHandledRef.current = true;
    signalBossAttack("dodge", playerIndex);
    dispatch({ type: "DODGE_SUCCESS" });
    const timer = window.setTimeout(() => {
      counterAttackTimersRef.current = counterAttackTimersRef.current.filter((pending) => pending !== timer);
      attack(playerIndex, kind);
    }, 320);
    counterAttackTimersRef.current.push(timer);
  };

  if (!hydrated || !learningGoal) return <div className="loading-card">숫자 숲의 길을 여는 중…</div>;

  const primaryProfile = getLearningBattleProfile(battle.players[0]);
  const stageMap = getExplorationMap(stageId);
  const selectedGoal = learningGoal;
  const stageQuestions = selectedGoal.questions;
  const bossAttackDamage = 4 + stageMap.boss.threatTier * 4;
  const useTenFrame = supportsTenFrame(selectedGoal) && primaryProfile.opening.kind === "blocks";
  const openingMission = useTenFrame
    ? primaryProfile.opening
    : { kind: "choice" as const, title: `${selectedGoal.unitTitle} 첫 번째 결계`, prompt: stageQuestions[0].prompt, choices: stageQuestions[0].choices, answer: stageQuestions[0].answer, copy: selectedGoal.objective };
  const answerPrompt = { title: `${selectedGoal.unitTitle} 두 번째 결계`, prompt: stageQuestions[1].prompt, choices: stageQuestions[1].choices, answer: stageQuestions[1].answer, copy: selectedGoal.objective };
  const deepMission = { prompt: `${selectedGoal.unitTitle} 마지막 결계를 풀어라`, copy: stageQuestions[2].prompt, choices: stageQuestions[2].choices, answer: stageQuestions[2].answer };
  const openingAnswer = openingMission.kind === "choice" ? openingMission.answer : "";
  const combatActive = battle.battlePhase !== "INTRO";
  const activeQuestionPrompt = battle.battlePhase === "PLAYER_MANIPULATE"
    ? (openingMission.kind === "choice" ? openingMission.prompt : openingMission.title)
    : battle.battlePhase === "PLAYER_ANSWER"
      ? answerPrompt.prompt
      : battle.battlePhase === "SPECIAL_CHALLENGE"
        ? deepMission.copy
        : null;
  const activeBossWarning = activeQuestionPrompt && bossWarning?.targetPlayerIndex === battle.activePlayerIndex
    ? bossWarning
    : null;
  const incomingAttackPrompt = activeQuestionPrompt
    ? activeBossWarning && !activeBossWarning.incoming
      ? `${stageMap.boss.attackName} 준비 ${activeBossWarning.secondsLeft}초 · ${activeQuestionPrompt}`
      : `${stageMap.boss.attackName} 접근 · ${activeQuestionPrompt}`
    : null;

  const showRetry = (question: PracticeQuestion) => {
    bossWarningHandledRef.current = true;
    setBossWarning((current) => current && current.targetPlayerIndex === battle.activePlayerIndex
      ? { ...current, secondsLeft: 0, incoming: true }
      : current);
    setLearningFeedback(buildRetryFeedback(question, battle.attemptCount + 1));
    signalBossAttack("hit", battle.activePlayerIndex);
    dispatch({ type: "DODGE_FAILED", damage: bossAttackDamage, hint: question.hint });
  };

  const showHint = (question: PracticeQuestion) => {
    setLearningFeedback(buildHintFeedback(question));
    dispatch({ type: "USE_HINT", hint: question.hint });
  };

  const chooseAnswer = (choice: string, question: PracticeQuestion, missionId: string, deep = false) => {
    if (choice !== question.answer) {
      showRetry(question);
      return;
    }
    setLearningFeedback(buildCorrectFeedback(question, battle.currentQuestionRetried || battle.currentQuestionHintUsed));
    dodgeAndCounter(battle.activePlayerIndex, deep ? "magic" : battle.activePlayerIndex === 0 ? "strong" : "magic");
    dispatch(deep ? { type: "SPECIAL_CHALLENGE_SUCCESS", missionId } : { type: "ANSWER_SUCCESS", missionId });
  };

  const pressReady = (index: number) => {
    const allReadyAfterPress = battle.players.every((player, playerIndex) => player.ready || playerIndex === index);
    if (!readyCountdownActive && !allReadyAfterPress) setReadyCountdownActive(true);
    dispatch({ type: "PLAYER_READY", playerIndex: index });
    if (allReadyAfterPress) {
      setReadyCountdownActive(false);
      playBattleTone("special", battle.soundVolume);
      speakBattleLine(battle.players.length === 2 ? "민즈 트윈 드래곤 브레이크" : "민즈 썬더 드래곤 브레이크", battle.soundVolume);
      specialCounterRef.current += 1;
      setSpecialSignal(specialCounterRef.current);
    }
  };

  return (
    <main className={combatActive ? "battle-page combat-mode" : "battle-page explore-mode"}>
      <AdventureProgress current="battle" />
      <div className="battle-topline"><div><span className="eyebrow">{primaryProfile.stageLabel} · 위협도 {stageMap.boss.threatTier}</span><h1>{battle.players.length === 2 ? `둘의 힘으로 ${stageMap.boss.name}의 혼란을 풀어라` : `${stageMap.boss.name} 상대 학습 작전을 시작하자`}</h1></div><Link className="quiet-link" href="/world">모험 지도</Link></div>
      <div className={combatActive ? "battle-layout is-combat" : "battle-layout is-exploring"}>
        <div className="battle-main">
          <div className="battle-visual">
            <PhaserStage
              stageId={stageId}
              battle={battle}
              attackSignal={attackSignal}
              bossAttackSignal={bossAttackSignal}
              specialSignal={specialSignal}
              onSpecialComplete={() => dispatch({ type: "SPECIAL_COMPLETE" })}
              onExploreComplete={() => dispatch({ type: "START", goalTitle: selectedGoal.unitTitle })}
            />
            {combatActive && <BattleMomentumHUD battle={battle} />}
            <div className={learningFeedback ? "battle-message has-feedback" : "battle-message"} role="status" aria-live="polite"><span className="guide-avatar">{incomingAttackPrompt ? "🛡️" : "⚡"}</span><div className="battle-message-copy"><strong>{incomingAttackPrompt ?? battle.message}</strong>{learningFeedback ? <small>{learningFeedback.title} {learningFeedback.explanation}</small> : incomingAttackPrompt ? <small>{activeBossWarning && !activeBossWarning.incoming ? `${activeBossWarning.paceLabel} · ` : ""}정답이면 자동 회피 후 반격! 오답이면 보호막이 공격을 받아요.</small> : null}</div></div>
            {combatActive && <section className="mission-panel battle-command-console" data-testid="battle-command-console" aria-label="전투 학습 명령">
            <div className="battle-mission-steps" aria-label={`학습 결계 ${Math.min(3, battle.completedMissionIds.length)}/3 완료`}><span className={battle.completedMissionIds.length >= 1 ? "done" : "current"}>발견</span><span className={battle.completedMissionIds.length >= 2 ? "done" : battle.completedMissionIds.length === 1 ? "current" : ""}>연결</span><span className={battle.completedMissionIds.length >= 3 ? "done" : battle.completedMissionIds.length === 2 ? "current" : ""}>마무리</span></div>
            {battle.battlePhase === "PLAYER_MANIPULATE" && (openingMission.kind === "blocks" ? <TenFrame {...openingMission} onComplete={() => { setLearningFeedback(buildCorrectFeedback(stageQuestions[0], battle.currentQuestionRetried || battle.currentQuestionHintUsed)); dodgeAndCounter(0, "strong"); dispatch({ type: "MANIPULATION_SUCCESS", missionId: stageQuestions[0].id }); }} /> : <div className="choice-mission"><span className="mission-kind">{openingMission.title}</span><h2>{openingMission.prompt}</h2><p>{openingMission.copy}</p><div className="choice-grid">{openingMission.choices.map((choice) => <button key={choice} onClick={() => { if (choice !== openingAnswer) { showRetry(stageQuestions[0]); return; } setLearningFeedback(buildCorrectFeedback(stageQuestions[0], battle.currentQuestionRetried || battle.currentQuestionHintUsed)); dodgeAndCounter(0, "strong"); dispatch({ type: "MANIPULATION_SUCCESS", missionId: stageQuestions[0].id }); }}>{choice}</button>)}</div></div>)}
            {battle.battlePhase === "PLAYER_ANSWER" && <div className="choice-mission"><span className="mission-kind">{answerPrompt.title}</span><h2>{answerPrompt.prompt}</h2><p>{answerPrompt.copy}</p><div className="choice-grid">{answerPrompt.choices.map((choice) => <button key={choice} onClick={() => chooseAnswer(choice, stageQuestions[1], stageQuestions[1].id)}>{choice}</button>)}</div><div className="help-row">{supportiveMessages.slice(0, battle.players.length === 2 ? 4 : 2).map((message) => <button type="button" key={message} onClick={() => showHint(stageQuestions[1])}>{message}</button>)}</div></div>}
            {battle.battlePhase === "SPECIAL_CHALLENGE" && <div className="choice-mission deep"><span className="mission-kind">{battle.players.length === 2 ? "함께 작전 세우기" : "스페셜 작전"}</span><h2>{deepMission.prompt}</h2><p>{deepMission.copy}</p><div className="choice-grid vertical">{deepMission.choices.map((choice) => <button key={choice} onClick={() => chooseAnswer(choice, stageQuestions[2], stageQuestions[2].id, true)}>{choice}</button>)}</div><button className="hint-button" onClick={() => showHint(stageQuestions[2])}>작전 힌트 보기</button></div>}
            {battle.battlePhase === "SPECIAL_READY" && <div className="special-ready"><span className="mission-kind">필살기 준비</span><h2>{battle.players.length === 2 ? "민즈 트윈 드래곤 브레이크" : "민즈 썬더 드래곤 브레이크"}</h2><p>{battle.players.length === 2 ? `두 준비 버튼을 ${secondsLeft}초 안에 모두 눌러 줘. 시간이 지나도 다시 할 수 있어.` : "준비 버튼을 누르면 번개 드래곤이 나타나!"}</p><div className={battle.players.length === 2 ? "ready-buttons" : "ready-buttons solo"}>{battle.players.map((player, index) => <button key={player.id} className={player.ready ? "ready-button pressed" : `ready-button player-${index + 1}`} disabled={player.ready} onClick={() => pressReady(index)}><span>{player.ready ? "준비 완료" : `${player.displayName} 준비`}</span><small>{index === 0 ? "번개 힘" : "불꽃 힘"}</small></button>)}</div>{readyCountdownActive && battle.players.some((player) => !player.ready) && <div className="countdown" aria-live="polite">함께 누를 시간 {secondsLeft}</div>}</div>}
            {battle.battlePhase === "SPECIAL_CUTSCENE" && <div className="cutscene-note"><div className="energy-spinner" /><h2>{battle.players.length === 2 ? "두 힘이 하나로 합쳐지는 중!" : "번개 에너지가 모이는 중!"}</h2><p>눈이 편안하도록 빠른 번쩍임 없이 힘차게 연출하고 있어.</p></div>}
            {battle.battlePhase === "RESULT" && <div className="battle-result"><span className="victory-mark">★</span><span className="mission-kind">모험 완료</span><h2>{withJosa(stageMap.boss.name, "과", "와")} 친구가 됐어!</h2><p>{stageMap.boss.resolveCopy}</p><div className="reward-row"><span>🪙 {battle.players.length === 2 ? 60 : 35} 코인</span><span>🛡️ 용기 배지</span>{battle.players.length === 2 && <span>🤝 우정 코인</span>}</div><Link href="/result" className="primary-button wide">보물과 오늘의 생각 보기</Link></div>}
            </section>}
          </div>
        </div>
        <GaugePanel battle={battle} bossName={stageMap.boss.name} />
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PhaserStage } from "@/components/game/PhaserStage";
import { TenFrame } from "@/components/learning/TenFrame";
import { GaugePanel } from "./GaugePanel";
import { battleModeFromPlayers, battleReducer, createBattleState } from "@/game/systems/CombatSystem";
import { DEFAULT_SETTINGS, readGameData, saveAdventure } from "@/stores/storage";
import type { AdventureRecord } from "@/types/progress";
import { playBattleTone, speakBattleLine } from "@/utils/audioFeedback";

const supportiveMessages = ["그림 힌트 보내기", "한 단계 나누기", "내 방법 설명하기", "응원 보내기"];

export function BattleClient() {
  const [battle, setBattle] = useState(() => createBattleState(DEFAULT_SETTINGS));
  const [hydrated, setHydrated] = useState(false);
  const [attackSignal, setAttackSignal] = useState<{ id: number; playerIndex: number; kind: "strong" | "magic" } | null>(null);
  const [specialSignal, setSpecialSignal] = useState(0);
  const [readyCountdownActive, setReadyCountdownActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const savedRef = useRef(false);
  const attackCounterRef = useRef(0);
  const specialCounterRef = useRef(0);

  const dispatch = useCallback((action: Parameters<typeof battleReducer>[1]) => setBattle((current) => battleReducer(current, action)), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBattle(createBattleState(readGameData().parentSettings));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
    if (battle.battlePhase !== "RESULT" || savedRef.current) return;
    savedRef.current = true;
    const coop = battle.players.length === 2;
    const record: AdventureRecord = {
      id: `adventure-${Date.now()}`,
      completedAt: new Date().toISOString(),
      mode: battleModeFromPlayers(battle.players),
      playerNames: battle.players.map((player) => player.displayName),
      completedMissions: battle.completedMissionIds.length,
      retryCount: battle.retryCount,
      hintCount: battle.hintCount,
      specialSkill: coop ? "민즈 트윈 드래곤 브레이크" : "민즈 썬더 드래곤 브레이크",
      coins: coop ? 60 : 35,
      badges: ["10 만들기 개념 조각", ...(battle.retryCount > 0 ? ["다시 도전 용기 배지"] : [])],
      teamRewards: coop ? ["우정 코인", "합동 스킬 조각", "쌍둥이 숫자 슬라임 트로피"] : [],
      coopMetrics: coop ? battle.coopMetrics : undefined,
    };
    saveAdventure(record);
  }, [battle]);

  const attack = (playerIndex: number, kind: "strong" | "magic") => {
    attackCounterRef.current += 1;
    playBattleTone(kind, battle.soundVolume);
    setAttackSignal({ id: attackCounterRef.current, playerIndex, kind });
  };

  if (!hydrated) return <div className="loading-card">숫자 숲의 길을 여는 중…</div>;

  const answerPrompt = battle.players.length === 2
    ? { title: `${battle.players[1].displayName}의 불꽃 암호`, prompt: "7에서 2개를 옮겼어. 남은 수는 몇 개일까?", choices: ["4", "5", "6"], answer: "5" }
    : { title: "번개 암호", prompt: "빛 열매 8개에 7개가 더 열렸어. 모두 몇 개일까?", choices: ["14", "15", "16"], answer: "15" };

  const chooseAnswer = (choice: string, correctAnswer: string, deep = false) => {
    if (choice !== correctAnswer) {
      dispatch({ type: "ANSWER_RETRY" });
      return;
    }
    attack(battle.activePlayerIndex, deep ? "magic" : battle.activePlayerIndex === 0 ? "strong" : "magic");
    dispatch(deep ? { type: "SPECIAL_CHALLENGE_SUCCESS" } : { type: "ANSWER_SUCCESS", missionId: battle.players.length === 2 ? "friend-remaining-number" : "story-1" });
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
    <main className="battle-page">
      <div className="battle-topline"><div><span className="eyebrow">숫자 숲 · 오늘의 모험</span><h1>{battle.players.length === 2 ? "둘의 힘으로 숫자 보스를 막아라" : "10의 힘으로 숫자 슬라임을 막아라"}</h1></div><Link className="quiet-link" href="/world">모험 지도</Link></div>
      <div className="battle-layout">
        <div className="battle-main">
          <PhaserStage battle={battle} attackSignal={attackSignal} specialSignal={specialSignal} onSpecialComplete={() => dispatch({ type: "SPECIAL_COMPLETE" })} />
          <div className="battle-message" role="status" aria-live="polite"><span className="guide-avatar">⚡</span><strong>{battle.message}</strong></div>
          <section className="mission-panel">
            {battle.battlePhase === "INTRO" && <div className="intro-panel"><span className="mission-kind">새로운 작전</span><h2>{battle.players.length === 2 ? "두 영웅이 같은 화면에 모였어!" : "숫자 조각이 숲에 흩어졌어!"}</h2><p>{battle.players.length === 2 ? "민표와 친구가 차례로 자기 암호를 풀면 팀 링크가 이어져." : "블록을 직접 옮겨 10의 약점을 찾아 보자."}</p><button className="primary-button wide" onClick={() => dispatch({ type: "START" })}>전투 시작</button></div>}
            {battle.battlePhase === "PLAYER_MANIPULATE" && <TenFrame onComplete={() => { attack(0, "strong"); dispatch({ type: "MANIPULATION_SUCCESS" }); }} />}
            {battle.battlePhase === "PLAYER_ANSWER" && <div className="choice-mission"><span className="mission-kind">{answerPrompt.title}</span><h2>{answerPrompt.prompt}</h2><p>10을 먼저 만든 모습을 떠올려 봐.</p><div className="choice-grid">{answerPrompt.choices.map((choice) => <button key={choice} onClick={() => chooseAnswer(choice, answerPrompt.answer)}>{choice}</button>)}</div><div className="help-row">{supportiveMessages.slice(0, battle.players.length === 2 ? 4 : 2).map((message) => <button type="button" key={message} onClick={() => dispatch({ type: "USE_HINT" })}>{message}</button>)}</div></div>}
            {battle.battlePhase === "SPECIAL_CHALLENGE" && <div className="choice-mission deep"><span className="mission-kind">{battle.players.length === 2 ? "함께 작전 세우기" : "스페셜 작전"}</span><h2>8 + 7을 서로 다른 두 길로 나타낸 것은?</h2><p>{battle.players.length === 2 ? "민표의 번개 길과 친구의 불꽃 길이 같은 15로 만나야 해." : "두 길이 모두 같은 15로 가는지 확인해 봐."}</p><div className="choice-grid vertical"><button onClick={() => chooseAnswer("right", "right", true)}>8 + 2 + 5 &nbsp; / &nbsp; 7 + 3 + 5</button><button onClick={() => chooseAnswer("other", "right", true)}>8 + 1 + 5 &nbsp; / &nbsp; 7 + 2 + 4</button><button onClick={() => chooseAnswer("other-2", "right", true)}>10 + 7 &nbsp; / &nbsp; 10 + 8</button></div><button className="hint-button" onClick={() => dispatch({ type: "USE_HINT" })}>두 길 그림 힌트 보기</button></div>}
            {battle.battlePhase === "SPECIAL_READY" && <div className="special-ready"><span className="mission-kind">필살기 준비</span><h2>{battle.players.length === 2 ? "민즈 트윈 드래곤 브레이크" : "민즈 썬더 드래곤 브레이크"}</h2><p>{battle.players.length === 2 ? `두 준비 버튼을 ${secondsLeft}초 안에 모두 눌러 줘. 시간이 지나도 다시 할 수 있어.` : "준비 버튼을 누르면 번개 드래곤이 나타나!"}</p><div className={battle.players.length === 2 ? "ready-buttons" : "ready-buttons solo"}>{battle.players.map((player, index) => <button key={player.id} className={player.ready ? "ready-button pressed" : `ready-button player-${index + 1}`} disabled={player.ready} onClick={() => pressReady(index)}><span>{player.ready ? "준비 완료" : `${player.displayName} 준비`}</span><small>{index === 0 ? "번개 힘" : "불꽃 힘"}</small></button>)}</div>{readyCountdownActive && battle.players.some((player) => !player.ready) && <div className="countdown" aria-live="polite">함께 누를 시간 {secondsLeft}</div>}</div>}
            {battle.battlePhase === "SPECIAL_CUTSCENE" && <div className="cutscene-note"><div className="energy-spinner" /><h2>두 힘이 하나로 합쳐지는 중!</h2><p>눈이 편안하도록 빠른 번쩍임 없이 연출하고 있어.</p></div>}
            {battle.battlePhase === "RESULT" && <div className="battle-result"><span className="victory-mark">★</span><span className="mission-kind">모험 완료</span><h2>숫자 보스의 약점을 발견했어!</h2><p>{battle.players.map((player) => player.displayName).join("와 ")}의 힘으로 10 만들기 작전을 완성했어.</p><div className="reward-row"><span>🪙 {battle.players.length === 2 ? 60 : 35} 코인</span><span>🛡️ 용기 배지</span>{battle.players.length === 2 && <span>🤝 우정 코인</span>}</div><Link href="/result" className="primary-button wide">보물과 오늘의 생각 보기</Link></div>}
          </section>
        </div>
        <GaugePanel battle={battle} />
      </div>
    </main>
  );
}

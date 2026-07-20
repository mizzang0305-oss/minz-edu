import { describe, expect, it } from "vitest";
import { LearningRoomAuthority } from "./LearningRoomAuthority";

describe("LearningRoomAuthority", () => {
  it("두 플레이어가 연결되기 전에는 모든 학습 전투 입력을 차단한다", () => {
    const authority = new LearningRoomAuthority("room-waiting");
    authority.join("session-1", "민즈");

    expect(() => authority.resolveAnswer("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-core",
      answer: "20",
      clientSequence: 0,
    })).toThrowError(expect.objectContaining({ code: "WAITING_FOR_PLAYER" }));
    expect(authority.getSnapshot().connectionStatus).toBe("waiting");
  });

  it("오답 반격, 정답 공격, 턴 교대, 스페셜을 서버 순서대로 판정한다", () => {
    const authority = readyAuthority();

    const wrong = authority.resolveAnswer("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-core",
      answer: "19",
      clientSequence: 0,
    });
    expect(wrong.correct).toBe(false);
    expect(authority.getSnapshot().battle.players[0]).toMatchObject({ hp: 100, shield: 10 });

    expect(() => authority.resolveAnswer("session-2", {
      playerId: "player-2",
      questionId: "linear-equation-core",
      answer: "20",
      clientSequence: 0,
    })).toThrowError(expect.objectContaining({ code: "NOT_YOUR_TURN" }));

    const correct = authority.resolveAnswer("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-core",
      answer: "20",
      clientSequence: 1,
    });
    expect(correct.correct).toBe(true);
    expect(authority.getSnapshot().battle.phase).toBe("attack-ready");

    const attack = authority.resolveAttack("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-core",
      charged: true,
      clientSequence: 2,
    });
    expect(attack).toMatchObject({ charged: true, damage: 40, bossHp: 140 });
    expect(authority.getSnapshot().battle.activePlayerIndex).toBe(1);

    authority.resolveAnswer("session-2", {
      playerId: "player-2",
      questionId: "linear-equation-application",
      answer: "5",
      clientSequence: 0,
    });
    expect(() => authority.resolveAnswer("session-2", {
      playerId: "player-2",
      questionId: "linear-equation-application",
      answer: "5",
      clientSequence: 0,
    })).toThrowError(expect.objectContaining({ code: "STALE_SEQUENCE" }));
    authority.resolveAttack("session-2", {
      playerId: "player-2",
      questionId: "linear-equation-application",
      charged: false,
      clientSequence: 1,
    });

    authority.resolveAnswer("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-deep",
      answer: "6",
      clientSequence: 3,
    });
    const special = authority.resolveSpecial("session-1", {
      playerId: "player-1",
      clientSequence: 4,
    });
    expect(special).toMatchObject({ damage: 112, bossHp: 0 });
    expect(authority.getSnapshot().battle.phase).toBe("complete");
  });

  it("클라이언트가 다른 플레이어 ID나 과거 sequence로 행동하지 못한다", () => {
    const authority = readyAuthority();
    expect(() => authority.resolveAnswer("session-1", {
      playerId: "player-2",
      questionId: "linear-equation-core",
      answer: "20",
      clientSequence: 0,
    })).toThrowError(expect.objectContaining({ code: "PLAYER_MISMATCH" }));

    authority.resolveAnswer("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-core",
      answer: "20",
      clientSequence: 7,
    });
    expect(() => authority.resolveAttack("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-core",
      charged: false,
      clientSequence: 7,
    })).toThrowError(expect.objectContaining({ code: "STALE_SEQUENCE" }));
  });

  it("10초 재접속 좌석을 위한 drop/reconnect 동안 상태를 보존한다", () => {
    const authority = readyAuthority();
    authority.resolveAnswer("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-core",
      answer: "19",
      clientSequence: 0,
    });
    const beforeDrop = authority.getSnapshot().battle;

    authority.markDropped("session-2");
    expect(authority.getSnapshot().connectionStatus).toBe("reconnecting");
    expect(() => authority.resolveAnswer("session-1", {
      playerId: "player-1",
      questionId: "linear-equation-core",
      answer: "20",
      clientSequence: 1,
    })).toThrowError(expect.objectContaining({ code: "WAITING_FOR_PLAYER" }));

    authority.markReconnected("session-2");
    expect(authority.getSnapshot().connectionStatus).toBe("ready");
    expect(authority.getSnapshot().battle).toEqual(beforeDrop);
  });

  it("외부가 받은 snapshot을 바꿔도 서버 원본은 변하지 않는다", () => {
    const authority = readyAuthority();
    const snapshot = authority.getSnapshot();
    snapshot.battle.bossHp = 0;
    snapshot.battle.players[0].hp = 0;
    expect(authority.getSnapshot().battle).toMatchObject({ bossHp: 180 });
    expect(authority.getSnapshot().battle.players[0].hp).toBe(100);
  });
});

function readyAuthority() {
  const authority = new LearningRoomAuthority("room-ready");
  authority.join("session-1", "<민즈>");
  authority.join("session-2", "친구");
  expect(authority.getSnapshot().battle.players[0].displayName).toBe("민즈");
  expect(authority.getSnapshot().connectionStatus).toBe("ready");
  return authority;
}

import type { MathMission } from "@/types/mission";
import type { CoopMission } from "@/types/battle";

const rewards = { battleGauge: 15, conceptGauge: 20, coins: 5 };

export const mathMissions: MathMission[] = [
  ...[6, 7, 8, 9, 5].map((start, index) => ({
    id: `observe-ten-${index + 1}`,
    grade: 2,
    conceptId: "make-ten",
    difficulty: "foundation" as const,
    missionType: "observe" as const,
    prompt: `${start}에서 10까지 빈칸은 몇 칸일까?`,
    choices: [String(10 - start), String(9 - start), String(11 - start)],
    answer: 10 - start,
    explanationSteps: [`${start}에 ${10 - start}을 더하면 10이 돼.`],
    hints: ["10칸 중 비어 있는 칸을 손가락으로 세어 보자."],
    rewards,
  })),
  ...[
    [8, 7], [9, 5], [6, 8], [7, 6], [5, 9],
  ].map(([left, right], index) => ({
    id: `move-block-${index + 1}`,
    grade: 2,
    conceptId: "make-ten",
    difficulty: "core" as const,
    missionType: "manipulate" as const,
    prompt: `${left}의 10칸을 채우려면 ${right}에서 몇 개를 옮길까?`,
    visualModel: { type: "tenFrame" as const, data: { left, right } },
    answer: 10 - left,
    explanationSteps: [`${left}에 ${10 - left}을 더하면 10이 돼.`],
    hints: ["빈칸 수만큼 블록을 옮겨 보자.", "10칸 틀의 빈칸을 세어 보자."],
    rewards,
  })),
  ...[
    [8, 7, 15], [9, 6, 15], [7, 5, 12], [6, 8, 14], [9, 4, 13],
  ].map(([left, right, answer], index) => ({
    id: `carry-add-${index + 1}`,
    grade: 2,
    conceptId: "carrying-addition",
    difficulty: "core" as const,
    missionType: "calculate" as const,
    prompt: `${left} + ${right}의 번개 암호는?`,
    choices: [String(answer), String(answer - 1), String(answer + 1)],
    answer,
    explanationSteps: [`먼저 ${left}를 10으로 만들고 남은 수를 더해.`],
    hints: ["먼저 10을 만들어 보자."],
    rewards,
  })),
  ...[
    "나무에 빛 열매가 8개, 새로 7개가 열렸어. 모두 몇 개일까?",
    "번개 조각 9개와 불꽃 조각 6개를 모았어. 모두 몇 개일까?",
    "슬라임 7마리 뒤에 5마리가 더 나타났어. 모두 몇 마리일까?",
  ].map((prompt, index) => ({
    id: `story-${index + 1}`,
    grade: 2,
    conceptId: "carrying-addition",
    difficulty: "application" as const,
    missionType: "apply" as const,
    prompt,
    choices: index === 2 ? ["12", "11", "13"] : ["15", "14", "16"],
    answer: index === 2 ? 12 : 15,
    explanationSteps: ["10을 먼저 만들면 남은 수가 잘 보여."],
    hints: ["두 묶음을 10과 나머지로 바꿔 보자."],
    rewards: { battleGauge: 20, conceptGauge: 25, coins: 8 },
  })),
  ...[
    "8 + 7에서 왜 7을 2와 5로 나누면 좋을까?",
    "9 + 6에서 먼저 10을 만들 수 있는 이유는 무엇일까?",
    "서로 다른 두 방법이 같은 답이 되는 까닭은 무엇일까?",
  ].map((prompt, index) => ({
    id: `explain-${index + 1}`,
    grade: 2,
    conceptId: "make-ten",
    difficulty: "application" as const,
    missionType: "explain" as const,
    prompt,
    choices: ["10 묶음을 먼저 만들면 남은 수가 잘 보여", "큰 수는 언제나 두 번 더해야 해", "블록 색이 같아야 해"],
    answer: "10 묶음을 먼저 만들면 남은 수가 잘 보여",
    explanationSteps: ["10은 계산하기 편한 묶음이야."],
    hints: ["10 + 5와 8 + 7 중 어느 쪽이 한눈에 보이는지 생각해 보자."],
    rewards: { battleGauge: 20, conceptGauge: 20, coins: 8 },
  })),
  ...[
    "8 + 7을 10 만들기와 다른 방법 두 가지로 나타내 보자.",
    "9 + 6의 답이 15가 되는 서로 다른 길을 찾아보자.",
  ].map((prompt, index) => ({
    id: `deep-${index + 1}`,
    grade: 2,
    conceptId: "multiple-strategies",
    difficulty: "deep" as const,
    missionType: "create" as const,
    prompt,
    choices: ["8+2+5와 7+3+5", "8+1+5와 7+2+4", "10+7과 10+8"],
    answer: "8+2+5와 7+3+5",
    explanationSteps: ["더하는 순서와 묶는 방법이 달라도 전체 수는 같아."],
    hints: ["8을 10으로 만드는 길과 7을 10으로 만드는 길을 찾아보자."],
    rewards: { battleGauge: 30, conceptGauge: 25, coins: 12 },
  })),
];

export const firstCoopMission: CoopMission = {
  id: "coop-make-ten-8-7",
  conceptId: "make-ten",
  missionType: "split-task",
  playerTasks: [
    {
      playerSlot: 0,
      taskType: "shared-manipulation",
      prompt: "민표의 번개 암호: 8의 10칸을 채울 블록을 옮겨 줘.",
      difficultyPolicy: "individualized",
      rewards: { personalGauge: 35, teamLinkGauge: 25 },
    },
    {
      playerSlot: 1,
      taskType: "calculate",
      prompt: "친구의 불꽃 암호: 옮기고 남은 수를 찾아 줘.",
      difficultyPolicy: "individualized",
      rewards: { personalGauge: 35, teamLinkGauge: 25 },
    },
  ],
  completionPolicy: "role-combination",
  teamReward: { teamLinkGauge: 50, coins: 20 },
};

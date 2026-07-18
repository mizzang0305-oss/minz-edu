import type { LearningBattleProfile, LearningStage, SchoolLevel } from "@/types/learning";

export const SCHOOL_LEVEL_LABELS: Record<SchoolLevel, string> = {
  kindergarten: "유아",
  elementary: "초등",
  middle: "중등",
};

export const SCHOOL_LEVEL_GRADES: Record<SchoolLevel, number[]> = {
  kindergarten: [5, 6, 7],
  elementary: [1, 2, 3, 4, 5, 6],
  middle: [1, 2, 3],
};

export function isSchoolLevel(value: unknown): value is SchoolLevel {
  return value === "kindergarten" || value === "elementary" || value === "middle";
}

export function isValidLearningStage(schoolLevel: unknown, grade: unknown): schoolLevel is SchoolLevel {
  return isSchoolLevel(schoolLevel)
    && Number.isInteger(grade)
    && SCHOOL_LEVEL_GRADES[schoolLevel].includes(Number(grade));
}

export function normalizeLearningStage(schoolLevel: unknown, grade: unknown): LearningStage {
  if (isValidLearningStage(schoolLevel, grade)) return { schoolLevel, grade: Number(grade) };
  const legacyGrade = Number.isInteger(grade) && Number(grade) >= 1 && Number(grade) <= 6 ? Number(grade) : 2;
  return { schoolLevel: "elementary", grade: legacyGrade };
}

export function formatLearningStage(stage: LearningStage) {
  return stage.schoolLevel === "kindergarten"
    ? `유아 ${stage.grade}세`
    : `${SCHOOL_LEVEL_LABELS[stage.schoolLevel]} ${stage.grade}학년`;
}

export function getLearningBattleProfile(stage: LearningStage): LearningBattleProfile {
  if (stage.schoolLevel === "kindergarten") {
    const older = stage.grade >= 6;
    return {
      stageLabel: formatLearningStage(stage), conceptId: "early-number", conceptName: older ? "5 만들기" : "3 만들기", bossName: "숫자 씨앗 수호자", battleTitle: "작은 수의 힘으로 씨앗 수호자를 깨워라", introTitle: "숫자 씨앗이 잠들었어!", introCopy: "블록을 손으로 옮기고 같은 수를 찾아 씨앗을 깨워 보자.",
      opening: { kind: "blocks", target: older ? 5 : 3, base: older ? 3 : 2, source: older ? 4 : 2, move: older ? 2 : 1, title: older ? "3에 몇 개를 더하면 5일까?" : "2에 몇 개를 더하면 3일까?", copy: "블록을 눌러 빈칸으로 옮겨 보세요." },
      answer: { title: "반짝 씨앗 암호", prompt: older ? "사과 3개와 2개를 모으면 몇 개일까?" : "별 2개와 1개를 모으면 몇 개일까?", choices: older ? ["4", "5", "6"] : ["2", "3", "4"], answer: older ? "5" : "3", copy: "손가락으로 하나씩 세어도 좋아요." },
      deep: { prompt: older ? "같은 5가 되는 두 길은?" : "같은 3이 되는 두 길은?", copy: "순서가 달라도 같은 수가 되는지 찾아보세요.", choices: older ? ["3 + 2 / 4 + 1", "3 + 1 / 2 + 2", "5 + 1 / 4 + 2"] : ["2 + 1 / 1 + 2", "2 + 2 / 1 + 1", "3 + 1 / 2 + 2"], answer: older ? "3 + 2 / 4 + 1" : "2 + 1 / 1 + 2" },
      hint: older ? "3에서 5까지 손가락을 두 번 더 펴 보자." : "2 다음 수를 하나 말해 보자.",
    };
  }

  if (stage.schoolLevel === "middle") {
    const concept = stage.grade === 1
      ? { id: "linear-equation", name: "일차방정식", boss: "미지수 골렘", prompt: "3x + 2 = 14일 때 x는?", choices: ["3", "4", "5"], answer: "4", hint: "양변에서 2를 빼고, 남은 12를 3으로 나누세요." }
      : stage.grade === 2
        ? { id: "linear-function", name: "일차함수", boss: "좌표 그림자", prompt: "y = 2x + 1에서 x = 3일 때 y는?", choices: ["6", "7", "8"], answer: "7", hint: "x 자리에 3을 넣어 2 × 3 + 1을 계산하세요." }
        : { id: "quadratic-equation", name: "이차방정식", boss: "포물선 용", prompt: "x² - 5x + 6 = 0의 해는?", choices: ["1, 6", "2, 3", "-2, -3"], answer: "2, 3", hint: "곱이 6이고 합이 5인 두 수를 찾아 (x-2)(x-3)으로 인수분해하세요." };
    return {
      stageLabel: formatLearningStage(stage), conceptId: concept.id, conceptName: concept.name, bossName: concept.boss,
      battleTitle: `${concept.name}의 힘으로 ${concept.boss}을 공략하라`, introTitle: `${concept.boss}이 길을 막았어!`, introCopy: "문제의 조건을 식과 그래프로 연결해 약점을 찾아보자.",
      opening: { kind: "choice", title: `${concept.name} 첫 결계`, prompt: concept.prompt, choices: concept.choices, answer: concept.answer, copy: concept.hint },
      answer: { title: `${concept.name} 연결 결계`, prompt: concept.prompt, choices: concept.choices, answer: concept.answer, copy: concept.hint },
      deep: { prompt: `${concept.name}의 풀이 근거를 고르세요.`, copy: concept.hint, choices: concept.choices, answer: concept.answer },
      hint: concept.hint,
    };
  }

  if (stage.grade >= 5) {
    return { stageLabel: formatLearningStage(stage), conceptId: "fraction-operation", conceptName: "분수 연산", bossName: "분수 결정 수호자", battleTitle: "분수의 힘으로 결정 수호자를 공략하라", introTitle: "분수 결정이 길을 막았어!", introCopy: "기준을 같게 만들고 분수 조각을 결합해 보자.", opening: { kind: "choice", title: "분수 조각 결합", prompt: "1/2 + 1/4은?", choices: ["2/6", "3/4", "1/8"], answer: "3/4", copy: "분모를 같게 만든 뒤 분자를 더해 보세요." }, answer: { title: "소수 변환 암호", prompt: "3/4을 소수로 나타내면?", choices: ["0.34", "0.75", "1.25"], answer: "0.75", copy: "3을 4로 나누어 보세요." }, deep: { prompt: "서로 같은 값을 나타낸 것은?", copy: "분수와 소수 표현을 연결하세요.", choices: ["1/2 = 0.5", "1/4 = 0.4", "3/5 = 0.35"], answer: "1/2 = 0.5" }, hint: "1/2은 2/4와 같다는 것을 떠올려 보자." };
  }

  if (stage.grade >= 3) {
    return { stageLabel: formatLearningStage(stage), conceptId: "multiplication-division", conceptName: "곱셈과 나눗셈", bossName: "곱셈 갑옷 수호자", battleTitle: "곱셈의 힘으로 갑옷 수호자를 막아라", introTitle: "같은 수 묶음이 결계를 만들었어!", introCopy: "같은 크기의 묶음을 빠르게 계산해 갑옷을 해제하자.", opening: { kind: "choice", title: "묶음 결계", prompt: "4개씩 들어 있는 상자가 3개라면 모두 몇 개?", choices: ["7", "12", "14"], answer: "12", copy: "4를 세 번 더하거나 4 × 3으로 계산하세요." }, answer: { title: "나눗셈 암호", prompt: "24개를 6명에게 똑같이 나누면 한 명당 몇 개?", choices: ["3", "4", "6"], answer: "4", copy: "24 안에 6이 몇 번 들어가는지 생각하세요." }, deep: { prompt: "같은 답이 되는 두 식은?", copy: "곱셈식을 다른 묶음으로 바꾸어 보세요.", choices: ["3 × 8 / 6 × 4", "4 × 5 / 2 × 8", "7 × 3 / 6 × 4"], answer: "3 × 8 / 6 × 4" }, hint: "같은 수를 여러 번 더한 모습을 곱셈식으로 바꾸어 보자." };
  }

  return { stageLabel: formatLearningStage(stage), conceptId: "make-ten", conceptName: "10 만들기", bossName: "숫자 수호자", battleTitle: "10의 힘으로 숫자 수호자를 막아라", introTitle: "숫자 조각이 숲에 흩어졌어!", introCopy: "블록을 직접 옮겨 10의 약점을 찾아 보자.", opening: { kind: "blocks", target: 10, base: 8, source: 7, move: 2, title: "8의 빈칸을 채워 10을 만들어 줘!", copy: "오른쪽 블록을 빈칸으로 옮겨 보세요." }, answer: { title: "번개 암호", prompt: "빛 열매 8개에 7개가 더 열렸어. 모두 몇 개일까?", choices: ["14", "15", "16"], answer: "15", copy: "10을 먼저 만든 모습을 떠올려 보세요." }, deep: { prompt: "8 + 7을 서로 다른 두 길로 나타낸 것은?", copy: "두 길이 모두 같은 15로 가는지 확인하세요.", choices: ["8 + 2 + 5 / 7 + 3 + 5", "8 + 1 + 5 / 7 + 2 + 4", "10 + 7 / 10 + 8"], answer: "8 + 2 + 5 / 7 + 3 + 5" }, hint: "8에 2를 더하면 10이 돼. 7에서 2를 옮기면 5가 남아." };
}

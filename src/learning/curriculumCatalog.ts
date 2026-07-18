import type { LearningStage } from "@/types/learning";
import type { AcademicSemester, PracticeQuestion, WeeklyLearningGoal } from "@/types/curriculum";
import type { MisconceptionTag } from "@/learning/misconceptionTags";

type UnitSeed = { title: string; objective: string; subject: "math" | "korean" | "english"; skillTag: string };

const PHASES = [
  { phase: "discover", title: "새 원리 발견", suffix: "그림과 조작으로 원리를 발견해요." },
  { phase: "practice", title: "기술 훈련", suffix: "대표 문제를 천천히 연습해요." },
  { phase: "apply", title: "모험에 적용", suffix: "생활 장면에서 해결 방법을 골라요." },
  { phase: "boss", title: "수호자 도전", suffix: "설명하며 스스로 해결하는지 확인해요." },
] as const;

export const SUBJECT_START_WEEKS = {
  math: 8,
  korean: 9,
  english: 10,
} as const;

const UNIT_SEEDS: Record<string, UnitSeed[]> = {
  "kindergarten-5": [
    { title: "하나씩 세기", objective: "놀이 속 사물을 하나씩 대응하며 세어요.", subject: "math", skillTag: "counting" },
    { title: "모양과 위치", objective: "같은 모양을 찾고 앞·뒤·옆 위치를 말해요.", subject: "math", skillTag: "shape-position" },
    { title: "말놀이 단어", objective: "그림을 보고 낱말로 느낌과 생각을 표현해요.", subject: "korean", skillTag: "oral-language" },
    { title: "이야기 순서", objective: "경험한 일을 처음·가운데·끝 순서로 말해요.", subject: "korean", skillTag: "story-order" },
  ],
  "kindergarten-6": [
    { title: "5까지 모으기", objective: "두 모음을 합쳐 5 이하의 수를 만들어요.", subject: "math", skillTag: "number-composition" },
    { title: "규칙 찾기", objective: "색과 모양의 반복 규칙을 찾아 이어 붙여요.", subject: "math", skillTag: "pattern" },
    { title: "소리와 글자", objective: "익숙한 낱말에서 같은 소리를 찾아요.", subject: "korean", skillTag: "sound-awareness" },
    { title: "그림 이야기", objective: "그림의 단서를 보고 다음 장면을 상상해요.", subject: "korean", skillTag: "prediction" },
  ],
  "kindergarten-7": [
    { title: "10까지 수", objective: "10까지 세고 두 수를 모으고 가르는 놀이를 해요.", subject: "math", skillTag: "number-composition" },
    { title: "비교와 측정", objective: "길이·무게·들이를 직접 비교해 말해요.", subject: "math", skillTag: "measurement" },
    { title: "문장으로 말하기", objective: "누가 무엇을 했는지 문장으로 이야기해요.", subject: "korean", skillTag: "sentence" },
    { title: "이야기 만들기", objective: "등장인물과 사건을 정해 짧은 이야기를 만들어요.", subject: "korean", skillTag: "story-making" },
  ],
  "elementary-1": [
    { title: "100까지 수", objective: "두 자리 수의 순서와 크기를 이해해요.", subject: "math", skillTag: "place-value" },
    { title: "덧셈과 뺄셈", objective: "10을 이용해 덧셈과 뺄셈을 해결해요.", subject: "math", skillTag: "make-ten" },
    { title: "문장 읽기", objective: "문장 부호에 맞게 소리 내어 읽고 뜻을 파악해요.", subject: "korean", skillTag: "sentence-reading" },
    { title: "겪은 일 쓰기", objective: "겪은 일을 순서가 드러나게 말하고 써요.", subject: "korean", skillTag: "experience-writing" },
    { title: "영어 인사와 소개", objective: "쉬운 인사말을 듣고 이름과 기분을 영어로 표현해요.", subject: "english", skillTag: "english-grade-1" },
  ],
  "elementary-2": [
    { title: "세 자리 수", objective: "세 자리 수의 자릿값과 크기를 비교해요.", subject: "math", skillTag: "place-value" },
    { title: "받아올림 덧셈", objective: "10을 만들어 두 자리 수 덧셈을 해결해요.", subject: "math", skillTag: "carrying-addition" },
    { title: "중요 내용 찾기", objective: "글에서 중요한 낱말과 문장을 찾아요.", subject: "korean", skillTag: "main-idea" },
    { title: "마음 나타내기", objective: "인물의 마음을 짐작하고 까닭을 말해요.", subject: "korean", skillTag: "character-feeling" },
    { title: "영어 일상 표현", objective: "학교와 집에서 하는 일을 나타내는 쉬운 영어 문장을 이해해요.", subject: "english", skillTag: "english-grade-2" },
  ],
  "elementary-3": [
    { title: "곱셈", objective: "곱셈의 뜻을 이해하고 곱셈구구를 활용해요.", subject: "math", skillTag: "multiplication" },
    { title: "나눗셈", objective: "똑같이 나누는 상황을 나눗셈으로 나타내요.", subject: "math", skillTag: "division" },
    { title: "중심 문장", objective: "문단의 중심 문장과 뒷받침 문장을 구분해요.", subject: "korean", skillTag: "paragraph" },
    { title: "의견과 까닭", objective: "의견을 정하고 알맞은 까닭을 들어 말해요.", subject: "korean", skillTag: "opinion" },
    { title: "영어로 묘사하기", objective: "사람과 사물의 특징을 쉬운 영어 문장으로 묘사해요.", subject: "english", skillTag: "english-grade-3" },
  ],
  "elementary-4": [
    { title: "큰 수 연산", objective: "큰 수의 곱셈과 나눗셈 원리를 이해해요.", subject: "math", skillTag: "multiplication-division" },
    { title: "분수와 소수", objective: "분수와 소수의 크기를 비교하고 관계를 찾아요.", subject: "math", skillTag: "fraction-decimal" },
    { title: "요약하기", objective: "글의 구조를 살펴 중요한 내용을 간추려요.", subject: "korean", skillTag: "summary" },
    { title: "이야기 관점", objective: "인물과 사건을 여러 관점에서 살펴봐요.", subject: "korean", skillTag: "viewpoint" },
    { title: "영어 위치와 안내", objective: "위치와 이동을 나타내는 영어 표현을 이해하고 사용해요.", subject: "english", skillTag: "english-grade-4" },
  ],
  "elementary-5": [
    { title: "분수의 연산", objective: "분모를 맞추어 분수의 덧셈과 뺄셈을 해요.", subject: "math", skillTag: "fraction-operation" },
    { title: "도형과 측정", objective: "도형의 넓이와 둘레를 구하는 원리를 설명해요.", subject: "math", skillTag: "area" },
    { title: "근거 판단", objective: "주장과 근거가 알맞게 연결되는지 판단해요.", subject: "korean", skillTag: "evidence" },
    { title: "설명하는 글", objective: "자료를 활용해 대상의 특징을 설명해요.", subject: "korean", skillTag: "explanation" },
    { title: "영어 경험 이야기", objective: "과거의 경험을 나타내는 짧은 영어 문장을 이해해요.", subject: "english", skillTag: "english-grade-5" },
  ],
  "elementary-6": [
    { title: "비와 비율", objective: "두 양의 관계를 비와 비율로 나타내요.", subject: "math", skillTag: "ratio" },
    { title: "자료와 가능성", objective: "자료를 해석하고 일이 일어날 가능성을 비교해요.", subject: "math", skillTag: "data-probability" },
    { title: "매체 읽기", objective: "매체 자료의 표현 방법과 믿을 만한 근거를 살펴요.", subject: "korean", skillTag: "media-literacy" },
    { title: "논리적으로 쓰기", objective: "주장과 근거가 드러나는 글을 써요.", subject: "korean", skillTag: "argument-writing" },
    { title: "영어 의견과 이유", objective: "친숙한 주제에 대한 의견과 간단한 이유를 영어로 연결해요.", subject: "english", skillTag: "english-grade-6" },
  ],
  "middle-1": [
    { title: "소인수와 정수", objective: "소인수분해와 정수·유리수의 계산 원리를 문제에 적용해요.", subject: "math", skillTag: "middle-1-number" },
    { title: "문자와 일차방정식", objective: "문자식을 해석하고 일차방정식의 해를 구해 검산해요.", subject: "math", skillTag: "middle-1-equation" },
    { title: "친숙한 영어 정보", objective: "학교생활과 일상에 관한 영어 문장에서 세부 정보를 찾아요.", subject: "english", skillTag: "middle-1-english-reception" },
    { title: "영어 자기 표현", objective: "자신과 주변의 사람·사물·감정을 쉬운 영어 문장으로 표현해요.", subject: "english", skillTag: "middle-1-english-production" },
  ],
  "middle-2": [
    { title: "유리수와 식의 계산", objective: "유한소수와 순환소수를 구분하고 식의 계산 원리를 적용해요.", subject: "math", skillTag: "middle-2-rational" },
    { title: "연립방정식과 일차함수", objective: "두 양의 관계를 식과 그래프로 연결해 문제를 해결해요.", subject: "math", skillTag: "middle-2-function" },
    { title: "영어 순서와 인과", objective: "친숙한 영어 글에서 사건의 순서와 원인·결과를 파악해요.", subject: "english", skillTag: "middle-2-english-logic" },
    { title: "영어로 상호 작용", objective: "상황에 맞는 질문과 응답으로 대화를 자연스럽게 이어가요.", subject: "english", skillTag: "middle-2-english-interaction" },
  ],
  "middle-3": [
    { title: "제곱근과 실수", objective: "제곱근과 무리수의 뜻을 이해하고 실수의 크기를 비교해요.", subject: "math", skillTag: "middle-3-real" },
    { title: "인수분해와 이차방정식", objective: "곱셈 공식과 인수분해를 연결해 이차방정식을 해결해요.", subject: "math", skillTag: "middle-3-quadratic" },
    { title: "영어 중심 내용과 추론", objective: "영어 글의 주제·요지와 문맥 속 의미를 근거로 추론해요.", subject: "english", skillTag: "middle-3-english-inference" },
    { title: "영어 의견과 근거", objective: "친숙한 사회 주제에 관해 의견과 근거를 영어로 연결해요.", subject: "english", skillTag: "middle-3-english-opinion" },
  ],
};

type QuestionSeed = [prompt: string, choices: [string, string, string], answer: string, hint: string];
type ReviewedQuestionSeed = [...QuestionSeed, misconceptionTag: MisconceptionTag];

function makeQuestions(key: string, seeds: QuestionSeed[]): PracticeQuestion[] {
  return seeds.map(([prompt, choices, answer, hint], index) => ({ id: `${key}-${index + 1}`, prompt, choices, answer, hint }));
}

function makeReviewedMiddleQuestions(
  key: string,
  curriculumReference: string,
  seeds: ReviewedQuestionSeed[],
): PracticeQuestion[] {
  return seeds.map(([prompt, choices, answer, hint, misconceptionTag], index) => ({
    id: `${key}-${index + 1}`,
    prompt,
    choices,
    answer,
    hint,
    misconceptionTag,
    review: {
      status: "pending-teacher-review",
      curriculumReference,
    },
  }));
}

const QUESTION_BANKS: Record<string, PracticeQuestion[]> = {
  counting: makeQuestions("counting", [
    ["토끼가 3마리 있어요. 모두 몇 마리일까요?", ["2마리", "3마리", "4마리"], "3마리", "토끼를 하나씩 손가락으로 짚어 봐요."],
    ["별을 하나씩 세면 1, 2, 3 다음은?", ["2", "4", "5"], "4", "3 다음 수를 말해 봐요."],
    ["사과 5개를 빠뜨리지 않고 세는 방법은?", ["하나씩 짚기", "눈 감기", "한꺼번에 말하기"], "하나씩 짚기", "사과와 숫자를 하나씩 짝지어요."],
  ]),
  "shape-position": makeQuestions("shape-position", [
    ["공처럼 둥근 모양은?", ["동그라미", "세모", "네모"], "동그라미", "굴러가는 공 모양을 떠올려요."],
    ["의자 앞에 공이 있어요. 공의 위치는?", ["앞", "뒤", "안"], "앞", "의자를 보고 공이 어느 쪽인지 살펴봐요."],
    ["뾰족한 꼭짓점이 3개인 모양은?", ["세모", "동그라미", "네모"], "세모", "뾰족한 곳을 하나씩 세어 봐요."],
  ]),
  "oral-language": makeQuestions("oral-language", [
    ["친구가 웃고 있어요. 어떤 마음일까요?", ["기뻐요", "무거워요", "어두워요"], "기뻐요", "친구의 얼굴을 떠올려요."],
    ["고양이가 공을 굴리는 그림을 보고 알맞게 말하면?", ["고양이가 공을 굴려요", "공이 고양이를 먹어요", "고양이가 잠만 자요"], "고양이가 공을 굴려요", "누가 무엇을 하는지 말해 봐요."],
    ["친구에게 장난감을 빌리고 싶을 때 알맞은 말은?", ["빌려줄래?", "저리 가", "몰라"], "빌려줄래?", "친구가 알아듣기 좋은 말을 골라요."],
  ]),
  "story-order": makeQuestions("story-order", [
    ["손을 씻을 때 가장 먼저 할 일은?", ["물을 틀어요", "수건으로 닦아요", "밖으로 나가요"], "물을 틀어요", "손 씻기의 시작을 떠올려요."],
    ["‘먼저 씨를 심고, 물을 주고, 꽃이 피었어요.’ 가운데 일은?", ["물을 줘요", "씨를 심어요", "꽃이 피어요"], "물을 줘요", "처음과 끝 사이의 일을 찾아요."],
    ["이야기의 마지막에 어울리는 말은?", ["처음에", "그러고 나서", "마침내"], "마침내", "이야기가 끝날 때 쓰는 말을 찾아요."],
  ]),
  "number-composition-5": makeQuestions("number-composition-5", [
    ["2와 몇을 모으면 5가 될까요?", ["2", "3", "4"], "3", "2에서 5까지 더 세어 봐요."],
    ["사과 5개를 4개와 몇 개로 가를까요?", ["1개", "2개", "3개"], "1개", "4 다음에 하나를 더하면 5예요."],
    ["5가 되는 두 수는?", ["2와 3", "1과 2", "3과 3"], "2와 3", "두 수를 손가락으로 모아 봐요."],
  ]),
  "number-composition-10": makeQuestions("number-composition-10", [
    ["7과 몇을 모으면 10이 될까요?", ["2", "3", "4"], "3", "7에서 10까지 세어 봐요."],
    ["10을 6과 몇으로 가를까요?", ["3", "4", "5"], "4", "6에 4를 더하면 10이에요."],
    ["10이 되는 두 수는?", ["8과 2", "7과 2", "6과 3"], "8과 2", "두 수를 모아 10인지 확인해요."],
  ]),
  pattern: makeQuestions("pattern", [
    ["동그라미, 세모, 동그라미 다음 모양은?", ["세모", "네모", "동그라미"], "세모", "두 모양이 번갈아 나와요."],
    ["빨강, 빨강, 파랑이 반복돼요. 다음은?", ["빨강", "파랑", "노랑"], "빨강", "세 칸짜리 묶음을 다시 시작해요."],
    ["박수, 발구르기, 박수 다음 동작은?", ["발구르기", "점프", "앉기"], "발구르기", "두 동작이 번갈아 나와요."],
  ]),
  "sound-awareness": makeQuestions("sound-awareness", [
    ["‘나비’와 같은 첫소리가 나는 말은?", ["나무", "구름", "토끼"], "나무", "‘나’ 소리로 시작하는 말을 찾아요."],
    ["‘모자’의 첫소리는?", ["모", "자", "바"], "모", "낱말의 맨 앞 소리를 들어 봐요."],
    ["‘사과’와 ‘사자’에서 같은 소리는?", ["사", "과", "자"], "사", "두 낱말의 앞부분을 천천히 말해요."],
  ]),
  prediction: makeQuestions("prediction", [
    ["먹구름이 가득하고 우산을 폈어요. 다음에 일어날 일은?", ["비가 와요", "눈사람을 만들어요", "해가 아주 밝아요"], "비가 와요", "먹구름과 우산을 함께 살펴봐요."],
    ["빈 그릇을 들고 강아지가 밥그릇으로 가요. 다음에는?", ["밥을 먹어요", "하늘을 날아요", "책을 읽어요"], "밥을 먹어요", "강아지가 어디로 가는지 봐요."],
    ["새싹에 물을 주었어요. 시간이 지나면?", ["더 자라요", "돌이 돼요", "사라져요"], "더 자라요", "새싹이 자라는 모습을 떠올려요."],
  ]),
  measurement: makeQuestions("measurement", [
    ["연필과 지우개 중 보통 더 긴 것은?", ["연필", "지우개", "같아요"], "연필", "두 물건의 끝을 맞춰 비교해요."],
    ["빈 컵과 물이 가득 든 컵 중 더 무거운 것은?", ["물이 든 컵", "빈 컵", "항상 같아요"], "물이 든 컵", "물이 더해지면 무게가 늘어요."],
    ["큰 물병과 작은 컵 중 물이 더 많이 들어가는 것은?", ["큰 물병", "작은 컵", "똑같아요"], "큰 물병", "그릇 안쪽의 크기를 비교해요."],
  ]),
  sentence: makeQuestions("sentence", [
    ["‘민지가 달려요.’에서 달리는 사람은?", ["민지", "달리기", "운동장"], "민지", "누가 했는지 찾아요."],
    ["‘강아지가 물을 마셔요.’에서 한 일은?", ["물을 마셔요", "강아지예요", "잠을 자요"], "물을 마셔요", "무엇을 했는지 말해 봐요."],
    ["그림을 보고 문장으로 알맞게 말한 것은?", ["아이가 책을 읽어요", "책 아이", "읽어요 아이가 책"], "아이가 책을 읽어요", "누가 무엇을 하는지 차례로 말해요."],
  ]),
  "story-making": makeQuestions("story-making", [
    ["이야기를 만들 때 먼저 정하면 좋은 것은?", ["등장인물", "종이 크기", "글자 색"], "등장인물", "이야기에 누가 나오는지 정해요."],
    ["토끼가 열쇠를 찾았어요. 다음 사건으로 알맞은 것은?", ["잠긴 문을 열어요", "갑자기 이야기가 끝나요", "토끼가 돌이 돼요"], "잠긴 문을 열어요", "앞 사건과 이어지는 일을 골라요."],
    ["이야기의 끝에 어울리는 장면은?", ["친구들이 집으로 돌아가요", "새 인물이 처음 나타나요", "문제가 다시 시작돼요"], "친구들이 집으로 돌아가요", "사건이 마무리되는 장면을 찾아요."],
  ]),
  "place-value-100": makeQuestions("place-value-100", [
    ["46에서 4가 나타내는 값은?", ["4", "40", "400"], "40", "4는 십의 자리에 있어요."],
    ["39와 42 중 더 큰 수는?", ["39", "42", "같아요"], "42", "십의 자리부터 비교해요."],
    ["68 다음 수는?", ["67", "69", "70"], "69", "68에서 하나 더 세어요."],
  ]),
  "place-value-1000": makeQuestions("place-value-1000", [
    ["352에서 5가 나타내는 값은?", ["5", "50", "500"], "50", "5는 십의 자리에 있어요."],
    ["407과 470 중 더 큰 수는?", ["407", "470", "같아요"], "470", "백의 자리 다음 십의 자리를 비교해요."],
    ["600 + 30 + 2로 나타내는 수는?", ["632", "623", "362"], "632", "백·십·일의 자리를 차례로 놓아요."],
  ]),
  "make-ten": makeQuestions("make-ten", [
    ["8에 몇을 더하면 10일까요?", ["1", "2", "3"], "2", "8 다음을 두 번 세어 봐요."],
    ["8 + 7은 얼마일까요?", ["14", "15", "16"], "15", "7에서 2를 떼어 8과 10을 만들어요."],
    ["9 + 6을 10을 이용해 계산하면?", ["15", "14", "16"], "15", "6에서 1을 떼어 9와 10을 만들어요."],
  ]),
  "sentence-reading": makeQuestions("sentence-reading", [
    ["문장이 끝났음을 알리는 표시는?", ["마침표", "쉼표", "따옴표"], "마침표", "문장 맨 끝의 작은 점을 찾아요."],
    ["‘정말 멋지다!’는 어떻게 읽으면 좋을까요?", ["감탄하는 목소리", "아주 작게 끊어서", "뜻 없이 빠르게"], "감탄하는 목소리", "느낌표가 나타내는 느낌을 살려요."],
    ["‘고양이가 의자 아래에 있다.’에서 고양이의 위치는?", ["의자 아래", "의자 위", "문 밖"], "의자 아래", "문장을 끝까지 읽고 위치를 찾아요."],
  ]),
  "experience-writing": makeQuestions("experience-writing", [
    ["겪은 일을 차례대로 쓸 때 먼저 쓸 말은?", ["먼저", "하지만", "그래서"], "먼저", "이야기의 시작을 알리는 말을 골라요."],
    ["운동회 글에 들어갈 실제 경험은?", ["친구와 달리기를 했어요", "용이 하늘에서 내려왔어요", "달이 말을 했어요"], "친구와 달리기를 했어요", "직접 겪은 일을 골라요."],
    ["겪은 일 글의 끝에 쓰기 좋은 것은?", ["느낀 점", "새로운 시작만", "상관없는 낱말"], "느낀 점", "그 일을 겪고 어떤 마음이었는지 써요."],
  ]),
  "carrying-addition": makeQuestions("carrying-addition", [
    ["28 + 7은?", ["34", "35", "36"], "35", "28에 2를 더해 30을 먼저 만들어요."],
    ["46 + 38은?", ["74", "84", "94"], "84", "일의 자리 6과 8을 먼저 더해요."],
    ["57 + 26에서 일의 자리 계산은?", ["7 + 6", "5 + 2", "50 + 20"], "7 + 6", "같은 자리끼리 더해요."],
  ]),
  "main-idea": makeQuestions("main-idea", [
    ["‘민수는 매일 화분에 물을 줍니다. 햇빛도 잘 받게 합니다.’의 중요 내용은?", ["민수가 화분을 돌봐요", "민수가 잠을 자요", "화분이 없어졌어요"], "민수가 화분을 돌봐요", "두 문장에 공통으로 이어지는 내용을 찾아요."],
    ["중요한 내용을 찾을 때 도움이 되는 것은?", ["반복되는 낱말", "종이 크기", "글자색 하나"], "반복되는 낱말", "여러 번 나오는 말을 살펴봐요."],
    ["글의 제목으로 가장 알맞은 것은? ‘비가 와서 우산을 쓰고 학교에 갔습니다.’", ["비 오는 등굣길", "맛있는 점심", "즐거운 운동회"], "비 오는 등굣길", "글 전체를 가장 잘 나타내는 제목을 골라요."],
  ]),
  "character-feeling": makeQuestions("character-feeling", [
    ["선물을 받은 인물이 활짝 웃었어요. 마음은?", ["기뻐요", "화나요", "무서워요"], "기뻐요", "표정과 행동을 함께 봐요."],
    ["인물의 마음을 짐작할 때 살펴볼 것은?", ["말과 행동", "책 두께", "글자 수"], "말과 행동", "인물이 무엇을 말하고 했는지 찾아요."],
    ["친구의 우산을 함께 쓴 인물의 마음으로 알맞은 것은?", ["도와주고 싶어요", "혼자 숨고 싶어요", "친구가 싫어요"], "도와주고 싶어요", "인물이 한 행동의 까닭을 생각해요."],
  ]),
  multiplication: makeQuestions("multiplication", [
    ["4개씩 3묶음은 모두 몇 개일까요?", ["7", "12", "14"], "12", "4를 세 번 더해요."],
    ["3 × 5와 같은 덧셈식은?", ["5 + 5 + 5", "3 + 5", "3 + 3"], "5 + 5 + 5", "5개씩 3묶음을 떠올려요."],
    ["6 × 7은?", ["36", "42", "48"], "42", "6단 또는 7단을 떠올려요."],
  ]),
  division: makeQuestions("division", [
    ["24개를 6명에게 똑같이 나누면?", ["3개", "4개", "6개"], "4개", "24 안에 6이 몇 번 들어가는지 찾아요."],
    ["20개를 5개씩 묶으면 몇 묶음일까요?", ["4묶음", "5묶음", "10묶음"], "4묶음", "5개 묶음을 하나씩 만들어 봐요."],
    ["18 ÷ 3은?", ["5", "6", "7"], "6", "3 × 6이 18인지 확인해요."],
  ]),
  paragraph: makeQuestions("paragraph", [
    ["문단에서 가장 중요한 생각을 담은 문장은?", ["중심 문장", "인사말", "감탄사"], "중심 문장", "문단 전체 내용을 대표하는 문장을 찾아요."],
    ["중심 문장을 자세히 설명하는 문장은?", ["뒷받침 문장", "제목", "끝인사"], "뒷받침 문장", "예나 까닭을 덧붙이는 문장을 찾아요."],
    ["‘우리 동네 공원은 좋습니다.’를 뒷받침하는 문장은?", ["나무와 쉼터가 많습니다", "공원이라는 글자는 세 글자입니다", "저는 연필이 있습니다"], "나무와 쉼터가 많습니다", "공원이 좋은 까닭을 고르세요."],
  ]),
  opinion: makeQuestions("opinion", [
    ["의견을 더 믿을 만하게 만드는 것은?", ["알맞은 까닭", "큰 목소리", "긴 제목"], "알맞은 까닭", "왜 그렇게 생각하는지 설명해요."],
    ["의견인 문장은?", ["운동 시간을 늘리면 좋겠습니다", "운동장은 학교 뒤에 있습니다", "오늘은 월요일입니다"], "운동 시간을 늘리면 좋겠습니다", "생각이나 바람이 드러난 문장을 찾아요."],
    ["‘도서관을 조용히 이용하자’의 알맞은 까닭은?", ["다른 사람이 책을 읽고 있어요", "책 표지가 파란색이에요", "의자가 네 개예요"], "다른 사람이 책을 읽고 있어요", "의견과 바로 이어지는 까닭을 골라요."],
  ]),
  "multiplication-division": makeQuestions("multiplication-division", [
    ["32 × 3은?", ["86", "96", "106"], "96", "30 × 3과 2 × 3을 더해요."],
    ["96 ÷ 3은?", ["22", "32", "42"], "32", "3 × 32가 96인지 확인해요."],
    ["420 ÷ 6은?", ["60", "70", "80"], "70", "42 ÷ 6에 0을 붙여 생각해요."],
  ]),
  "fraction-decimal": makeQuestions("fraction-decimal", [
    ["1/2과 같은 소수는?", ["0.2", "0.5", "1.2"], "0.5", "전체의 절반을 소수로 나타내요."],
    ["0.7과 3/4 중 더 큰 것은?", ["0.7", "3/4", "같아요"], "3/4", "3/4을 0.75로 바꾸어 비교해요."],
    ["0.25와 같은 분수는?", ["1/4", "1/2", "3/4"], "1/4", "0.25는 전체를 네 등분한 한 부분이에요."],
  ]),
  summary: makeQuestions("summary", [
    ["긴 글을 요약할 때 남겨야 하는 것은?", ["핵심 내용", "모든 예시", "꾸밈말 전부"], "핵심 내용", "글 전체를 이해하는 데 꼭 필요한 내용을 찾아요."],
    ["요약에서 줄여도 되는 것은?", ["반복되는 세부 예", "중심 생각", "중요한 결과"], "반복되는 세부 예", "같은 뜻의 예가 여러 번 나오는지 봐요."],
    ["문단별 중심 내용을 모은 뒤 할 일은?", ["짧게 연결하기", "그대로 모두 베끼기", "상관없는 생각 넣기"], "짧게 연결하기", "중심 내용끼리 자연스럽게 이어요."],
  ]),
  viewpoint: makeQuestions("viewpoint", [
    ["같은 사건도 인물마다 다르게 볼 수 있는 까닭은?", ["경험과 생각이 달라서", "글자 수가 달라서", "종이 색이 달라서"], "경험과 생각이 달라서", "인물이 알고 느낀 것을 비교해요."],
    ["비를 반기는 농부와 싫어하는 나들이객의 다른 점은?", ["바라보는 관점", "사는 나라", "이름의 길이"], "바라보는 관점", "비가 각 인물에게 어떤 영향을 주는지 봐요."],
    ["인물의 관점을 확인할 단서는?", ["말과 행동", "쪽수", "글자 크기"], "말과 행동", "인물이 한 말과 선택을 찾아요."],
  ]),
  "fraction-operation": makeQuestions("fraction-operation", [
    ["1/2 + 1/4은?", ["2/6", "3/4", "1/8"], "3/4", "1/2을 2/4로 바꿔요."],
    ["5/6 - 1/3은?", ["1/2", "2/3", "4/3"], "1/2", "1/3을 2/6으로 바꾸어 빼요."],
    ["분모가 다른 분수를 더할 때 먼저 할 일은?", ["분모를 같게 하기", "분자를 곱하기", "소수점을 없애기"], "분모를 같게 하기", "같은 크기의 조각으로 바꾸어요."],
  ]),
  area: makeQuestions("area", [
    ["가로 5cm, 세로 3cm인 직사각형의 넓이는?", ["8㎠", "15㎠", "16㎠"], "15㎠", "가로와 세로를 곱해요."],
    ["한 변이 4cm인 정사각형의 둘레는?", ["8cm", "12cm", "16cm"], "16cm", "같은 길이의 네 변을 더해요."],
    ["직사각형 넓이를 구하는 식은?", ["가로 × 세로", "가로 + 세로", "가로 ÷ 세로"], "가로 × 세로", "1㎠ 칸이 몇 개인지 생각해요."],
  ]),
  evidence: makeQuestions("evidence", [
    ["주장을 뒷받침하기에 가장 알맞은 것은?", ["확인한 자료", "기분", "소문"], "확인한 자료", "믿을 수 있는 근거를 골라요."],
    ["‘아침 운동은 집중에 도움을 준다’의 근거로 알맞은 것은?", ["학생 관찰 결과", "운동복 색", "교실 창문 수"], "학생 관찰 결과", "주장과 직접 관련된 자료를 찾아요."],
    ["근거가 믿을 만한지 확인할 것은?", ["출처", "글자색", "문장 길이"], "출처", "누가 언제 만든 자료인지 살펴요."],
  ]),
  explanation: makeQuestions("explanation", [
    ["대상의 특징을 설명할 때 필요한 것은?", ["알맞은 자료", "느낌만", "상관없는 이야기"], "알맞은 자료", "설명할 대상과 관련된 정보를 골라요."],
    ["만드는 방법을 설명할 때 알맞은 순서는?", ["준비물-과정-완성", "완성-상상-준비물", "느낌-제목-끝"], "준비물-과정-완성", "따라 하기 쉬운 차례를 생각해요."],
    ["사진을 설명 글에 넣는 까닭은?", ["모습을 쉽게 이해하도록", "글을 무조건 길게 하려고", "빈칸만 채우려고"], "모습을 쉽게 이해하도록", "사진이 어떤 정보를 보여 주는지 생각해요."],
  ]),
  ratio: makeQuestions("ratio", [
    ["빨간 구슬 2개와 파란 구슬 3개의 비는?", ["2:3", "3:2", "5:3"], "2:3", "말한 순서대로 두 수를 써요."],
    ["4:6과 같은 비는?", ["2:3", "3:4", "4:3"], "2:3", "두 수를 모두 2로 나누어요."],
    ["전체 20명 중 5명의 비율은?", ["25%", "20%", "50%"], "25%", "5/20을 1/4로 줄여요."],
  ]),
  "data-probability": makeQuestions("data-probability", [
    ["표에서 사과 8표, 배 5표라면 더 많이 고른 과일은?", ["사과", "배", "같아요"], "사과", "표의 수를 비교해요."],
    ["주사위를 굴려 1부터 6 중 하나가 나오는 일은?", ["확실해요", "불가능해요", "절대 알 수 없어요"], "확실해요", "주사위 면에 어떤 수가 있는지 봐요."],
    ["빨간 공 9개와 파란 공 1개 중 하나를 뽑을 때 가능성이 큰 것은?", ["빨간 공", "파란 공", "항상 같아요"], "빨간 공", "더 많이 들어 있는 색을 찾아요."],
  ]),
  "media-literacy": makeQuestions("media-literacy", [
    ["자료가 믿을 만한지 판단할 때 확인할 것은?", ["출처", "글자색", "사진 크기"], "출처", "누가 어디에서 만든 자료인지 살펴요."],
    ["광고가 물건의 좋은 점만 크게 보여 주는 까닭은?", ["사고 싶게 하려고", "날씨를 알려 주려고", "역사를 기록하려고"], "사고 싶게 하려고", "자료를 만든 목적을 생각해요."],
    ["사실과 의견을 구분할 때 확인할 것은?", ["확인 가능한 내용인지", "글씨가 큰지", "사진이 많은지"], "확인 가능한 내용인지", "자료로 참인지 확인할 수 있는지 봐요."],
  ]),
  "argument-writing": makeQuestions("argument-writing", [
    ["주장하는 글에 꼭 필요한 것은?", ["주장과 근거", "인사말만", "그림만"], "주장과 근거", "생각과 그 까닭이 함께 있어야 해요."],
    ["‘학교에 나무를 더 심자’의 근거로 알맞은 것은?", ["그늘과 깨끗한 공기를 줘요", "나무라는 말은 두 글자예요", "운동장은 네모예요"], "그늘과 깨끗한 공기를 줘요", "주장을 실제로 뒷받침하는 까닭을 골라요."],
    ["글의 마지막에 하면 좋은 것은?", ["주장을 다시 강조하기", "새 주제로 바꾸기", "근거를 모두 지우기"], "주장을 다시 강조하기", "독자가 핵심 생각을 기억하게 해요."],
  ]),
  "english-grade-1": makeQuestions("english-grade-1", [
    ["‘Hello, I am Mina.’의 뜻은?", ["안녕, 나는 미나야.", "미나는 학교에 가.", "잘 자, 미나야."], "안녕, 나는 미나야.", "Hello는 인사, I am은 ‘나는 ~야’라는 뜻이에요."],
    ["기분이 좋을 때 알맞은 영어는?", ["I am happy.", "I am a book.", "I am blue."], "I am happy.", "happy는 기쁜 마음을 나타내요."],
    ["처음 만난 친구에게 이름을 물을 때는?", ["What is your name?", "How old is this?", "Where is the book?"], "What is your name?", "your name이 ‘너의 이름’이라는 뜻이에요."],
  ]),
  "english-grade-2": makeQuestions("english-grade-2", [
    ["‘I go to school.’의 뜻은?", ["나는 학교에 가요.", "나는 학교를 먹어요.", "나는 집에서 자요."], "나는 학교에 가요.", "go to는 ‘~에 가다’라는 뜻이에요."],
    ["책을 읽는다는 문장은?", ["I read a book.", "I draw a book.", "I close a book."], "I read a book.", "read는 ‘읽다’라는 뜻이에요."],
    ["‘She plays soccer.’에서 축구를 하는 사람은?", ["그녀", "나", "우리"], "그녀", "She는 여자 한 사람을 가리켜요."],
  ]),
  "english-grade-3": makeQuestions("english-grade-3", [
    ["큰 강아지를 나타내는 문장은?", ["It is a big dog.", "It is a small cat.", "They are books."], "It is a big dog.", "big은 크다는 뜻이고 dog는 강아지예요."],
    ["‘He has short hair.’의 뜻은?", ["그는 짧은 머리예요.", "그는 긴 꼬리가 있어요.", "그는 빨리 달려요."], "그는 짧은 머리예요.", "short hair는 짧은 머리라는 뜻이에요."],
    ["사과가 세 개 있다는 문장은?", ["There are three apples.", "There is one apple.", "I like three."], "There are three apples.", "여러 개가 있을 때 There are를 사용해요."],
  ]),
  "english-grade-4": makeQuestions("english-grade-4", [
    ["‘The bank is next to the park.’의 뜻은?", ["은행은 공원 옆에 있어요.", "공원은 은행 안에 있어요.", "은행은 멀리 있어요."], "은행은 공원 옆에 있어요.", "next to는 바로 옆이라는 뜻이에요."],
    ["왼쪽으로 도세요에 알맞은 영어는?", ["Turn left.", "Go back.", "Sit down."], "Turn left.", "turn은 돌다, left는 왼쪽이에요."],
    ["도서관 위치를 물을 때는?", ["Where is the library?", "Who is the library?", "When is the library?"], "Where is the library?", "장소는 Where로 물어요."],
  ]),
  "english-grade-5": makeQuestions("english-grade-5", [
    ["어제 축구를 했다는 문장은?", ["I played soccer yesterday.", "I play soccer tomorrow.", "I am soccer."], "I played soccer yesterday.", "yesterday와 과거형 played가 함께 쓰였어요."],
    ["‘We visited Jeju last week.’의 뜻은?", ["우리는 지난주 제주를 방문했어요.", "우리는 다음 주 제주에 갈 거예요.", "제주는 매주 비가 왔어요."], "우리는 지난주 제주를 방문했어요.", "visited는 visit의 과거형이고 last week는 지난주예요."],
    ["과거 경험을 묻는 문장은?", ["What did you do?", "What do you eat now?", "Where are you tomorrow?"], "What did you do?", "did와 동사원형을 사용해 지난 일을 물어요."],
  ]),
  "english-grade-6": makeQuestions("english-grade-6", [
    ["‘I think biking is useful because it is healthy.’에서 이유는?", ["건강하기 때문에", "자전거가 파랗기 때문에", "학교가 가깝기 때문에"], "건강하기 때문에", "because 뒤에 이유가 나와요."],
    ["의견을 부드럽게 시작하는 표현은?", ["I think...", "You are wrong.", "Never ask me."], "I think...", "I think는 ‘나는 ~라고 생각해’라는 표현이에요."],
    ["환경을 위해 물병을 다시 쓰자는 의견은?", ["We should reuse bottles.", "We should throw all bottles away.", "Bottles cannot hold water."], "We should reuse bottles.", "should는 ‘~해야 한다’, reuse는 ‘다시 사용하다’예요."],
  ]),
  "middle-1-number": makeReviewedMiddleQuestions("middle-1-number", "2022 개정 수학과 교육과정 · 수와 연산", [
    ["60을 소인수분해한 것은?", ["2² × 3 × 5", "2 × 3 × 10", "4 × 15"], "2² × 3 × 5", "60을 소수로만 나누면 2 × 2 × 3 × 5가 됩니다.", "m1-number-factorization"],
    ["(-4) + 7의 값은?", ["-11", "3", "11"], "3", "수직선에서 -4에서 오른쪽으로 7칸 이동하세요.", "m1-number-sign"],
    ["|-9|의 값은?", ["-9", "0", "9"], "9", "절댓값은 수직선에서 0까지의 거리라서 항상 0 이상입니다.", "m1-number-sign"],
    ["18과 24의 최대공약수는?", ["3", "6", "12"], "6", "18=2×3², 24=2³×3에서 공통인 2×3을 찾습니다.", "m1-number-factorization"],
    ["(-3) × (-5)의 값은?", ["-15", "8", "15"], "15", "음수 두 개를 곱하면 양수가 됩니다.", "m1-number-sign"],
    ["-2 - 6의 값은?", ["-8", "-4", "4"], "-8", "-2에서 왼쪽으로 6칸 이동하세요.", "m1-number-sign"],
  ]),
  "middle-1-equation": makeReviewedMiddleQuestions("middle-1-equation", "2022 개정 수학과 교육과정 · 변화와 관계", [
    ["3x + 2 = 14일 때 x는?", ["3", "4", "5"], "4", "양변에서 2를 빼면 3x=12이고, 3으로 나누면 x=4입니다.", "m1-equation-balance"],
    ["a=3일 때 2a-1의 값은?", ["4", "5", "6"], "5", "a 자리에 3을 넣으면 2×3-1=5입니다.", "m1-equation-substitution"],
    ["x/4 = 3의 해는?", ["7", "12", "16"], "12", "양변에 4를 곱하면 x=12입니다.", "m1-equation-balance"],
    ["5x-7=18일 때 x는?", ["3", "5", "7"], "5", "양변에 7을 더한 뒤 5로 나누세요.", "m1-equation-balance"],
    ["b=-2일 때 b²+3의 값은?", ["-1", "1", "7"], "7", "(-2)²은 4이고 여기에 3을 더합니다.", "m1-equation-substitution"],
    ["2(x+3)=14일 때 x는?", ["4", "7", "10"], "4", "양변을 2로 나누면 x+3=7입니다.", "m1-equation-balance"],
  ]),
  "middle-1-english-reception": makeReviewedMiddleQuestions("middle-1-english-reception", "2022 개정 영어과 교육과정 · 이해", [
    ["‘The club meets at 4 p.m. in Room 2.’에서 모이는 시간은?", ["오후 2시", "오후 4시", "오후 6시"], "오후 4시", "at 4 p.m.가 시간을 나타냅니다.", "m1-english-detail"],
    ["‘Jin takes the bus because it is raining.’에서 버스를 타는 이유는?", ["비가 와서", "버스를 좋아해서", "늦잠을 자서"], "비가 와서", "because 뒤가 이유이고 it is raining은 비가 온다는 뜻입니다.", "m1-english-cause"],
    ["‘Please bring your notebook and a pencil.’에서 필요한 것은?", ["공책과 연필", "책과 가방", "자와 지우개"], "공책과 연필", "bring 뒤에 준비물이 나열되어 있습니다.", "m1-english-detail"],
    ["‘The library closes at 6 p.m. on Fridays.’에서 도서관이 오후 6시에 닫는 요일은?", ["월요일", "수요일", "금요일"], "금요일", "on Fridays가 요일 정보를 알려 줍니다.", "m1-english-detail"],
    ["‘Sora walked home because she missed the bus.’에서 걸어간 이유는?", ["버스를 놓쳐서", "운동을 좋아해서", "비가 와서"], "버스를 놓쳐서", "because 뒤의 she missed the bus를 확인하세요.", "m1-english-cause"],
    ["‘Students must return the books by Monday.’에서 반납 기한은?", ["월요일까지", "금요일까지", "오늘 밤까지"], "월요일까지", "by Monday는 월요일까지라는 뜻입니다.", "m1-english-detail"],
  ]),
  "middle-1-english-production": makeReviewedMiddleQuestions("middle-1-english-production", "2022 개정 영어과 교육과정 · 표현", [
    ["친구가 친절하다고 묘사하는 문장은?", ["My friend is kind.", "My friend kind is.", "Kind my friend."], "My friend is kind.", "주어+be동사+형용사 순서로 씁니다.", "m1-english-word-order"],
    ["배가 고프다는 자연스러운 표현은?", ["I feel hungry.", "I hungry feel is.", "Hungry eats me."], "I feel hungry.", "feel 뒤에 감정을 나타내는 형용사를 씁니다.", "m1-english-word-order"],
    ["자신의 취미를 소개하는 문장은?", ["I enjoy drawing.", "I drawing enjoy am.", "Drawing is I."], "I enjoy drawing.", "enjoy 뒤에는 동명사 형태를 사용할 수 있습니다.", "m1-english-verb-form"],
    ["기타 연습 계획을 자연스럽게 말한 문장은?", ["I plan to practice the guitar.", "I planning guitar practice.", "Practice I to guitar."], "I plan to practice the guitar.", "plan to 뒤에는 동사원형을 씁니다.", "m1-english-verb-form"],
    ["책상 위에 책 두 권이 있다고 말한 문장은?", ["There are two books on the desk.", "Two books is desk on.", "There is two books desk."], "There are two books on the desk.", "복수 명사 앞에는 There are를 사용합니다.", "m1-english-word-order"],
    ["버스보다 걷기를 더 좋아한다고 말한 문장은?", ["I prefer walking to taking the bus.", "I prefer walk than bus taking.", "Walking prefer I bus."], "I prefer walking to taking the bus.", "prefer A to B 구조에서 두 활동의 형태를 맞춥니다.", "m1-english-verb-form"],
  ]),
  "middle-2-rational": makeReviewedMiddleQuestions("middle-2-rational", "2022 개정 수학과 교육과정 · 수와 연산/변화와 관계", [
    ["0.125를 분수로 나타낸 것은?", ["1/4", "1/8", "1/10"], "1/8", "0.125=125/1000이고 125로 약분하면 1/8입니다.", "m2-rational-conversion"],
    ["2x² × 3x의 값은?", ["5x³", "6x²", "6x³"], "6x³", "계수는 2×3, 같은 문자 x의 지수는 2+1로 계산합니다.", "m2-rational-exponent"],
    ["1/3을 소수로 나타내면?", ["0.3", "0.333…", "0.13"], "0.333…", "1을 3으로 나누면 3이 계속 반복되는 순환소수입니다.", "m2-rational-conversion"],
    ["0.45를 기약분수로 나타내면?", ["9/20", "4/5", "45/10"], "9/20", "0.45=45/100이고 5로 약분합니다.", "m2-rational-conversion"],
    ["(-2a²b) × (3ab²)의 값은?", ["-6a³b³", "6a²b²", "-5a³b³"], "-6a³b³", "계수의 부호와 각 문자의 지수를 따로 계산하세요.", "m2-rational-exponent"],
    ["0.272727…을 분수로 나타낸 것은?", ["3/11", "27/100", "2/7"], "3/11", "반복되는 두 자리 27을 99로 나눈 뒤 약분합니다.", "m2-rational-conversion"],
  ]),
  "middle-2-function": makeReviewedMiddleQuestions("middle-2-function", "2022 개정 수학과 교육과정 · 변화와 관계", [
    ["y=2x+1에서 x=3일 때 y는?", ["6", "7", "8"], "7", "x에 3을 대입하면 y=2×3+1=7입니다.", "m2-function-substitution"],
    ["x+y=7, x-y=1을 만족하는 x는?", ["3", "4", "5"], "4", "두 식을 더하면 2x=8이므로 x=4입니다.", "m2-function-relation"],
    ["일차함수 y=-3x+2의 기울기는?", ["-3", "2", "3"], "-3", "y=ax+b에서 x의 계수 a가 기울기입니다.", "m2-function-relation"],
    ["y=-x+4에서 x=-2일 때 y는?", ["2", "6", "-6"], "6", "x 자리에 -2를 넣으면 -(-2)+4=6입니다.", "m2-function-substitution"],
    ["2x+y=8, x-y=1을 만족하는 x는?", ["2", "3", "4"], "3", "두 식을 더하면 3x=9입니다.", "m2-function-relation"],
    ["점 (0,-2)와 (2,4)를 지나는 직선의 기울기는?", ["2", "3", "6"], "3", "y의 변화량 6을 x의 변화량 2로 나눕니다.", "m2-function-relation"],
  ]),
  "middle-2-english-logic": makeReviewedMiddleQuestions("middle-2-english-logic", "2022 개정 영어과 교육과정 · 이해", [
    ["‘First, wash the cup. Then, dry it.’에서 두 번째 행동은?", ["컵을 씻기", "컵을 말리기", "컵을 버리기"], "컵을 말리기", "Then 뒤에 두 번째 행동이 나옵니다.", "m2-english-sequence"],
    ["‘The game was canceled because it snowed.’의 원인은?", ["눈이 왔다", "게임이 어려웠다", "선수가 늦었다"], "눈이 왔다", "because 뒤가 원인입니다.", "m2-english-cause-result"],
    ["‘Mina studied hard, so she passed the test.’의 결과는?", ["열심히 공부했다", "시험에 합격했다", "시험을 만들었다"], "시험에 합격했다", "so 뒤에 앞선 일의 결과가 나옵니다.", "m2-english-cause-result"],
    ["‘After he finished dinner, Minho washed the dishes.’에서 먼저 한 일은?", ["저녁 먹기", "설거지하기", "잠자기"], "저녁 먹기", "After가 두 사건의 순서를 연결합니다.", "m2-english-sequence"],
    ["‘The road was icy. As a result, the bus moved slowly.’의 결과는?", ["길이 얼었다", "버스가 천천히 갔다", "눈이 녹았다"], "버스가 천천히 갔다", "As a result 뒤에 결과가 나옵니다.", "m2-english-cause-result"],
    ["‘Before you turn on the machine, read the guide.’에서 먼저 할 일은?", ["안내서 읽기", "기계 켜기", "기계 끄기"], "안내서 읽기", "Before가 먼저 해야 할 일을 알려 줍니다.", "m2-english-sequence"],
  ]),
  "middle-2-english-interaction": makeReviewedMiddleQuestions("middle-2-english-interaction", "2022 개정 영어과 교육과정 · 표현", [
    ["‘Would you like some help?’에 알맞은 응답은?", ["Yes, please.", "I am a help.", "Yesterday."], "Yes, please.", "도움 제안에는 수락이나 거절로 응답합니다.", "m2-english-response"],
    ["잘 듣지 못했을 때 다시 말해 달라는 표현은?", ["Could you say that again?", "You must stop talking.", "I said nothing yesterday."], "Could you say that again?", "Could you는 정중한 요청에 쓰입니다.", "m2-english-polite-expression"],
    ["상대 의견을 물을 때는?", ["What do you think?", "Where do you think?", "Who are think?"], "What do you think?", "생각이나 의견은 What do you think?로 묻습니다.", "m2-english-response"],
    ["‘Would you like to join us?’에 자연스럽게 수락하는 말은?", ["Sure, I'd love to.", "I joined yesterday no.", "Would is join."], "Sure, I'd love to.", "초대에는 참여 의사를 분명하게 답합니다.", "m2-english-response"],
    ["실수로 부딪혔을 때 알맞은 말은?", ["I'm sorry. Are you okay?", "Move away now.", "I was a chair."], "I'm sorry. Are you okay?", "사과한 뒤 상대 상태를 묻는 표현을 고르세요.", "m2-english-polite-expression"],
    ["상대의 뜻을 확인하고 싶을 때 알맞은 표현은?", ["Do you mean we should leave now?", "You mean nothing.", "Leave means where?"], "Do you mean we should leave now?", "Do you mean ...?은 상대의 뜻을 정중하게 확인합니다.", "m2-english-polite-expression"],
  ]),
  "middle-3-real": makeReviewedMiddleQuestions("middle-3-real", "2022 개정 수학과 교육과정 · 수와 연산", [
    ["√49의 값은?", ["6", "7", "14"], "7", "7²=49이므로 49의 양의 제곱근은 7입니다.", "m3-real-radical"],
    ["다음 중 무리수는?", ["0.5", "√2", "3/4"], "√2", "√2는 두 정수의 비로 정확히 나타낼 수 없는 무리수입니다.", "m3-real-number-classification"],
    ["√12를 간단히 하면?", ["2√3", "3√2", "6√2"], "2√3", "12=4×3이므로 √12=√4×√3=2√3입니다.", "m3-real-radical"],
    ["√75를 간단히 하면?", ["5√3", "3√5", "25√3"], "5√3", "75=25×3이므로 √75=5√3입니다.", "m3-real-radical"],
    ["√10은 어느 두 자연수 사이에 있는가?", ["2와 3", "3과 4", "4와 5"], "3과 4", "3²=9, 4²=16과 10을 비교하세요.", "m3-real-radical"],
    ["다음 중 유리수는?", ["√3", "π", "√16"], "√16", "√16=4이므로 정수이자 유리수입니다.", "m3-real-number-classification"],
  ]),
  "middle-3-quadratic": makeReviewedMiddleQuestions("middle-3-quadratic", "2022 개정 수학과 교육과정 · 변화와 관계", [
    ["x²-5x+6을 인수분해하면?", ["(x-2)(x-3)", "(x+2)(x+3)", "(x-1)(x-6)"], "(x-2)(x-3)", "곱이 6이고 합이 -5가 되는 -2와 -3을 찾습니다.", "m3-quadratic-factorization"],
    ["x²=16의 해는?", ["4", "-4", "4와 -4"], "4와 -4", "제곱해서 16이 되는 실수는 4와 -4 두 개입니다.", "m3-quadratic-roots"],
    ["x²+6x+9=0의 해는?", ["-3", "3", "-9"], "-3", "(x+3)²=0이므로 x=-3입니다.", "m3-quadratic-roots"],
    ["x²+x-6을 인수분해하면?", ["(x+3)(x-2)", "(x-3)(x+2)", "(x-6)(x+1)"], "(x+3)(x-2)", "곱이 -6이고 합이 1이 되는 3과 -2를 찾습니다.", "m3-quadratic-factorization"],
    ["x²-9=0의 해는?", ["3", "-3", "3과 -3"], "3과 -3", "(x-3)(x+3)=0으로 인수분해합니다.", "m3-quadratic-roots"],
    ["x²-4x+4=0의 해는?", ["2", "-2", "4"], "2", "(x-2)²=0이므로 중근 x=2입니다.", "m3-quadratic-factorization"],
  ]),
  "middle-3-english-inference": makeReviewedMiddleQuestions("middle-3-english-inference", "2022 개정 영어과 교육과정 · 이해", [
    ["‘The lights were off and nobody answered the door.’에서 추론할 수 있는 것은?", ["집에 아무도 없을 수 있다", "파티 중이다", "문이 열려 있다"], "집에 아무도 없을 수 있다", "불이 꺼지고 응답이 없다는 두 단서를 함께 사용합니다.", "m3-english-inference"],
    ["글에서 여러 번 반복되는 핵심어가 주로 알려 주는 것은?", ["주제나 요지", "글자 수", "필자의 나이"], "주제나 요지", "반복되는 핵심어는 글의 중심 생각을 찾는 단서입니다.", "m3-english-main-idea"],
    ["‘Although it was difficult, she kept trying.’에서 알 수 있는 태도는?", ["끈기", "무관심", "두려움"], "끈기", "어려워도 계속 시도했다는 행동이 끈기를 보여 줍니다.", "m3-english-inference"],
    ["‘Joon entered with a wet umbrella and shook water from his coat.’에서 추론할 수 있는 것은?", ["밖에 비가 왔다", "날씨가 매우 더웠다", "우산을 새로 샀다"], "밖에 비가 왔다", "젖은 우산과 코트의 물기가 날씨를 추론하는 근거입니다.", "m3-english-inference"],
    ["대중교통이 교통 체증과 오염을 줄인다는 예가 반복되는 글의 주제는?", ["대중교통의 장점", "자동차 색의 종류", "버스표 디자인"], "대중교통의 장점", "반복되는 근거가 공통으로 뒷받침하는 중심 생각을 찾습니다.", "m3-english-main-idea"],
    ["‘The first plan failed. Nevertheless, the team tried a new approach.’에서 드러나는 태도는?", ["포기하지 않음", "계획을 숨김", "팀을 떠남"], "포기하지 않음", "Nevertheless는 어려움과 반대되는 다음 행동을 연결합니다.", "m3-english-inference"],
  ]),
  "middle-3-english-opinion": makeReviewedMiddleQuestions("middle-3-english-opinion", "2022 개정 영어과 교육과정 · 표현", [
    ["의견과 근거가 바르게 연결된 문장은?", ["We should walk more because it reduces pollution.", "We should walk more because blue.", "Walking because should."], "We should walk more because it reduces pollution.", "because 뒤에 의견을 뒷받침하는 구체적인 이유가 있습니다.", "m3-english-claim-evidence"],
    ["상대 의견을 존중하며 다른 생각을 말하는 표현은?", ["I see your point, but I think...", "You are completely wrong.", "Stop your idea."], "I see your point, but I think...", "먼저 상대 관점을 인정한 뒤 자신의 생각을 이어 갑니다.", "m3-english-discourse"],
    ["주장을 더 설득력 있게 만드는 것은?", ["관련된 근거와 예시", "같은 말만 반복", "출처 없는 소문"], "관련된 근거와 예시", "주장과 직접 관련된 확인 가능한 근거가 필요합니다.", "m3-english-claim-evidence"],
    ["도서관 운영 시간을 늘리자는 주장에 가장 알맞은 근거는?", ["방과 후 이용 학생 수가 꾸준히 늘었다", "도서관 벽이 파란색이다", "책 제목이 길다"], "방과 후 이용 학생 수가 꾸준히 늘었다", "주장과 직접 관련된 확인 가능한 자료를 고릅니다.", "m3-english-claim-evidence"],
    ["온라인 자료를 근거로 사용할 때 먼저 확인할 것은?", ["작성자와 출처", "배경색", "문장 수"], "작성자와 출처", "근거의 신뢰도는 누가 어디에 발표했는지와 관련됩니다.", "m3-english-claim-evidence"],
    ["의견을 덧붙이며 대화를 이어 가는 표현은?", ["I agree with that point, and I would add...", "Your idea is useless.", "There is no more talk."], "I agree with that point, and I would add...", "상대의 관점을 인정하고 자신의 생각을 연결합니다.", "m3-english-discourse"],
  ]),
};

export function getMiddleSchoolTeacherReviewQueue() {
  return Object.entries(QUESTION_BANKS)
    .filter(([key]) => key.startsWith("middle-"))
    .flatMap(([bankKey, questions]) => questions.map((question) => ({
      bankKey,
      questionId: question.id,
      prompt: question.prompt,
      choices: question.choices,
      answer: question.answer,
      hint: question.hint,
      misconceptionTag: question.misconceptionTag,
      review: question.review,
    })));
}

function questionBankKey(stage: LearningStage, skillTag: string) {
  if (skillTag === "number-composition") return stage.grade >= 7 ? "number-composition-10" : "number-composition-5";
  if (skillTag === "place-value") return stage.grade === 1 ? "place-value-100" : "place-value-1000";
  return skillTag;
}

function questionsFor(stage: LearningStage, skillTag: string) {
  return QUESTION_BANKS[questionBankKey(stage, skillTag)];
}

export function getWeeklyLearningGoals(stage: LearningStage, semester: AcademicSemester = 2): WeeklyLearningGoal[] {
  const key = `${stage.schoolLevel}-${stage.grade}`;
  const seeds = UNIT_SEEDS[key] ?? UNIT_SEEDS["elementary-2"];
  return seeds.flatMap((unit, unitIndex) => PHASES.map((phase, phaseIndex) => {
    const subjectUnitIndex = seeds.slice(0, unitIndex).filter((seed) => seed.subject === unit.subject).length;
    const week = SUBJECT_START_WEEKS[unit.subject] + subjectUnitIndex * PHASES.length + phaseIndex;
    const stageId: WeeklyLearningGoal["stageId"] = unit.subject === "math"
      ? "number-forest"
      : unit.subject === "english"
        ? "word-island"
        : phase.phase === "boss" ? "story-castle" : "word-island";
    return {
      id: `${key}-s${semester}-${unit.subject}-w${week}`,
      ...stage,
      semester,
      week,
      subject: unit.subject,
      stageId,
      unitTitle: unit.title,
      title: `${unit.title} · ${phase.title}`,
      objective: `${unit.objective} ${phase.suffix}`,
      skillTag: unit.skillTag,
      phase: phase.phase,
      questions: questionsFor(stage, unit.skillTag),
    };
  })).sort((a, b) => a.week - b.week || (a.subject === "math" ? -1 : a.subject === "english" ? 1 : 0));
}

function semesterFromGoalId(goalId?: string | null): AcademicSemester | null {
  const match = goalId?.match(/-s([12])-/);
  return match?.[1] === "1" ? 1 : match?.[1] === "2" ? 2 : null;
}

export function findLearningGoal(stage: LearningStage, goalId?: string | null, semester: AcademicSemester = 2) {
  const goals = getWeeklyLearningGoals(stage, semesterFromGoalId(goalId) ?? semester);
  return goals.find((goal) => goal.id === goalId) ?? goals.find((goal) => goal.subject === "math" && goal.week === SUBJECT_START_WEEKS.math) ?? goals[0];
}

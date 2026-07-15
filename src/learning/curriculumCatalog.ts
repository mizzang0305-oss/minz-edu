import type { LearningStage } from "@/types/learning";
import type { AcademicSemester, PracticeQuestion, WeeklyLearningGoal } from "@/types/curriculum";

type UnitSeed = { title: string; objective: string; subject: "math" | "korean"; skillTag: string };

const PHASES = [
  { phase: "discover", title: "새 원리 발견", suffix: "그림과 조작으로 원리를 발견해요." },
  { phase: "practice", title: "기술 훈련", suffix: "대표 문제를 천천히 연습해요." },
  { phase: "apply", title: "모험에 적용", suffix: "생활 장면에서 해결 방법을 골라요." },
  { phase: "boss", title: "수호자 도전", suffix: "설명하며 스스로 해결하는지 확인해요." },
] as const;

export const SUBJECT_START_WEEKS = {
  math: 8,
  korean: 9,
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
  ],
  "elementary-2": [
    { title: "세 자리 수", objective: "세 자리 수의 자릿값과 크기를 비교해요.", subject: "math", skillTag: "place-value" },
    { title: "받아올림 덧셈", objective: "10을 만들어 두 자리 수 덧셈을 해결해요.", subject: "math", skillTag: "carrying-addition" },
    { title: "중요 내용 찾기", objective: "글에서 중요한 낱말과 문장을 찾아요.", subject: "korean", skillTag: "main-idea" },
    { title: "마음 나타내기", objective: "인물의 마음을 짐작하고 까닭을 말해요.", subject: "korean", skillTag: "character-feeling" },
  ],
  "elementary-3": [
    { title: "곱셈", objective: "곱셈의 뜻을 이해하고 곱셈구구를 활용해요.", subject: "math", skillTag: "multiplication" },
    { title: "나눗셈", objective: "똑같이 나누는 상황을 나눗셈으로 나타내요.", subject: "math", skillTag: "division" },
    { title: "중심 문장", objective: "문단의 중심 문장과 뒷받침 문장을 구분해요.", subject: "korean", skillTag: "paragraph" },
    { title: "의견과 까닭", objective: "의견을 정하고 알맞은 까닭을 들어 말해요.", subject: "korean", skillTag: "opinion" },
  ],
  "elementary-4": [
    { title: "큰 수 연산", objective: "큰 수의 곱셈과 나눗셈 원리를 이해해요.", subject: "math", skillTag: "multiplication-division" },
    { title: "분수와 소수", objective: "분수와 소수의 크기를 비교하고 관계를 찾아요.", subject: "math", skillTag: "fraction-decimal" },
    { title: "요약하기", objective: "글의 구조를 살펴 중요한 내용을 간추려요.", subject: "korean", skillTag: "summary" },
    { title: "이야기 관점", objective: "인물과 사건을 여러 관점에서 살펴봐요.", subject: "korean", skillTag: "viewpoint" },
  ],
  "elementary-5": [
    { title: "분수의 연산", objective: "분모를 맞추어 분수의 덧셈과 뺄셈을 해요.", subject: "math", skillTag: "fraction-operation" },
    { title: "도형과 측정", objective: "도형의 넓이와 둘레를 구하는 원리를 설명해요.", subject: "math", skillTag: "area" },
    { title: "근거 판단", objective: "주장과 근거가 알맞게 연결되는지 판단해요.", subject: "korean", skillTag: "evidence" },
    { title: "설명하는 글", objective: "자료를 활용해 대상의 특징을 설명해요.", subject: "korean", skillTag: "explanation" },
  ],
  "elementary-6": [
    { title: "비와 비율", objective: "두 양의 관계를 비와 비율로 나타내요.", subject: "math", skillTag: "ratio" },
    { title: "자료와 가능성", objective: "자료를 해석하고 일이 일어날 가능성을 비교해요.", subject: "math", skillTag: "data-probability" },
    { title: "매체 읽기", objective: "매체 자료의 표현 방법과 믿을 만한 근거를 살펴요.", subject: "korean", skillTag: "media-literacy" },
    { title: "논리적으로 쓰기", objective: "주장과 근거가 드러나는 글을 써요.", subject: "korean", skillTag: "argument-writing" },
  ],
};

type QuestionSeed = [prompt: string, choices: [string, string, string], answer: string, hint: string];

function makeQuestions(key: string, seeds: QuestionSeed[]): PracticeQuestion[] {
  return seeds.map(([prompt, choices, answer, hint], index) => ({ id: `${key}-${index + 1}`, prompt, choices, answer, hint }));
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
};

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
    const stageId: WeeklyLearningGoal["stageId"] = unit.subject === "math" ? "number-forest" : phase.phase === "boss" ? "story-castle" : "word-island";
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
  })).sort((a, b) => a.week - b.week || (a.subject === "math" ? -1 : 1));
}

function semesterFromGoalId(goalId?: string | null): AcademicSemester | null {
  const match = goalId?.match(/-s([12])-/);
  return match?.[1] === "1" ? 1 : match?.[1] === "2" ? 2 : null;
}

export function findLearningGoal(stage: LearningStage, goalId?: string | null, semester: AcademicSemester = 2) {
  const goals = getWeeklyLearningGoals(stage, semesterFromGoalId(goalId) ?? semester);
  return goals.find((goal) => goal.id === goalId) ?? goals.find((goal) => goal.subject === "math" && goal.week === SUBJECT_START_WEEKS.math) ?? goals[0];
}

export const MISCONCEPTION_TAG_LABELS = {
  "m1-number-factorization": "소인수와 약수 구조",
  "m1-number-sign": "정수 부호와 절댓값",
  "m1-equation-balance": "등식의 성질과 역연산",
  "m1-equation-substitution": "문자 대입과 계산 순서",
  "m1-english-detail": "영어 세부 정보 찾기",
  "m1-english-cause": "영어 원인과 이유 연결",
  "m1-english-word-order": "영어 문장 어순",
  "m1-english-verb-form": "영어 동사 형태와 표현",
  "m2-rational-conversion": "분수와 소수 변환",
  "m2-rational-exponent": "지수법칙과 식의 계산",
  "m2-function-substitution": "함숫값 대입",
  "m2-function-relation": "연립방정식과 그래프 관계",
  "m2-english-sequence": "영어 사건 순서",
  "m2-english-cause-result": "영어 원인과 결과",
  "m2-english-response": "상황에 맞는 영어 응답",
  "m2-english-polite-expression": "정중한 영어 요청",
  "m3-real-radical": "제곱근 계산과 간단히 하기",
  "m3-real-number-classification": "유리수와 무리수 분류",
  "m3-quadratic-factorization": "인수분해 구조",
  "m3-quadratic-roots": "이차방정식의 해",
  "m3-english-inference": "영어 문맥 추론",
  "m3-english-main-idea": "영어 주제와 요지",
  "m3-english-claim-evidence": "영어 주장과 근거",
  "m3-english-discourse": "영어 의견 연결과 담화 태도",
} as const;

export type MisconceptionTag = keyof typeof MISCONCEPTION_TAG_LABELS;
export type MisconceptionTagCounts = Partial<Record<MisconceptionTag, number>>;

export function isMisconceptionTag(value: unknown): value is MisconceptionTag {
  return typeof value === "string" && Object.hasOwn(MISCONCEPTION_TAG_LABELS, value);
}

export function incrementMisconceptionTag(
  counts: MisconceptionTagCounts,
  tag?: MisconceptionTag,
): MisconceptionTagCounts {
  if (!tag) return counts;
  return { ...counts, [tag]: (counts[tag] ?? 0) + 1 };
}

export function topMisconceptionTags(counts: MisconceptionTagCounts, limit = 3) {
  return Object.entries(counts)
    .filter((entry): entry is [MisconceptionTag, number] => isMisconceptionTag(entry[0]) && Number.isInteger(entry[1]) && entry[1] > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count, label: MISCONCEPTION_TAG_LABELS[tag] }));
}

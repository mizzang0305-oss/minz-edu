export function withJosa(word: string, consonantForm: string, vowelForm: string) {
  const last = word.codePointAt(word.length - 1) ?? 0;
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? consonantForm : vowelForm}`;
}

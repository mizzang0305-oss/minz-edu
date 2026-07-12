export function conceptStatus(successCount: number, applicationSuccess: boolean, explained: boolean) {
  if (successCount >= 5 && applicationSuccess && explained) return "자유롭게 사용" as const;
  if (successCount >= 2) return "익히는 중" as const;
  return "발견 중" as const;
}

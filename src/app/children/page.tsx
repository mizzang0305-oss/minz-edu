import { redirect } from "next/navigation";
import { ChildProfileSelector } from "@/components/children/ChildProfileSelector";
import { getGuardianSession } from "@/lib/auth/guardianSession";

export default async function ChildrenPage() {
  const guardian = await getGuardianSession();
  if (!guardian) redirect("/login");
  return (
    <main className="children-page">
      <div className="page-heading">
        <span className="eyebrow">GUARDIAN PARTY</span>
        <h1>오늘 모험할 영웅은 누구인가요?</h1>
        <p>아이를 고르면 그 아이의 스테이지, 연습 기록, 보물 가방만 불러옵니다.</p>
      </div>
      <ChildProfileSelector />
    </main>
  );
}

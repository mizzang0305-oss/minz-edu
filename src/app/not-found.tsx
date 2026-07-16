import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="eyebrow">길을 다시 찾는 중</span>
        <h1>여기는 아직 열리지 않은 모험 길이야</h1>
        <p>주소가 바뀌었거나 아직 준비 중인 장소예요. 모험 지도로 돌아가 다음 퀘스트를 골라 주세요.</p>
        <Link href="/world" className="primary-button">모험 지도로 돌아가기</Link>
      </section>
    </main>
  );
}

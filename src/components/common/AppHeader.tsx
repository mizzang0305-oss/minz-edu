import Link from "next/link";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/" className="brand" aria-label="민즈 어드벤처 홈">
        <span className="brand-mark">M</span>
        <span className="brand-name">민즈 어드벤처</span>
        <span className="brand-short">민즈</span>
      </Link>
      <nav aria-label="주요 메뉴">
        <Link href="/goals"><span className="nav-label">주별 목표</span><span className="nav-short">목표</span></Link>
        <Link href="/world"><span className="nav-label">모험 지도</span><span className="nav-short">지도</span></Link>
        <Link href="/training"><span className="nav-label">훈련장</span><span className="nav-short">연습</span></Link>
        <Link href="/inventory"><span className="nav-label">보물 가방</span><span className="nav-short">가방</span></Link>
        <Link href="/parent"><span className="nav-label">보호자</span><span className="nav-short">보호자</span></Link>
        <Link href="/login" className="account-link"><span className="nav-label">계정</span><span className="nav-short">계정</span></Link>
      </nav>
    </header>
  );
}

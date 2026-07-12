import Link from "next/link";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/" className="brand" aria-label="민즈 어드벤처 홈">
        <span className="brand-mark">M</span>
        <span>민즈 어드벤처</span>
      </Link>
      <nav aria-label="주요 메뉴">
        <Link href="/world">모험 지도</Link>
        <Link href="/inventory">보물 가방</Link>
        <Link href="/parent">보호자</Link>
      </nav>
    </header>
  );
}

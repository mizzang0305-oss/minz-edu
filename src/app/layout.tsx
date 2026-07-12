import type { Metadata } from "next";
import { AppHeader } from "@/components/common/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "민즈 어드벤처 · 숫자 숲",
  description: "직접 조작하고 함께 작전을 세우는 아동용 숫자 모험 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}

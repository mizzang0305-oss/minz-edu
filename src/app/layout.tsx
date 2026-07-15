import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/common/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "민즈 어드벤처 · 숫자 숲",
  description: "직접 조작하고 함께 작전을 세우는 아동용 숫자 모험 게임",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "민즈 모험",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#102e4a",
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

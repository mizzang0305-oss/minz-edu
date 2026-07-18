import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "민즈 어드벤처",
    short_name: "민즈 모험",
    description: "문제를 풀고 직접 공격하며 성장하는 수학·국어·영어 학습 모험",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#fffdf6",
    theme_color: "#102e4a",
    orientation: "landscape",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

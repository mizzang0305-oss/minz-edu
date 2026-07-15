import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "민즈 어드벤처",
    short_name: "민즈 모험",
    description: "친구와 각자 기기에서 함께하는 숫자 학습 모험",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf6",
    theme_color: "#102e4a",
    orientation: "any",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

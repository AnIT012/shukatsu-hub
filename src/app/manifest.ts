import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "就活ダッシュボード",
    short_name: "就活ダッシュ",
    description:
      "次に何をすべきか・次の締切が一目でわかる、就活インターン進捗管理ツール",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eff4fa",
    theme_color: "#ffffff",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

/** iOS「ホーム画面に追加」等向けの Web App Manifest */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProBase Museum",
    short_name: "PBM",
    description:
      "数字が語る、感動の軌跡。あなただけのプロ野球データ博物館。",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

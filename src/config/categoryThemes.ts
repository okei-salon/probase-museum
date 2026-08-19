import type { MediaAsset } from "@/config/media";

export type BackgroundFrame = {
  size?: string;
  position?: string;
  filter?: string;
  /** 背景写真のごく軽いぼかし（px） */
  blurPx?: number;
  /** 黒〜濃紺の半透明ヴェール（博物館奥の見え方） */
  veilClassName?: string;
  overlayClassName?: string;
};

export type CategoryAccent = {
  /** メインアクセント（シアン / ブルー / ゴールドなど） */
  color: string;
  soft: string;
  border: string;
  glow: string;
};

export type CategoryTheme = {
  id: string;
  background: MediaAsset;
  frame: BackgroundFrame;
  accent: CategoryAccent;
};

const accentGold: CategoryAccent = {
  color: "#d4af37",
  soft: "rgba(212,175,55,0.16)",
  border: "rgba(212,175,55,0.45)",
  glow: "rgba(212,175,55,0.28)",
};

const accentCyan: CategoryAccent = {
  color: "#38bdf8",
  soft: "rgba(56,189,248,0.14)",
  border: "rgba(56,189,248,0.45)",
  glow: "rgba(56,189,248,0.25)",
};

const accentBlue: CategoryAccent = {
  color: "#60a5fa",
  soft: "rgba(96,165,250,0.14)",
  border: "rgba(96,165,250,0.5)",
  glow: "rgba(96,165,250,0.28)",
};

/** SEASONS WORLD — うっすら青（ゴールド基調を崩さない程度） */
const accentSeasonBlue: CategoryAccent = {
  color: "#8eb8e8",
  soft: "rgba(110,160,210,0.12)",
  border: "rgba(130,175,220,0.38)",
  glow: "rgba(110,160,210,0.18)",
};

/** SEASONS WORLD — うっすら赤 */
const accentSeasonRed: CategoryAccent = {
  color: "#d4a090",
  soft: "rgba(190,110,100,0.12)",
  border: "rgba(200,120,110,0.36)",
  glow: "rgba(190,110,100,0.18)",
};

const stadiumSunset: MediaAsset = {
  src: "/images/backgrounds/koshien-sunset.jpg",
  alt: "夕暮れの阪神甲子園球場",
};

const stadiumNight: MediaAsset = {
  src: "/images/backgrounds/koshien-stadium.jpg",
  alt: "ナイターの阪神甲子園球場",
};

const pennantStadium: MediaAsset = {
  src: "/images/backgrounds/pennant-stadium.jpg",
  alt: "レギュラーシーズンの球場",
};

const interleagueBlue: MediaAsset = {
  src: "/images/backgrounds/interleague-blue.jpg",
  alt: "青いナイター球場",
};

const postseasonNight: MediaAsset = {
  src: "/images/backgrounds/postseason-night.jpg",
  alt: "ポストシーズンのナイター球場",
};

/** HOME向け：世界観をしっかり見せる（やや明るめ） */
export const homeBackgroundFrame: BackgroundFrame = {
  size: "210% auto",
  position: "40% 100%",
  blurPx: 2,
  veilClassName: "bg-[rgba(5,12,24,0.28)]",
  overlayClassName:
    "bg-gradient-to-b from-black/15 via-transparent to-black/45",
};

/** データ閲覧ページ共通：HOMEより暗く、情報を主役に */
const dataVeil = "bg-[rgba(5,12,24,0.40)]";
const dataOverlay =
  "bg-gradient-to-b from-[#050c18]/35 via-[#050c18]/15 to-black/55";

/** カテゴリごとの背景テーマ（写真とUIは分離） */
export const categoryThemes = {
  seasons: {
    id: "seasons",
    background: stadiumSunset,
    frame: {
      size: "210% auto",
      position: "40% 100%",
      blurPx: 3,
      veilClassName: dataVeil,
      overlayClassName: dataOverlay,
    },
    accent: accentGold,
  },
  seasonHub: {
    id: "seasonHub",
    background: stadiumNight,
    frame: {
      size: "cover",
      position: "center 55%",
      blurPx: 3,
      veilClassName: dataVeil,
      overlayClassName: dataOverlay,
    },
    accent: accentGold,
  },
  seasonHubBlue: {
    id: "seasonHubBlue",
    background: stadiumNight,
    frame: {
      size: "cover",
      position: "center 55%",
      blurPx: 3,
      veilClassName: "bg-[rgba(5,14,28,0.42)]",
      overlayClassName: dataOverlay,
    },
    accent: accentSeasonBlue,
  },
  seasonHubRed: {
    id: "seasonHubRed",
    background: stadiumNight,
    frame: {
      size: "cover",
      position: "center 55%",
      blurPx: 3,
      veilClassName: "bg-[rgba(18,8,8,0.40)]",
      overlayClassName: dataOverlay,
    },
    accent: accentSeasonRed,
  },
  pennant: {
    id: "pennant",
    background: pennantStadium,
    frame: {
      size: "cover",
      position: "center 48%",
      blurPx: 3,
      veilClassName: "bg-[rgba(5,12,24,0.38)]",
      overlayClassName: dataOverlay,
    },
    accent: accentCyan,
  },
  interleague: {
    id: "interleague",
    background: interleagueBlue,
    frame: {
      size: "cover",
      position: "center 35%",
      blurPx: 3,
      veilClassName: "bg-[rgba(5,12,24,0.42)]",
      overlayClassName: dataOverlay,
    },
    accent: accentBlue,
  },
  postseason: {
    id: "postseason",
    background: postseasonNight,
    frame: {
      size: "cover",
      position: "center 28%",
      blurPx: 3,
      veilClassName: dataVeil,
      overlayClassName: dataOverlay,
    },
    accent: accentGold,
  },
  awards: {
    id: "awards",
    background: stadiumSunset,
    frame: {
      size: "cover",
      position: "70% 60%",
      blurPx: 3,
      veilClassName: dataVeil,
      overlayClassName: dataOverlay,
    },
    accent: accentGold,
  },
  records: {
    id: "records",
    background: stadiumSunset,
    frame: {
      size: "cover",
      position: "30% 70%",
      blurPx: 3,
      veilClassName: "bg-[rgba(5,12,24,0.42)]",
      overlayClassName: dataOverlay,
    },
    accent: accentGold,
  },
  players: {
    id: "players",
    background: stadiumNight,
    frame: {
      size: "cover",
      position: "center 40%",
      blurPx: 3,
      veilClassName: dataVeil,
      overlayClassName: dataOverlay,
    },
    accent: accentCyan,
  },
  teams: {
    id: "teams",
    background: stadiumNight,
    frame: {
      size: "cover",
      position: "center 50%",
      blurPx: 3,
      veilClassName: dataVeil,
      overlayClassName: dataOverlay,
    },
    accent: accentGold,
  },
  sop: {
    id: "sop",
    background: stadiumNight,
    frame: {
      size: "cover",
      position: "center 35%",
      /* 紫系フィルタは使わず、濃紺ヴェールで統一 */
      blurPx: 3,
      veilClassName: "bg-[rgba(5,12,24,0.43)]",
      overlayClassName: dataOverlay,
    },
    accent: accentBlue,
  },
  yearbook: {
    id: "yearbook",
    background: stadiumSunset,
    frame: {
      size: "cover",
      position: "55% 65%",
      blurPx: 3,
      veilClassName: dataVeil,
      overlayClassName: dataOverlay,
    },
    accent: accentGold,
  },
} as const satisfies Record<string, CategoryTheme>;

export type CategoryThemeId = keyof typeof categoryThemes;

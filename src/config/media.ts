/**
 * 画像差し替え用の単一エントリポイント。
 * 出典・ライセンスは README の「画像クレジット」を参照。
 */
export type MediaAsset = {
  src: string | null;
  alt?: string;
};

export const media = {
  backgrounds: {
    /** 添付デザインと同雰囲気の甲子園（夕景・照明・スタンド） */
    home: {
      src: "/images/backgrounds/koshien-sunset.jpg",
      alt: "夕暮れの阪神甲子園球場",
    } satisfies MediaAsset,
  },

  nav: {
    seasons: {
      src: "/images/nav/seasons.jpg",
      alt: "シーズン年鑑",
    } satisfies MediaAsset,
    records: {
      src: "/images/nav/records.jpg",
      alt: "記録室",
    } satisfies MediaAsset,
    players: {
      src: "/images/nav/players.jpg",
      alt: "選手名鑑",
    } satisfies MediaAsset,
    teams: {
      src: "/images/nav/teams.jpg",
      alt: "球団データ",
    } satisfies MediaAsset,
    sop: {
      src: "/images/nav/sop.jpg",
      alt: "SOP",
    } satisfies MediaAsset,
    yearbook: {
      src: "/images/nav/yearbook.jpg",
      alt: "年鑑・総評",
    } satisfies MediaAsset,
  },

  pickup: {
    season: {
      src: "/images/pickup/season.jpg",
      alt: "2023シーズン",
    } satisfies MediaAsset,
  },
} as const;

export type NavMediaKey = keyof typeof media.nav;

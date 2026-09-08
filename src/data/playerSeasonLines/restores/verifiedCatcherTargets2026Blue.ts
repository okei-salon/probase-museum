/**
 * ユーザー提供 BATTER_SEASON（2026 BLUE 捕手）の明示マッピング。
 * 推測照合はせず、球団バッチ文脈で確定した捕手のみ対象。
 * 非捕手（内山・ヒュンメル・中村奨）はスキップ。
 */

import type { TeamId } from "@/data/teams";

export type VerifiedCatcherBatterTarget = {
  /** 貼り付け行の選手名トークン */
  pasteName: string;
  playerId: string;
  fullName: string;
  teamId: TeamId;
  teamName: string;
};

/** 貼り付けブロック順の捕手のみ（明示 ID） */
export const VERIFIED_2026_BLUE_CATCHER_BATTER_TARGETS: VerifiedCatcherBatterTarget[] =
  [
    {
      pasteName: "鈴木叶",
      playerId: "yakult_01005159_65",
      fullName: "鈴木叶",
      teamId: "swallows",
      teamName: "ヤクルト",
    },
    {
      pasteName: "中村悠",
      playerId: "yakult_51255118_27",
      fullName: "中村悠平",
      teamId: "swallows",
      teamName: "ヤクルト",
    },
    {
      pasteName: "古賀",
      playerId: "yakult_01705134_2",
      fullName: "古賀優大",
      teamId: "swallows",
      teamName: "ヤクルト",
    },
    {
      pasteName: "坂本",
      playerId: "hanshin_11915132_12",
      fullName: "坂本誠志郎",
      teamId: "tigers",
      teamName: "阪神",
    },
    {
      pasteName: "伏見",
      playerId: "hanshin_61065137_17",
      fullName: "伏見寅威",
      teamId: "tigers",
      teamName: "阪神",
    },
    {
      pasteName: "嶋村",
      playerId: "hanshin_31235150_85",
      fullName: "嶋村麟士朗",
      teamId: "tigers",
      teamName: "阪神",
    },
    {
      pasteName: "梅野",
      playerId: "hanshin_21325139_2",
      fullName: "梅野隆太郎",
      teamId: "tigers",
      teamName: "阪神",
    },
    {
      pasteName: "松尾",
      playerId: "dena_21825157_5",
      fullName: "松尾汐恩",
      teamId: "baystars",
      teamName: "DeNA",
    },
    {
      pasteName: "戸柱",
      playerId: "dena_41245132_10",
      fullName: "戸柱恭孝",
      teamId: "baystars",
      teamName: "DeNA",
    },
    {
      pasteName: "九鬼",
      playerId: "dena_31735134_95",
      fullName: "九鬼隆平",
      teamId: "baystars",
      teamName: "DeNA",
    },
    {
      pasteName: "岸田",
      playerId: "giants_91595136_27",
      fullName: "岸田行倫",
      teamId: "giants",
      teamName: "巨人",
    },
    {
      pasteName: "大城",
      playerId: "giants_21325136_24",
      fullName: "大城卓三",
      teamId: "giants",
      teamName: "巨人",
    },
    {
      pasteName: "甲斐",
      playerId: "giants_91595133_10",
      fullName: "甲斐拓也",
      teamId: "giants",
      teamName: "巨人",
    },
    {
      pasteName: "吉田賢",
      playerId: "nipponham_13515157_60",
      fullName: "吉田賢吾",
      teamId: "fighters",
      teamName: "日本ハム",
    },
    {
      pasteName: "石伊",
      playerId: "chunichi_21125150_9",
      fullName: "石伊雄太",
      teamId: "dragons",
      teamName: "中日",
    },
    {
      pasteName: "木下拓",
      playerId: "chunichi_31735132_35",
      fullName: "木下拓哉",
      teamId: "dragons",
      teamName: "中日",
    },
    {
      pasteName: "坂倉",
      playerId: "hiroshima_11915134_31",
      fullName: "坂倉将吾",
      teamId: "carp",
      teamName: "広島",
    },
    {
      pasteName: "持丸",
      playerId: "hiroshima_81885151_57",
      fullName: "持丸泰輝",
      teamId: "carp",
      teamName: "広島",
    },
    {
      pasteName: "石原",
      playerId: "hiroshima_21125151_32",
      fullName: "石原貴規",
      teamId: "carp",
      teamName: "広島",
    },
  ];

/** 貼り付けに含まれるが捕手復元対象外 */
export const SKIPPED_NON_CATCHER_PASTE_NAMES = [
  "内山", // 内山壮真・内野手
  "ヒュンメル", // 外野手
  "中村奨", // 中村奨成・外野手
] as const;

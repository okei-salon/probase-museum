/**
 * 手入力の成績種別レジストリ。
 * 今後 月間MVP / タイトル / B9 / GG 等を同じ枠で追加する。
 */

export type ManualEntryKindId =
  | "season_batting"
  | "season_pitching"
  | "monthly_mvp"
  | "title"
  | "best9"
  | "gg"
  | "standings"
  | "team_stats"
  | "special_record";

export type ManualEntryKind = {
  id: ManualEntryKindId;
  label: string;
  description: string;
  /** 今回実装済みか */
  enabled: boolean;
};

export const MANUAL_ENTRY_KINDS: ManualEntryKind[] = [
  {
    id: "season_batting",
    label: "野手・年度個人成績",
    description: "打席・安打などから打率・OPSなどを自動算出",
    enabled: true,
  },
  {
    id: "season_pitching",
    label: "投手・年度個人成績",
    description: "勝敗・投球回などから防御率・勝率を自動算出",
    enabled: true,
  },
  {
    id: "monthly_mvp",
    label: "月間MVP",
    description: "準備中（当面は画像取込を利用）",
    enabled: false,
  },
  {
    id: "title",
    label: "タイトル",
    description: "準備中",
    enabled: false,
  },
  {
    id: "best9",
    label: "ベストナイン",
    description: "準備中",
    enabled: false,
  },
  {
    id: "gg",
    label: "ゴールデングラブ",
    description: "準備中",
    enabled: false,
  },
  {
    id: "standings",
    label: "順位",
    description: "準備中",
    enabled: false,
  },
  {
    id: "team_stats",
    label: "チーム成績",
    description: "準備中",
    enabled: false,
  },
  {
    id: "special_record",
    label: "特別記録",
    description: "準備中",
    enabled: false,
  },
];

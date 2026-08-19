/**
 * NPB史実シーズン記録基準（到達または更新で＋10点／カテゴリ1回）
 * 防御率など小さい方が優秀な項目は lowerIsBetter: true
 */

export const NPB_RECORD_BONUS_POINTS = 10;

export type NpbRecordDef = {
  id: string;
  label: string;
  role: "batter" | "pitcher" | "feat";
  /** 成績フィールド名（入力スナップショット） */
  field: string;
  threshold: number;
  lowerIsBetter?: boolean;
};

export const NPB_BATTER_SEASON_RECORDS: NpbRecordDef[] = [
  { id: "npb_avg", label: "打率", role: "batter", field: "avg", threshold: 0.389 },
  { id: "npb_h", label: "安打", role: "batter", field: "h", threshold: 216 },
  { id: "npb_hr", label: "本塁打", role: "batter", field: "hr", threshold: 60 },
  { id: "npb_rbi", label: "打点", role: "batter", field: "rbi", threshold: 161 },
  { id: "npb_r", label: "得点", role: "batter", field: "r", threshold: 143 },
  { id: "npb_2b", label: "二塁打", role: "batter", field: "doubles", threshold: 52 },
  { id: "npb_3b", label: "三塁打", role: "batter", field: "triples", threshold: 18 },
  { id: "npb_sb", label: "盗塁", role: "batter", field: "sb", threshold: 106 },
  { id: "npb_sac", label: "犠打", role: "batter", field: "sac", threshold: 67 },
  { id: "npb_bb", label: "四球", role: "batter", field: "bb", threshold: 158 },
  { id: "npb_obp", label: "出塁率", role: "batter", field: "obp", threshold: 0.487 },
];

export const NPB_PITCHER_SEASON_RECORDS: NpbRecordDef[] = [
  {
    id: "npb_era",
    label: "防御率",
    role: "pitcher",
    field: "era",
    threshold: 0.73,
    lowerIsBetter: true,
  },
  { id: "npb_w", label: "勝利", role: "pitcher", field: "w", threshold: 42 },
  { id: "npb_so", label: "奪三振", role: "pitcher", field: "so", threshold: 401 },
  { id: "npb_g", label: "登板", role: "pitcher", field: "g", threshold: 90 },
  { id: "npb_cg", label: "完投", role: "pitcher", field: "cg", threshold: 47 },
  { id: "npb_sho", label: "完封", role: "pitcher", field: "sho", threshold: 19 },
  { id: "npb_sv", label: "セーブ", role: "pitcher", field: "sv", threshold: 54 },
  { id: "npb_hld", label: "ホールド", role: "pitcher", field: "hld", threshold: 50 },
  { id: "npb_hp", label: "HP", role: "pitcher", field: "hp", threshold: 59 },
  { id: "npb_ip", label: "投球回", role: "pitcher", field: "ip", threshold: 541 + 1 / 3 },
  { id: "npb_winPct", label: "勝率", role: "pitcher", field: "winPct", threshold: 1.0 },
];

/** 特殊・連続の史実基準 */
export const NPB_FEAT_RECORDS: NpbRecordDef[] = [
  {
    id: "npb_hit_streak",
    label: "連続試合安打",
    role: "feat",
    field: "hitStreak",
    threshold: 33,
  },
  {
    id: "npb_ob_streak",
    label: "連続試合出塁",
    role: "feat",
    field: "onBaseStreak",
    threshold: 69,
  },
  {
    id: "npb_hr_streak",
    label: "連続試合本塁打",
    role: "feat",
    field: "hrStreak",
    threshold: 7,
  },
  {
    id: "npb_scoreless",
    label: "連続無失点イニング",
    role: "feat",
    field: "scorelessIp",
    threshold: 64 + 1 / 3,
  },
  {
    id: "npb_game_so",
    label: "1試合奪三振",
    role: "feat",
    field: "gameSo",
    threshold: 19,
  },
  {
    id: "npb_win_streak",
    label: "シーズン連勝",
    role: "feat",
    field: "winStreak",
    threshold: 24,
  },
];

export function meetsNpbRecord(
  value: number | null | undefined,
  def: NpbRecordDef,
): boolean {
  if (value == null || !Number.isFinite(value)) return false;
  if (def.lowerIsBetter) return value <= def.threshold && value >= 0;
  return value >= def.threshold;
}

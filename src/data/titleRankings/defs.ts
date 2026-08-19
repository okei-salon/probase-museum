/**
 * 主要タイトル（率・指標ランキング）の定義。
 * 表彰系（MVP・B9等）とは別。
 */

export type TitleRole = "batter" | "pitcher";

export type TitleValueFormat =
  | "avg" // .342
  | "era" // 1.82
  | "pct" // .750
  | "pct100" // 72.0%
  | "ip" // 168.2
  | "int" // 42
  | "rate2"; // 10.24

/**
 * 資格判定の種類。
 * unknown = 必要データが年度個人成績に無く正確判定不可（推測しない）
 */
export type TitleEligibility =
  | "none"
  | "pa_qualify" // 規定打席 — PA / チーム試合数が必要
  | "ip_qualify" // 規定投球回
  | "relief_ip_30" // 救援30投球回以上
  | "risp" // 得点圏打率 — 専用成績が必要
  | "catcher_cs"; // 盗塁阻止率 — 捕手側成績が必要

export type TitleDef = {
  id: string;
  label: string;
  role: TitleRole;
  /** 候補行の values キー */
  valueKey: string;
  lowerIsBetter?: boolean;
  format: TitleValueFormat;
  eligibility: TitleEligibility;
  /** 資格を満たせない場合の説明（UI表示用） */
  eligibilityNote?: string;
};

export const BATTER_TITLES: TitleDef[] = [
  {
    id: "avg",
    label: "打率",
    role: "batter",
    valueKey: "avg",
    format: "avg",
    eligibility: "pa_qualify",
    eligibilityNote:
      "規定打席到達フラグ（paQualified）が true の選手のみ対象です。未設定は判定不可として除外します。",
  },
  {
    id: "h",
    label: "安打",
    role: "batter",
    valueKey: "h",
    format: "int",
    eligibility: "none",
  },
  {
    id: "hr",
    label: "本塁打",
    role: "batter",
    valueKey: "hr",
    format: "int",
    eligibility: "none",
  },
  {
    id: "rbi",
    label: "打点",
    role: "batter",
    valueKey: "rbi",
    format: "int",
    eligibility: "none",
  },
  {
    id: "obp",
    label: "出塁率",
    role: "batter",
    valueKey: "obp",
    format: "avg",
    eligibility: "pa_qualify",
    eligibilityNote:
      "規定打席到達フラグ（paQualified）が true の選手のみ対象です。未設定は判定不可として除外します。",
  },
  {
    id: "doubles",
    label: "二塁打",
    role: "batter",
    valueKey: "doubles",
    format: "int",
    eligibility: "none",
  },
  {
    id: "triples",
    label: "三塁打",
    role: "batter",
    valueKey: "triples",
    format: "int",
    eligibility: "none",
  },
  {
    id: "r",
    label: "得点",
    role: "batter",
    valueKey: "r",
    format: "int",
    eligibility: "none",
  },
  {
    id: "sb",
    label: "盗塁",
    role: "batter",
    valueKey: "sb",
    format: "int",
    eligibility: "none",
  },
  {
    id: "bb",
    label: "四球",
    role: "batter",
    valueKey: "bb",
    format: "int",
    eligibility: "none",
  },
  {
    id: "risp",
    label: "得点圏打率",
    role: "batter",
    valueKey: "risp",
    format: "avg",
    eligibility: "risp",
    eligibilityNote:
      "圏打数・圏安打が登録されている選手のみ集計します。",
  },
  {
    id: "sac",
    label: "犠打",
    role: "batter",
    valueKey: "sac",
    format: "int",
    eligibility: "none",
  },
  {
    id: "ops",
    label: "OPS",
    role: "batter",
    valueKey: "ops",
    format: "avg",
    eligibility: "pa_qualify",
    eligibilityNote:
      "規定打席到達フラグ（paQualified）が true の選手のみ対象です。未設定は判定不可として除外します。",
  },
  {
    id: "csRate",
    label: "盗塁阻止率",
    role: "batter",
    valueKey: "csRate",
    format: "avg",
    lowerIsBetter: false,
    eligibility: "catcher_cs",
    eligibilityNote:
      "盗塁阻止率ランキングは被盗塁企図30回以上が規定です（試合数・守備機会は使いません）。",
  },
];

export const PITCHER_TITLES: TitleDef[] = [
  {
    id: "era",
    label: "防御率",
    role: "pitcher",
    valueKey: "era",
    format: "era",
    lowerIsBetter: true,
    eligibility: "ip_qualify",
    eligibilityNote:
      "規定投球回到達フラグ（ipQualified）が true の投手のみ対象です。未設定は判定不可として除外します。",
  },
  {
    id: "w",
    label: "勝利",
    role: "pitcher",
    valueKey: "w",
    format: "int",
    eligibility: "none",
  },
  {
    id: "winPct",
    label: "勝率",
    role: "pitcher",
    valueKey: "winPct",
    format: "pct",
    eligibility: "ip_qualify",
    eligibilityNote:
      "勝率タイトルの登板条件はデータ不足のため参考順位です。",
  },
  {
    id: "so",
    label: "奪三振",
    role: "pitcher",
    valueKey: "so",
    format: "int",
    eligibility: "none",
  },
  {
    id: "soRate",
    label: "奪三振率",
    role: "pitcher",
    valueKey: "soRate",
    format: "rate2",
    eligibility: "ip_qualify",
    eligibilityNote:
      "規定投球回到達フラグ（ipQualified）が true の投手のみ対象です。未設定は判定不可として除外します。",
  },
  {
    id: "sho",
    label: "完封",
    role: "pitcher",
    valueKey: "sho",
    format: "int",
    eligibility: "none",
  },
  {
    id: "cg",
    label: "完投",
    role: "pitcher",
    valueKey: "cg",
    format: "int",
    eligibility: "none",
  },
  {
    id: "ip",
    label: "投球回",
    role: "pitcher",
    valueKey: "ip",
    format: "ip",
    eligibility: "none",
  },
  {
    id: "qsRate",
    label: "QS率",
    role: "pitcher",
    valueKey: "qsRate",
    format: "pct100",
    eligibility: "none",
  },
  {
    id: "hqsRate",
    label: "HQS率",
    role: "pitcher",
    valueKey: "hqsRate",
    format: "pct100",
    eligibility: "none",
  },
  {
    id: "g",
    label: "登板",
    role: "pitcher",
    valueKey: "g",
    format: "int",
    eligibility: "none",
  },
  {
    id: "hp",
    label: "ホールド",
    role: "pitcher",
    valueKey: "hp",
    format: "int",
    eligibility: "none",
  },
  {
    id: "sv",
    label: "セーブ",
    role: "pitcher",
    valueKey: "sv",
    format: "int",
    eligibility: "none",
  },
  {
    id: "reliefEra",
    label: "救援防御率（30投球回以上）",
    role: "pitcher",
    valueKey: "reliefEra",
    format: "era",
    lowerIsBetter: true,
    eligibility: "relief_ip_30",
    eligibilityNote:
      "救援投球回・救援自責点が年度個人成績に未収録のため、登録データからは集計できません。",
  },
  {
    id: "reliefSoRate",
    label: "救援奪三振率（30投球回以上）",
    role: "pitcher",
    valueKey: "reliefSoRate",
    format: "rate2",
    eligibility: "relief_ip_30",
    eligibilityNote:
      "救援投球回・救援奪三振が年度個人成績に未収録のため、登録データからは集計できません。",
  },
];

export function titlesForRole(role: TitleRole): TitleDef[] {
  return role === "batter" ? BATTER_TITLES : PITCHER_TITLES;
}

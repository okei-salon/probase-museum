import type { TeamId } from "@/data/teams";

/** 一括取込の対象ロール（捕手は野手ラインの守備項目） */
export type SeasonBatchRole = "batter" | "pitcher" | "catcher";

export type FieldCellStatus =
  | "ok"
  | "needs_confirm"
  | "conflict"
  | "empty"
  | "invalid";

export type FieldCellSource = {
  imageId: string;
  raw: string;
  value: number | string | null;
};

/** 表・マージ用の1セル */
export type SeasonBatchFieldCell = {
  value: number | string | null;
  display: string;
  status: FieldCellStatus;
  note?: string;
  sources: FieldCellSource[];
};

/** 野手カウントキー（文字列フォームと対応） */
export type BatterBatchFieldKey =
  | "g"
  | "pa"
  | "ab"
  | "h"
  | "singles"
  | "doubles"
  | "triples"
  | "hr"
  | "tb"
  | "rbi"
  | "r"
  | "so"
  | "bb"
  | "hbp"
  | "sf"
  | "sac"
  | "sb"
  | "sba"
  | "cs"
  | "rispAb"
  | "rispH"
  | "rispAvg"
  | "rispDiff"
  | "basesLoadedPa"
  | "basesLoadedH"
  | "basesLoadedAvg"
  | "basesLoadedDiff"
  | "hitStreak"
  | "onBaseStreak"
  | "hitlessStreak"
  | "multiHit"
  | "csAttempted"
  | "csAllowed"
  | "csCaught"
  | "avg"
  | "obp"
  | "slg"
  | "ops"
  | "hrRate"
  | "soRate"
  | "sbRate"
  | "csRate";

/** 投手カウントキー（プロスピ個人投手成績／シーズン） */
export type PitcherBatchFieldKey =
  | "era"
  | "ip"
  | "winPct"
  | "w"
  | "l"
  | "sv"
  | "hp"
  | "hld"
  | "g"
  | "gs"
  | "sho"
  | "cg"
  | "qs"
  | "qsRate"
  | "hqs"
  | "hqsRate"
  | "so"
  | "soRate"
  | "bb"
  | "bbRate"
  | "hbp"
  | "hr"
  | "hrRate"
  | "kbb"
  | "whip"
  | "sbAtt"
  | "sbAllowed"
  | "sbAllowedRate"
  | "wp"
  | "r"
  | "er"
  | "h"; // 被安打（貼り付け別名用。ゲーム順リストには通常「被安打」は無いが互換）

export type SeasonBatchFieldKey = BatterBatchFieldKey | PitcherBatchFieldKey;

export type SeasonBatchNameCandidate = {
  playerId: string;
  label: string;
  teamShort: string;
  score: number;
};

export type SeasonBatchPlayerRow = {
  rowId: string;
  /** 同一画像群内の行順（補助照合） */
  rowIndex: number;
  year: number;
  playerName: string;
  /** OCR生の選手名（照合前） */
  ocrName?: string;
  teamShort: string;
  teamId?: TeamId;
  teamName?: string;
  playerId?: string;
  nameStatus: FieldCellStatus;
  teamStatus: FieldCellStatus;
  /** 選手マスタ候補（要確認時に選択） */
  nameCandidates?: SeasonBatchNameCandidate[];
  fields: Partial<Record<SeasonBatchFieldKey, SeasonBatchFieldCell>>;
};

export type SeasonBatchImageMeta = {
  id: string;
  fileName: string;
  previewUrl: string;
  detectedHeaders: string[];
  confidence: number;
};

export type SeasonBatchSession = {
  role: SeasonBatchRole;
  year: number;
  images: SeasonBatchImageMeta[];
  rows: SeasonBatchPlayerRow[];
};

/** OCR1枚分のパーシャル行（マージ前） */
export type SeasonBatchPartialRow = {
  rowIndex: number;
  playerName: string;
  ocrName?: string;
  teamShort: string;
  playerId?: string;
  nameStatus?: FieldCellStatus;
  teamStatus?: FieldCellStatus;
  nameCandidates?: SeasonBatchNameCandidate[];
  fields: Partial<
    Record<
      SeasonBatchFieldKey,
      { raw: string; value: number | string | null; status: FieldCellStatus; note?: string }
    >
  >;
};

export type SeasonBatchParseResult = {
  yearHint: number | null;
  headers: SeasonBatchFieldKey[];
  headerLabels: string[];
  rows: SeasonBatchPartialRow[];
  rawText: string;
  confidence: number;
  /** 表構造OCRで検出した行数 */
  rowCount?: number;
  message?: string;
  normalizedPreviewUrl?: string;
  overlayPreviewUrl?: string;
};

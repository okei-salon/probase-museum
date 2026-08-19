import type { TeamId } from "@/data/teams";
import type { SeasonWorld } from "@/data/seasons";

/** 未確定参照の内部状態。適当な playerId へは紐付けない。 */
export const UNKNOWN_PLAYER_STATUS = "UNKNOWN" as const;

/** 選手そのもの＝識別用辞書。成績・身体情報は持たない。 */
export type PlayerMaster = {
  playerId: string;
  fullName: string;
  /** ゲーム上の基本表示名（名字） */
  gameDisplayName: string;
  /**
   * OCR表記ゆれ・誤認識の学習用別名。
   * 例: 「佐籐」「佐藤輝」
   */
  aliases: string[];
  position: string;
  uniformNumber: number | null;
  /** 実在NPB選手か／プロスピ架空新人か（仕組みは同一） */
  isRealPlayer: boolean;
  createdAt: string;
  updatedAt: string;
};

/** 年度ごとの所属。移籍しても playerId は変えない。 */
export type PlayerSeasonAffiliation = {
  playerId: string;
  year: number;
  /**
   * 正式 WORLD。未設定／null はレガシー・辞書用（既存データは維持）。
   * 同一年の BLUE / RED で所属が異なる場合に分離する。
   */
  world?: SeasonWorld | null;
  teamId: TeamId;
  teamName: string;
  position?: string;
  uniformNumber?: number | null;
};

/** OCR／ゲーム画面から得た観測（未確定でも保持） */
export type OcrPlayerObservation = {
  gameDisplayName: string;
  team?: string | null;
  position?: string | null;
  uniformNumber?: number | string | null;
  year?: number | null;
  /** 正式 WORLD。所属 upsert 時に伝播（未設定はレガシー） */
  world?: SeasonWorld | null;
};

/**
 * 成績・表彰レコードが持つ選手参照。
 * resolved になるまで UNKNOWN のままにし、仮の playerId へは繋がない。
 */
export type PlayerRef =
  | { status: "resolved"; playerId: string }
  | {
      status: typeof UNKNOWN_PLAYER_STATUS;
      /** 観測内容から作る一時キー（永続的な選手IDではない） */
      unknownKey: string;
      observation: OcrPlayerObservation;
    };

/** CSV / JSON 一括登録の1行（任意。通常はOCR学習で育つ） */
export type PlayerMasterImportRow = {
  playerId: string;
  fullName: string;
  gameDisplayName: string;
  teamId: TeamId | string;
  teamName: string;
  position: string;
  uniformNumber?: number | string | null;
  aliases?: string[] | string;
  isRealPlayer?: boolean | string;
  year?: number | string;
};

export type PlayerMatchQuery = OcrPlayerObservation;

export type PlayerMatchConfidence = "high" | "medium" | "low";

export type PlayerMatchCandidate = {
  player: PlayerMaster;
  affiliation: PlayerSeasonAffiliation | null;
  confidence: PlayerMatchConfidence;
  /** exact = 名字/alias完全一致, fuzzy = OCR類似（自動確定禁止） */
  matchKind: "exact" | "fuzzy";
  matchedOn: Array<
    "gameDisplayName" | "alias" | "team" | "year" | "position" | "uniformNumber"
  >;
};

/**
 * 照合結果
 * - matched: 高確信度のみ自動確定
 * - ambiguous: 複数候補 → ユーザー選択
 * - unknown: 未登録 → 新規登録または候補選択
 */
export type PlayerMatchResult =
  | {
      status: "matched";
      confidence: "high";
      player: PlayerMaster;
      affiliation: PlayerSeasonAffiliation | null;
      displayName: string;
      playerRef: Extract<PlayerRef, { status: "resolved" }>;
    }
  | {
      status: "ambiguous";
      confidence: PlayerMatchConfidence;
      candidates: PlayerMatchCandidate[];
      observation: OcrPlayerObservation;
      needsUserSelection: true;
      playerRef: Extract<PlayerRef, { status: "UNKNOWN" }>;
    }
  | {
      status: "unknown";
      observation: OcrPlayerObservation;
      /** 似ている候補（提示のみ。自動確定しない） */
      fuzzyCandidates: PlayerMatchCandidate[];
      needsUserSelection: true;
      playerRef: Extract<PlayerRef, { status: "UNKNOWN" }>;
    };

/** ユーザー確認UIへの入力 */
export type PlayerIdentityConfirmRequest = {
  observation: OcrPlayerObservation;
  candidates: PlayerMatchCandidate[];
  allowCreateNew?: boolean;
};

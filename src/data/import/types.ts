import type { LeagueSide } from "@/data/awards";
import type { SeasonWorld } from "@/data/seasons";
import { normalizeSeasonWorld } from "@/data/seasons";
import type { PlayerRef } from "@/data/playerMaster/types";
import type { ImportPipelineDebug } from "@/lib/import/pipelineDebug";
import type { FieldOcrDebug } from "@/lib/import/layouts/types";

/** 将来の画面種別。当面は monthly_mvp のみ実装。 */
export type ImportScreenType =
  | "monthly_mvp"
  | "mvp"
  | "rookie"
  | "sawamura"
  | "best9"
  | "gg"
  | "standings"
  | "player_batting"
  | "player_pitching"
  | "interleague"
  | "postseason"
  | "unknown";

export type MonthlyMvpPitcherDraft = {
  gameDisplayName: string;
  teamName: string;
  era: number | null;
  wins: number | null;
  losses: number | null;
  playerRef: PlayerRef;
  resolvedName: string;
};

export type MonthlyMvpBatterDraft = {
  gameDisplayName: string;
  teamName: string;
  avg: number | null;
  hr: number | null;
  rbi: number | null;
  sb: number | null;
  playerRef: PlayerRef;
  resolvedName: string;
};

export type MonthlyMvpImportDraft = {
  screenType: "monthly_mvp";
  year: number;
  /** 正式 WORLD。未設定時はレガシー／DEMO（確認画面のシーズン選択で付与） */
  world?: SeasonWorld | null;
  month: number;
  league: LeagueSide;
  pitcher: MonthlyMvpPitcherDraft;
  batter: MonthlyMvpBatterDraft;
  /** OCR生テキスト（デバッグ／手修正用） */
  rawText: string;
  confidence: "high" | "medium" | "low";
};

export type ImportDraft = MonthlyMvpImportDraft;

export type ImportJobStatus =
  | "queued"
  | "ocr"
  | "parsed"
  | "needs_review"
  | "saved"
  | "error";

export type ImportJob = {
  id: string;
  fileName: string;
  /** object URL or data URL for preview */
  previewUrl: string;
  /** 画面検出後の切り出しプレビュー（任意） */
  processedPreviewUrl?: string;
  status: ImportJobStatus;
  screenType: ImportScreenType;
  draft: ImportDraft | null;
  debug?: ImportPipelineDebug;
  fieldDebug?: FieldOcrDebug[];
  error?: string;
  createdAt: string;
};

/** 保存済み月間MVP（表彰画面が参照）。1レコード＝年月×リーグ（投手＋野手） */
export type SavedMonthlyMvpRecord = {
  /**
   * 正式: `${world}:${year}-${month}-${league}`
   * レガシー／DEMO: `${year}-${month}-${league}`（既存IDは変更しない）
   */
  id: string;
  year: number;
  world?: SeasonWorld | null;
  month: number;
  league: LeagueSide;
  pitcher: {
    playerId: string | null;
    playerName: string;
    teamName: string;
    era: number;
    wins: number;
    losses: number;
  };
  batter: {
    playerId: string | null;
    playerName: string;
    teamName: string;
    avg: number;
    hr: number;
    rbi: number;
    sb: number;
  };
  sourceJobId: string;
  updatedAt: string;
};

export type ImportHistoryEntry = {
  id: string;
  at: string;
  year: number;
  screenType: ImportScreenType;
  fileName: string;
  summary: string;
  recordIds: string[];
};

/**
 * 月間MVPの upsert / 取得用 ID。
 * 既存は year-month-league。正式 WORLD のみ先頭に world を付与する。
 * ※1レコードに投手・野手の両方を含む既存構造を維持する。
 */
export function monthlyMvpRecordKey(
  year: number,
  month: number,
  league: LeagueSide,
  world?: SeasonWorld | null,
): string {
  const base = `${year}-${month}-${league}`;
  const w = normalizeSeasonWorld(world);
  if (w) return `${w}:${base}`;
  return base;
}

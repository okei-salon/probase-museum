import { npbTeams, type TeamId } from "@/data/teams";
import type {
  FieldCellStatus,
  SeasonBatchFieldCell,
  SeasonBatchFieldKey,
  SeasonBatchPartialRow,
  SeasonBatchPlayerRow,
  SeasonBatchSession,
} from "@/data/import/seasonBatchTypes";
import { normalizePlayerToken } from "@/lib/playerMaster/similarity";

export function normalizeTeamShort(raw: string): string {
  const t = raw.replace(/\s+/g, "").trim();
  if (!t) return "";
  const aliases: Record<string, string> = {
    阪神: "阪神",
    タイガース: "阪神",
    巨人: "巨人",
    読売: "巨人",
    ジャイアンツ: "巨人",
    広島: "広島",
    カープ: "広島",
    DeNA: "DeNA",
    DNA: "DeNA",
    横浜: "DeNA",
    ベイスターズ: "DeNA",
    ヤクルト: "ヤクルト",
    スワローズ: "ヤクルト",
    中日: "中日",
    ドラゴンズ: "中日",
    オリックス: "オリックス",
    バファローズ: "オリックス",
    ソフトバンク: "ソフトバンク",
    SB: "ソフトバンク",
    ホークス: "ソフトバンク",
    ロッテ: "ロッテ",
    マリーンズ: "ロッテ",
    日本ハム: "日本ハム",
    日ハム: "日本ハム",
    ファイターズ: "日本ハム",
    西武: "西武",
    ライオンズ: "西武",
    楽天: "楽天",
    イーグルス: "楽天",
  };
  if (aliases[t]) return aliases[t]!;
  for (const [k, v] of Object.entries(aliases)) {
    if (t.includes(k)) return v;
  }
  const hit = npbTeams.find(
    (team) => team.short === t || team.name.includes(t) || t.includes(team.short),
  );
  return hit?.short ?? t;
}

export function teamIdFromShort(short: string): TeamId | undefined {
  const n = normalizeTeamShort(short);
  return npbTeams.find((t) => t.short === n)?.id;
}

export function teamNameFromShort(short: string): string | undefined {
  const id = teamIdFromShort(short);
  return id ? npbTeams.find((t) => t.id === id)?.name : undefined;
}

export function playerMatchKey(
  year: number,
  playerName: string,
  teamShort: string,
): string {
  return `${year}|${normalizePlayerToken(playerName)}|${normalizeTeamShort(teamShort)}`;
}

function valuesEqual(
  a: number | string | null,
  b: number | string | null,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-9;
  }
  return String(a) === String(b);
}

function mergeCell(
  existing: SeasonBatchFieldCell | undefined,
  incoming: {
    raw: string;
    value: number | string | null;
    status: FieldCellStatus;
    note?: string;
  },
  imageId: string,
): SeasonBatchFieldCell {
  const source = {
    imageId,
    raw: incoming.raw,
    value: incoming.value,
  };

  if (!existing || existing.status === "empty" || existing.value == null) {
    return {
      value: incoming.value,
      display: incoming.raw || String(incoming.value ?? ""),
      status: incoming.status,
      note: incoming.note,
      sources: [source],
    };
  }

  const sources = [...existing.sources, source];
  if (valuesEqual(existing.value, incoming.value)) {
    return {
      ...existing,
      sources,
      status:
        existing.status === "needs_confirm" || incoming.status === "needs_confirm"
          ? "needs_confirm"
          : existing.status === "invalid" || incoming.status === "invalid"
            ? "invalid"
            : "ok",
      note: existing.note || incoming.note,
    };
  }

  // 不一致 → 上書きせず要確認（表示は既存を維持）
  return {
    ...existing,
    sources,
    status: "needs_confirm",
    note: `不一致: 「${existing.display}」と「${incoming.raw || incoming.value}」。確認してください`,
  };
}

function emptyRow(
  year: number,
  rowIndex: number,
  partial: SeasonBatchPartialRow,
): SeasonBatchPlayerRow {
  const teamShort = normalizeTeamShort(partial.teamShort);
  const knownTeam = Boolean(teamIdFromShort(teamShort));
  const nameOk =
    Boolean(partial.playerId) ||
    normalizePlayerToken(partial.playerName).length >= 2;

  return {
    rowId: `row-${year}-${rowIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rowIndex,
    displayRank: partial.displayRank ?? null,
    year,
    playerName: partial.playerName.trim(),
    ocrName: partial.ocrName,
    teamShort,
    teamId: teamIdFromShort(teamShort),
    teamName: teamNameFromShort(teamShort),
    playerId: partial.playerId,
    nameStatus:
      partial.nameStatus ?? (nameOk && partial.playerId ? "ok" : "needs_confirm"),
    teamStatus:
      partial.teamStatus ?? (knownTeam ? "ok" : "needs_confirm"),
    nameCandidates: partial.nameCandidates,
    fields: {},
  };
}

/**
 * マージ対象行を探す。
 * - player: 年度+氏名+球団（または playerId / 氏名）。順位番号では照合しない
 * - rowIndex: OCR横スクロール用（画像内の行位置）
 */
function findMergeTargetIndex(
  rows: SeasonBatchPlayerRow[],
  year: number,
  partial: SeasonBatchPartialRow,
  matchBy: "rowIndex" | "player",
): number {
  if (matchBy === "player") {
    const name = normalizePlayerToken(partial.playerName);
    const team = normalizeTeamShort(partial.teamShort);

    // 1. 年度 + 選手名 + 球団
    if (name.length >= 2 && team) {
      const key = playerMatchKey(year, partial.playerName, team);
      const byKey = rows.findIndex(
        (r) => playerMatchKey(r.year, r.playerName, r.teamShort) === key,
      );
      if (byKey >= 0) return byKey;
    }

    // 2. playerId
    if (partial.playerId) {
      const byId = rows.findIndex((r) => r.playerId === partial.playerId);
      if (byId >= 0) return byId;
    }

    // 3. 選手名のみ（球団省略の追加データ向け）
    if (name.length >= 2) {
      const byName = rows.findIndex((r) => {
        const rn = normalizePlayerToken(r.playerName);
        const ocr = normalizePlayerToken(r.ocrName ?? "");
        return (
          rn === name ||
          rn.includes(name) ||
          name.includes(rn) ||
          (ocr && (ocr === name || ocr.includes(name)))
        );
      });
      if (byName >= 0) return byName;
    }

    // 同順位でも別人は新規行。順位／rowIndex では絶対にマージしない
    return -1;
  }

  // ランキング画像: 画像内の行位置で照合（OCR幾何）。順位番号ではない
  return rows.findIndex((r) => r.rowIndex === partial.rowIndex);
}

/** OCR 一括の既定上限。相棒貼り付けは同順位タイで超過しうるため opts で上げる */
export const DEFAULT_SEASON_BATCH_MAX_ROWS = 10;
export const PARTNER_SEASON_BATCH_MAX_ROWS = 40;

/**
 * 複数画像／相棒データのパーシャル行を統合。
 * matchBy: rowIndex（OCR横スクロール） / player（相棒: 年+氏名+球団。順位は使わない）
 */
export function mergePartialRowsIntoSession(
  session: SeasonBatchSession,
  imageId: string,
  partials: SeasonBatchPartialRow[],
  yearOverride?: number,
  opts?: { matchBy?: "rowIndex" | "player"; maxRows?: number },
): SeasonBatchSession {
  const year = yearOverride ?? session.year;
  const matchBy = opts?.matchBy ?? "rowIndex";
  const maxRows = opts?.maxRows ?? DEFAULT_SEASON_BATCH_MAX_ROWS;
  const rows = [...session.rows];

  for (const partial of partials) {
    let idx = findMergeTargetIndex(rows, year, partial, matchBy);

    if (idx < 0) {
      if (rows.length >= maxRows) continue;
      // 新規行の rowIndex はセッション内の連番（表示順位とは独立）
      const nextIndex =
        matchBy === "player"
          ? rows.length
          : partial.rowIndex;
      rows.push(emptyRow(year, nextIndex, partial));
      idx = rows.length - 1;
    }

    const row = { ...rows[idx]! };
    row.year = year;

    if (partial.displayRank != null && Number.isFinite(partial.displayRank)) {
      row.displayRank = partial.displayRank;
    }

    if (partial.ocrName?.trim()) {
      row.ocrName = partial.ocrName.trim();
    }

    const existingConfirmed =
      Boolean(row.playerId) && row.nameStatus === "ok";
    const incomingMatched =
      Boolean(partial.playerId) &&
      (partial.nameStatus === "ok" || partial.nameStatus == null);

    if (existingConfirmed) {
      if (partial.playerId && partial.playerId !== row.playerId) {
        row.nameStatus = "needs_confirm";
        const merged = [
          ...(row.nameCandidates ?? []),
          ...(partial.nameCandidates ?? []),
        ];
        const seen = new Set<string>();
        row.nameCandidates = merged.filter((c) => {
          if (seen.has(c.playerId)) return false;
          seen.add(c.playerId);
          return true;
        });
      } else if (
        (partial.nameCandidates?.length ?? 0) > 0 &&
        !(row.nameCandidates?.length)
      ) {
        row.nameCandidates = partial.nameCandidates;
      }
    } else if (incomingMatched && partial.playerId) {
      row.playerId = partial.playerId;
      row.playerName = partial.playerName.trim() || row.playerName;
      row.nameStatus = "ok";
      row.nameCandidates = partial.nameCandidates ?? row.nameCandidates;
    } else {
      if (partial.playerName.trim()) {
        const preferIncoming =
          !row.playerName.trim() ||
          partial.playerName.trim().length >= row.playerName.trim().length ||
          Boolean(partial.playerId);
        if (preferIncoming) {
          row.playerName = partial.playerName.trim();
        }
      }
      if (partial.playerId && !row.playerId) {
        row.playerId = partial.playerId;
      }
      if (partial.nameCandidates?.length) {
        row.nameCandidates = partial.nameCandidates;
      }
      row.nameStatus =
        partial.nameStatus ?? (row.playerId ? "ok" : "needs_confirm");
    }

    if (partial.teamShort.trim()) {
      const nextTeam = normalizeTeamShort(partial.teamShort);
      if (!row.teamShort || partial.teamStatus === "ok" || !row.teamId) {
        row.teamShort = nextTeam;
        row.teamId = teamIdFromShort(row.teamShort);
        row.teamName = teamNameFromShort(row.teamShort);
        row.teamStatus =
          partial.teamStatus ?? (row.teamId ? "ok" : "needs_confirm");
      }
    }

    const fields = { ...row.fields };
    for (const [fk, cell] of Object.entries(partial.fields)) {
      if (!cell) continue;
      const fieldKey = fk as SeasonBatchFieldKey;
      fields[fieldKey] = mergeCell(fields[fieldKey], cell, imageId);
    }
    row.fields = fields;
    rows[idx] = row;
  }

  rows.sort((a, b) => {
    const ar = a.displayRank ?? a.rowIndex + 1;
    const br = b.displayRank ?? b.rowIndex + 1;
    return ar - br || a.rowIndex - b.rowIndex;
  });
  return { ...session, year, rows: rows.slice(0, maxRows) };
}

export function createEmptySession(
  role: SeasonBatchSession["role"],
  year: number,
): SeasonBatchSession {
  return { role, year, images: [], rows: [] };
}

/** セル表示用クラス判定 */
export function cellNeedsAttention(status: FieldCellStatus): boolean {
  return (
    status === "needs_confirm" ||
    status === "conflict" ||
    status === "invalid"
  );
}

export function rowHasWarnings(row: SeasonBatchPlayerRow): boolean {
  if (rowNameNeedsAttention(row) || rowHasStatWarnings(row)) return true;
  return false;
}

/** 選手名が未照合／要選択（playerId 無しかつ新規登録予定でもない） */
export function rowNameNeedsAttention(row: SeasonBatchPlayerRow): boolean {
  if (row.playerId) return false;
  if (row.pendingNewPlayer) return false;
  return true;
}

/** 成績セルの数値要確認（選手名とは独立） */
export function rowHasStatWarnings(row: SeasonBatchPlayerRow): boolean {
  if (cellNeedsAttention(row.teamStatus)) return true;
  return Object.values(row.fields).some(
    (c) => c && cellNeedsAttention(c.status),
  );
}

export type RowWarningSummary = {
  nameUnresolved: boolean;
  pendingNewPlayer: boolean;
  statLabels: string[];
  /** 確認ダイアログ用の短い理由 */
  reasons: string[];
};

export function summarizeRowWarnings(
  row: SeasonBatchPlayerRow,
  statLabels: string[] = [],
): RowWarningSummary {
  const pendingNewPlayer = Boolean(row.pendingNewPlayer && !row.playerId);
  const nameUnresolved = !row.playerId && !row.pendingNewPlayer;
  const labels =
    statLabels.length > 0
      ? statLabels
      : Object.entries(row.fields)
          .filter(
            ([, c]) =>
              c &&
              (c.status === "needs_confirm" ||
                c.status === "conflict" ||
                c.status === "invalid"),
          )
          .map(([k, c]) => {
            const fromNote = c?.note?.match(/数値要確認:\s*([^\s]+)/)?.[1];
            return fromNote ?? k;
          });
  const reasons: string[] = [];
  if (nameUnresolved) reasons.push("選手マスター未照合");
  if (pendingNewPlayer) reasons.push("新規選手登録予定");
  if (labels.length) reasons.push(`数値要確認: ${labels.join("・")}`);
  return {
    nameUnresolved,
    pendingNewPlayer,
    statLabels: labels,
    reasons,
  };
}

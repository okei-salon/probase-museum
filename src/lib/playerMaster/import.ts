import { upsertPlayerMasterFromImport } from "@/data/playerMaster";
import type { PlayerMasterImportRow } from "@/data/playerMaster/types";

const CSV_HEADERS = [
  "playerId",
  "fullName",
  "gameDisplayName",
  "teamId",
  "teamName",
  "position",
  "uniformNumber",
  "aliases",
  "isRealPlayer",
  "year",
] as const;

export type PlayerMasterImportResult = {
  imported: number;
  upsertedPlayerIds: string[];
  errors: Array<{ index: number; message: string }>;
};

export function importPlayerMastersFromJson(
  raw: string,
  defaultYear?: number,
): PlayerMasterImportResult {
  const parsed = JSON.parse(raw) as
    | PlayerMasterImportRow[]
    | { players: PlayerMasterImportRow[] };

  const rows = Array.isArray(parsed) ? parsed : parsed.players;
  return importPlayerMasterRows(rows, defaultYear);
}

export function importPlayerMastersFromCsv(
  csv: string,
  defaultYear?: number,
): PlayerMasterImportResult {
  const rows = parsePlayerMasterCsv(csv);
  return importPlayerMasterRows(rows, defaultYear);
}

export function importPlayerMasterRows(
  rows: PlayerMasterImportRow[],
  defaultYear?: number,
): PlayerMasterImportResult {
  const upsertedPlayerIds: string[] = [];
  const errors: PlayerMasterImportResult["errors"] = [];

  rows.forEach((row, index) => {
    try {
      assertRequired(row);
      const { master } = upsertPlayerMasterFromImport(row, defaultYear);
      upsertedPlayerIds.push(master.playerId);
    } catch (e) {
      errors.push({
        index,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return {
    imported: upsertedPlayerIds.length,
    upsertedPlayerIds,
    errors,
  };
}

export function parsePlayerMasterCsv(csv: string): PlayerMasterImportRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    return {
      playerId: obj.playerId ?? "",
      fullName: obj.fullName ?? "",
      gameDisplayName: obj.gameDisplayName ?? "",
      teamId: obj.teamId ?? "",
      teamName: obj.teamName ?? "",
      position: obj.position ?? "",
      uniformNumber: obj.uniformNumber || null,
      aliases: obj.aliases || undefined,
      isRealPlayer: obj.isRealPlayer || undefined,
      year: obj.year || undefined,
    } satisfies PlayerMasterImportRow;
  });
}

export function getPlayerMasterCsvTemplateHeader(): string {
  return CSV_HEADERS.join(",");
}

function assertRequired(row: PlayerMasterImportRow) {
  const required = [
    "playerId",
    "fullName",
    "gameDisplayName",
    "teamId",
    "teamName",
    "position",
  ] as const;
  for (const key of required) {
    if (!row[key] || String(row[key]).trim() === "") {
      throw new Error(`Missing required field: ${key}`);
    }
  }
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

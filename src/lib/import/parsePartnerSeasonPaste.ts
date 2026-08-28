/**
 * 相棒（ChatGPT等）が整理した構造化テキストを、年度個人成績バッチへ展開する。
 * OCRは使わない。項目はキー名で1対1マッピング（位置順に依存しない）。
 */

import type {
  SeasonBatchFieldKey,
  SeasonBatchPartialRow,
  SeasonBatchRole,
} from "@/data/import/seasonBatchTypes";
import { DEMO_IMPORT_YEAR } from "@/data/import/demoMode";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import { parseStatToken } from "@/lib/import/parseSeasonRankingOcr";
import { resolveRankingPlayer } from "@/lib/import/resolveRankingPlayer";
import {
  PROSPI_BATTER_SEASON_COLUMNS,
  PROSPI_PITCHER_SEASON_COLUMNS,
} from "@/lib/import/seasonBatchConvert";

export type PartnerPasteType =
  | "BATTER_SEASON"
  | "BATTER_SEASON_APPEND"
  | "PITCHER_SEASON"
  | "PITCHER_SEASON_APPEND"
  | "CATCHER_SEASON"
  | "CATCHER_SEASON_APPEND";

export type PartnerPasteParseResult = {
  year: number;
  type: PartnerPasteType;
  role: SeasonBatchRole;
  mode: "base" | "append";
  rows: SeasonBatchPartialRow[];
  headers: SeasonBatchFieldKey[];
  message: string;
  rawText: string;
};

const BASE_BATTER_FIELDS: SeasonBatchFieldKey[] = [
  "avg",
  "g",
  "pa",
  "ab",
  "h",
  "doubles",
  "triples",
];

type AliasEntry = { keys: string[]; field: SeasonBatchFieldKey };

/** 正式名称を先頭に。略称は互換のため残す */
const BATTER_FIELD_ALIASES: AliasEntry[] = [
  { keys: ["打率", "avg"], field: "avg" },
  { keys: ["試合", "g"], field: "g" },
  { keys: ["打席", "pa"], field: "pa" },
  { keys: ["打数", "ab"], field: "ab" },
  { keys: ["安打", "h"], field: "h" },
  { keys: ["二塁打", "２塁打", "2塁打", "doubles", "2b"], field: "doubles" },
  { keys: ["三塁打", "３塁打", "3塁打", "triples", "3b"], field: "triples" },
  { keys: ["本塁打", "本塁", "hr"], field: "hr" },
  { keys: ["塁打", "tb"], field: "tb" },
  { keys: ["長打率", "slg"], field: "slg" },
  { keys: ["打点", "rbi"], field: "rbi" },
  { keys: ["得点圏打率", "圏打率", "rispAvg"], field: "rispAvg" },
  { keys: ["得点圏打数", "圏打数", "圏打", "rispAb"], field: "rispAb" },
  { keys: ["得点圏安打", "圏安打", "圏安", "rispH"], field: "rispH" },
  { keys: ["得点", "r"], field: "r" },
  { keys: ["四球", "bb"], field: "bb" },
  { keys: ["死球", "hbp"], field: "hbp" },
  { keys: ["犠打", "sac"], field: "sac" },
  { keys: ["犠飛", "sf"], field: "sf" },
  { keys: ["盗塁死", "cs"], field: "cs" },
  { keys: ["盗塁", "sb"], field: "sb" },
  { keys: ["出塁率", "obp"], field: "obp" },
  { keys: ["連続安打", "連続安", "連安", "hitStreak"], field: "hitStreak" },
  {
    keys: ["連続出塁", "連試出", "連続試合出塁", "onBaseStreak"],
    field: "onBaseStreak",
  },
  { keys: ["猛打賞", "multiHit"], field: "multiHit" },
  { keys: ["ops", "OPS", "ＯＰＳ"], field: "ops" },
  {
    keys: ["被盗塁企図数", "被盗塁企図", "被盗企", "csAttempted"],
    field: "csAttempted",
  },
  {
    keys: ["許盗塁数", "許盗塁", "許盗数", "許盗", "csAllowed"],
    field: "csAllowed",
  },
  { keys: ["盗塁刺", "刺", "csCaught"], field: "csCaught" },
  { keys: ["盗塁阻止率", "阻止率", "csRate"], field: "csRate" },
  // 非正式（互換読取のみ。正式テーブルには出さない）
  { keys: ["単打", "singles", "1b"], field: "singles" },
  { keys: ["本打率", "hrRate"], field: "hrRate" },
  { keys: ["得点圏差", "圏差", "rispDiff"], field: "rispDiff" },
  { keys: ["満塁率", "basesLoadedAvg"], field: "basesLoadedAvg" },
  { keys: ["満率差", "basesLoadedDiff"], field: "basesLoadedDiff" },
  { keys: ["満塁数", "満塁打席", "basesLoadedPa"], field: "basesLoadedPa" },
  { keys: ["満塁安打", "満安", "basesLoadedH"], field: "basesLoadedH" },
  { keys: ["三振率", "soRate"], field: "soRate" },
  { keys: ["三振", "so"], field: "so" },
  { keys: ["盗塁率", "sbRate"], field: "sbRate" },
  { keys: ["盗企数", "盗塁企図", "sba"], field: "sba" },
  { keys: ["連続無安打", "連無安", "hitlessStreak"], field: "hitlessStreak" },
];

/** 投手：ゲーム画面ラベルと1対1（長いキーを先に評価） */
const PITCHER_FIELD_ALIASES: AliasEntry[] = [
  { keys: ["防御率", "era"], field: "era" },
  { keys: ["投球回", "ip"], field: "ip" },
  { keys: ["勝率", "winPct"], field: "winPct" },
  { keys: ["勝利", "勝", "w"], field: "w" },
  { keys: ["敗戦", "敗", "l"], field: "l" },
  { keys: ["セーブ", "ＳＶ", "SV", "sv"], field: "sv" },
  { keys: ["HP", "ＨＰ", "hp"], field: "hp" },
  { keys: ["ホールド", "ＨＬＤ", "HLD", "hld"], field: "hld" },
  { keys: ["H", "Ｈ"], field: "hld" },
  { keys: ["登板", "g"], field: "g" },
  { keys: ["先発", "gs"], field: "gs" },
  { keys: ["完封", "sho"], field: "sho" },
  { keys: ["完投", "cg"], field: "cg" },
  { keys: ["QS率", "ＱＳ率", "qsRate"], field: "qsRate" },
  { keys: ["QS", "ＱＳ", "qs"], field: "qs" },
  { keys: ["HQS率", "ＨＱＳ率", "hqsRate"], field: "hqsRate" },
  { keys: ["HQS", "ＨＱＳ", "hqs"], field: "hqs" },
  { keys: ["奪三振率", "soRate"], field: "soRate" },
  { keys: ["奪三振", "so"], field: "so" },
  { keys: ["与四球", "bb"], field: "bb" },
  { keys: ["四球率", "bbRate"], field: "bbRate" },
  { keys: ["与死球", "hbp"], field: "hbp" },
  { keys: ["被本塁打率", "hrRate"], field: "hrRate" },
  { keys: ["被本塁打", "被本", "hr"], field: "hr" },
  { keys: ["被安打"], field: "h" },
  { keys: ["K/BB", "Ｋ/ＢＢ", "kbb"], field: "kbb" },
  { keys: ["WHIP", "ＷＨＩＰ", "whip"], field: "whip" },
  { keys: ["被盗企", "被盗塁企図", "sbAtt"], field: "sbAtt" },
  { keys: ["許盗数", "許盗塁", "許盗", "sbAllowed"], field: "sbAllowed" },
  { keys: ["許盗率", "sbAllowedRate"], field: "sbAllowedRate" },
  { keys: ["暴投", "wp"], field: "wp" },
  { keys: ["失点", "r"], field: "r" },
  { keys: ["自責点", "自責", "er"], field: "er" },
];

const CATCHER_FIELD_ALIASES: AliasEntry[] = [
  { keys: ["試合", "g"], field: "g" },
  {
    keys: ["被盗塁企図数", "被盗塁企図", "被盗企", "csAttempted"],
    field: "csAttempted",
  },
  {
    keys: ["許盗塁数", "許盗塁", "許盗数", "許盗", "csAllowed"],
    field: "csAllowed",
  },
  { keys: ["盗塁刺", "刺", "csCaught"], field: "csCaught" },
  { keys: ["盗塁阻止率", "阻止率", "csRate"], field: "csRate" },
];

function aliasesForRole(role: SeasonBatchRole): AliasEntry[] {
  if (role === "pitcher") return PITCHER_FIELD_ALIASES;
  if (role === "catcher") return CATCHER_FIELD_ALIASES;
  return BATTER_FIELD_ALIASES;
}

function resolveFieldKey(
  label: string,
  role: SeasonBatchRole,
): SeasonBatchFieldKey | null {
  const compact = label.replace(/\s+/g, "").trim();
  if (!compact) return null;
  const aliases = aliasesForRole(role);
  let best: { field: SeasonBatchFieldKey; len: number } | null = null;
  for (const entry of aliases) {
    for (const k of entry.keys) {
      if (k.toLowerCase() === compact.toLowerCase() || compact === k) {
        if (!best || k.length > best.len) {
          best = { field: entry.field, len: k.length };
        }
      }
    }
  }
  return best?.field ?? null;
}

function parseMeta(lines: string[]): {
  year: number | null;
  type: PartnerPasteType | null;
  rest: string[];
} {
  let year: number | null = null;
  let type: PartnerPasteType | null = null;
  const rest: string[] = [];
  for (const line of lines) {
    const mYear = line.match(/^YEAR\s*=\s*(\d{4})\s*$/i);
    if (mYear) {
      year = Number(mYear[1]);
      continue;
    }
    const mType = line.match(/^TYPE\s*=\s*([A-Z0-9_]+)\s*$/i);
    if (mType) {
      type = mType[1]!.toUpperCase() as PartnerPasteType;
      continue;
    }
    rest.push(line);
  }
  return { year, type, rest };
}

function typeToRoleAndMode(
  type: PartnerPasteType,
): { role: SeasonBatchRole; mode: "base" | "append" } {
  if (type.includes("PITCHER")) {
    return {
      role: "pitcher",
      mode: type.includes("APPEND") ? "append" : "base",
    };
  }
  if (type.includes("CATCHER")) {
    return {
      role: "catcher",
      mode: type.includes("APPEND") ? "append" : "base",
    };
  }
  return {
    role: "batter",
    mode: type.includes("APPEND") ? "append" : "base",
  };
}

function cellFromRaw(
  field: SeasonBatchFieldKey,
  raw: string,
  role: SeasonBatchRole,
): SeasonBatchPartialRow["fields"][SeasonBatchFieldKey] {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "—" || trimmed === "-" || trimmed === "－") {
    return { raw: "", value: null, status: "empty" };
  }
  const parsed = parseStatToken(trimmed, field, role);
  const display =
    parsed.value === 0
      ? parsed.display || "0"
      : parsed.display || trimmed;
  return {
    raw: display,
    value: parsed.value,
    status:
      parsed.status === "empty"
        ? "empty"
        : parsed.status === "invalid"
          ? "needs_confirm"
          : parsed.status,
    note: parsed.note,
  };
}

function enrichPartialIdentity(
  partial: SeasonBatchPartialRow,
  year: number,
  role: SeasonBatchRole,
): SeasonBatchPartialRow {
  const affiliationYear = year === DEMO_IMPORT_YEAR ? 2026 : year;
  const resolved = resolveRankingPlayer({
    ocrName: partial.playerName,
    teamShort: partial.teamShort,
    year: affiliationYear,
    role,
  });
  if (resolved.status === "matched" && resolved.playerId) {
    return {
      ...partial,
      ocrName: partial.ocrName || partial.playerName,
      playerName: resolved.displayName,
      playerId: resolved.playerId,
      teamShort: resolved.teamShort || partial.teamShort,
      nameStatus: "ok",
      teamStatus:
        resolved.teamShort || partial.teamShort ? "ok" : "needs_confirm",
      nameCandidates: resolved.candidates.map((c) => ({
        playerId: c.playerId,
        label: c.label,
        teamShort: c.teamShort,
        score: c.score,
      })),
    };
  }
  return {
    ...partial,
    ocrName: partial.ocrName || partial.playerName,
    nameStatus: "needs_confirm",
    teamStatus: partial.teamShort ? "ok" : "needs_confirm",
    nameCandidates: resolved.candidates.map((c) => ({
      playerId: c.playerId,
      label: c.label,
      teamShort: c.teamShort,
      score: c.score,
    })),
  };
}

function parseBaseBatterLine(
  line: string,
  fallbackIndex: number,
): SeasonBatchPartialRow | null {
  const parts = line.split("|").map((p) => p.trim());
  if (parts.length < 4) return null;
  const rank = Number(parts[0]);
  const rowIndex = Number.isFinite(rank) && rank >= 1 ? rank - 1 : fallbackIndex;
  const playerName = parts[1] ?? "";
  const teamShort = normalizeTeamShort(parts[2] ?? "");
  if (!playerName) return null;

  const fields: SeasonBatchPartialRow["fields"] = {};
  for (let i = 0; i < BASE_BATTER_FIELDS.length; i += 1) {
    const field = BASE_BATTER_FIELDS[i]!;
    const raw = parts[3 + i];
    if (raw == null || raw === "") continue;
    fields[field] = cellFromRaw(field, raw, "batter");
  }

  return {
    rowIndex,
    playerName,
    ocrName: playerName,
    teamShort,
    nameStatus: "needs_confirm",
    teamStatus: teamShort ? "ok" : "needs_confirm",
    fields,
  };
}

function parseKeyedLine(
  line: string,
  fallbackIndex: number,
  role: SeasonBatchRole,
): SeasonBatchPartialRow | null {
  const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const rank = Number(parts[0]);
  const rowIndex = Number.isFinite(rank) && rank >= 1 ? rank - 1 : fallbackIndex;
  const playerName = parts[1] ?? "";
  if (!playerName) return null;

  let teamShort = "";
  let fieldStart = 2;
  if (parts[2] && !parts[2].includes("=")) {
    teamShort = normalizeTeamShort(parts[2]);
    fieldStart = 3;
  }

  const fields: SeasonBatchPartialRow["fields"] = {};
  for (let i = fieldStart; i < parts.length; i += 1) {
    const token = parts[i]!;
    const eq = token.indexOf("=");
    if (eq <= 0) continue;
    const label = token.slice(0, eq).trim();
    const raw = token.slice(eq + 1).trim();
    const field = resolveFieldKey(label, role);
    if (!field) continue;
    fields[field] = cellFromRaw(field, raw, role);
  }

  if (Object.keys(fields).length === 0) return null;

  return {
    rowIndex,
    playerName,
    ocrName: playerName,
    teamShort,
    nameStatus: "needs_confirm",
    teamStatus: teamShort ? "ok" : "needs_confirm",
    fields,
  };
}

function defaultHeadersForRole(role: SeasonBatchRole): SeasonBatchFieldKey[] {
  if (role === "pitcher") {
    return PROSPI_PITCHER_SEASON_COLUMNS.map((c) => c.key).filter(
      (k): k is SeasonBatchFieldKey =>
        k !== "playerName" && k !== "teamShort",
    );
  }
  if (role === "catcher") {
    return ["g", "csAttempted", "csAllowed", "csCaught", "csRate"];
  }
  return PROSPI_BATTER_SEASON_COLUMNS.map((c) => c.key).filter(
    (k): k is SeasonBatchFieldKey => k !== "playerName" && k !== "teamShort",
  );
}

/**
 * 相棒データ貼り付けテキストを解析する。
 */
export function parsePartnerSeasonPaste(
  rawText: string,
  fallbackYear: number,
): PartnerPasteParseResult {
  const text = rawText.replace(/^\uFEFF/, "").trim();
  if (!text) {
    throw new Error("貼り付けテキストが空です");
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const { year: metaYear, type: metaType, rest } = parseMeta(lines);
  const year = metaYear ?? fallbackYear;
  const type = metaType ?? "BATTER_SEASON";
  const { role, mode } = typeToRoleAndMode(type);

  const rows: SeasonBatchPartialRow[] = [];

  rest.forEach((line, i) => {
    if (/^YEAR\s*=|^TYPE\s*=/i.test(line)) return;
    const parts = line.split("|").map((p) => p.trim());
    const looksLikeKv = parts.some((p) => p.includes("="));
    const useKeyed =
      role !== "batter" || mode === "append" || looksLikeKv;
    const partial = useKeyed
      ? parseKeyedLine(line, i, role)
      : parseBaseBatterLine(line, i);
    if (!partial) return;
    rows.push(enrichPartialIdentity(partial, year, role));
  });

  if (rows.length === 0) {
    throw new Error(
      "選手行を解析できませんでした。フォーマット（順位|選手名|球団|項目=値|…）を確認してください",
    );
  }

  rows.sort((a, b) => a.rowIndex - b.rowIndex);
  const clipped = rows.slice(0, 10);

  return {
    year,
    type,
    role,
    mode,
    rows: clipped,
    headers: defaultHeadersForRole(role),
    message:
      mode === "append"
        ? `相棒データ（追加）: ${clipped.length}人分の項目を展開しました。既存行へマージし、不一致は要確認になります。`
        : `相棒データ: ${clipped.length}人分を確認表へ展開しました。まだ登録していません。`,
    rawText: text,
  };
}

export const PARTNER_PASTE_EXAMPLE = `YEAR=2000
TYPE=BATTER_SEASON

1|佐藤輝|阪神|打率=.456|試合=52|打席=238|打数=195|安打=89|二塁打=12|三塁打=1|本塁打=22|塁打=169|長打率=.867|打点=56|得点圏打率=.412|得点圏打数=68|得点圏安打=28|得点=48|四球=32|死球=2|犠打=0|犠飛=1|盗塁=11|盗塁死=2|出塁率=.546|連続安打=12|連続出塁=18|猛打賞=8|OPS=1.413|被盗塁企図数=—|許盗塁数=—|盗塁刺=—|盗塁阻止率=—
2|森下|阪神|打率=.360|試合=52|打席=242|打数=200|安打=72|二塁打=14|三塁打=0|本塁打=21|塁打=149|長打率=.745|打点=62|得点圏打率=.380|得点圏打数=50|得点圏安打=19|得点=41|四球=28|死球=1|犠打=0|犠飛=2|盗塁=3|盗塁死=1|出塁率=.445|連続安打=8|連続出塁=14|猛打賞=5|OPS=1.190`;

export const PARTNER_APPEND_EXAMPLE = `YEAR=2000
TYPE=BATTER_SEASON_APPEND

1|佐藤輝|阪神|得点圏打数=68|得点圏安打=28|連続安打=12|盗塁死=2
2|森下|阪神|三塁打=0|本塁打=21|打点=62`;

export const PARTNER_PITCHER_EXAMPLE = `YEAR=2000
TYPE=PITCHER_SEASON

1|村上|阪神|防御率=1.95|投球回=64.2|勝率=.875|勝=7|敗=1|セーブ=0|HP=0|H=0|登板=9|先発=9|完封=1|完投=2|QS=8|QS率=88.9|HQS=5|HQS率=55.6|奪三振=43|奪三振率=5.98|与四球=7|四球率=0.97|与死球=2|被本塁打=3|被本塁打率=0.42|K/BB=6.14|WHIP=0.87|被盗企=5|許盗数=5|許盗率=1.000|暴投=0|失点=14|自責点=14`;

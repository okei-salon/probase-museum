/**
 * 相棒データ貼り付け — メタ行パース共通
 */

export type PartnerTypeId =
  | "BATTER_SEASON"
  | "BATTER_SEASON_APPEND"
  | "PITCHER_SEASON"
  | "PITCHER_SEASON_APPEND"
  | "CATCHER_SEASON"
  | "CATCHER_SEASON_APPEND"
  | "MONTHLY_MVP"
  | "TEAM_STANDINGS"
  | "TEAM_BATTING"
  | "TEAM_PITCHING"
  | "INTERLEAGUE_STANDINGS"
  | "INTERLEAGUE_MATRIX"
  | "TITLE"
  | "AWARD"
  | "BEST_NINE"
  | "GOLD_GLOVE"
  | "SPECIAL_RECORD";

const KNOWN = new Set<string>([
  "BATTER_SEASON",
  "BATTER_SEASON_APPEND",
  "PITCHER_SEASON",
  "PITCHER_SEASON_APPEND",
  "CATCHER_SEASON",
  "CATCHER_SEASON_APPEND",
  "MONTHLY_MVP",
  "TEAM_STANDINGS",
  "TEAM_BATTING",
  "TEAM_PITCHING",
  "INTERLEAGUE_STANDINGS",
  "INTERLEAGUE_MATRIX",
  "TITLE",
  "AWARD",
  "BEST_NINE",
  "GOLD_GLOVE",
  "SPECIAL_RECORD",
]);

export function isKnownPartnerType(type: string): type is PartnerTypeId {
  return KNOWN.has(type.toUpperCase());
}

export function isSeasonPlayerPartnerType(type: string): boolean {
  const t = type.toUpperCase();
  return (
    t.includes("BATTER_SEASON") ||
    t.includes("PITCHER_SEASON") ||
    t.includes("CATCHER_SEASON")
  );
}

export function splitPartnerLines(rawText: string): string[] {
  return rawText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export function parsePartnerMeta(lines: string[]): {
  year: number | null;
  type: string | null;
  month: number | null;
  league: "central" | "pacific" | null;
  category: "batter" | "pitcher" | null;
  title: string | null;
  kv: Record<string, string>;
  rest: string[];
} {
  let year: number | null = null;
  let type: string | null = null;
  let month: number | null = null;
  let league: "central" | "pacific" | null = null;
  let category: "batter" | "pitcher" | null = null;
  let title: string | null = null;
  const kv: Record<string, string> = {};
  const rest: string[] = [];

  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.+)$/i);
    if (!m) {
      rest.push(line);
      continue;
    }
    const key = m[1]!.toUpperCase();
    const val = m[2]!.trim();
    kv[key] = val;

    if (key === "YEAR") {
      const n = Number(val);
      if (Number.isFinite(n)) year = n;
      continue;
    }
    if (key === "TYPE") {
      type = val.toUpperCase();
      continue;
    }
    if (key === "MONTH") {
      const n = Number(val);
      if (Number.isFinite(n)) month = n;
      continue;
    }
    if (key === "LEAGUE") {
      league = parseLeagueToken(val);
      continue;
    }
    if (key === "CATEGORY") {
      const c = val.toUpperCase();
      if (c === "BATTER" || c === "PITCHER") category = c.toLowerCase() as "batter" | "pitcher";
      continue;
    }
    if (key === "TITLE") {
      title = val;
      continue;
    }
    // その他 KEY=VALUE は rest にも残さない（AWARD 行などは kv で使う）
    if (
      key.startsWith("MVP_") ||
      key.startsWith("ROOKIE_") ||
      key === "SAWAMURA" ||
      key === "BATTER" ||
      key === "PITCHER"
    ) {
      continue;
    }
    rest.push(line);
  }

  return { year, type, month, league, category, title, kv, rest };
}

export function parseLeagueToken(
  raw: string,
): "central" | "pacific" | null {
  const t = raw.replace(/\s+/g, "").toUpperCase();
  if (
    t === "CL" ||
    t === "CENTRAL" ||
    t.includes("セ") ||
    t.includes("CENTRAL")
  ) {
    return "central";
  }
  if (
    t === "PL" ||
    t === "PACIFIC" ||
    t.includes("パ") ||
    t.includes("PACIFIC")
  ) {
    return "pacific";
  }
  return null;
}

export function parseNameTeam(token: string): {
  name: string;
  teamShort: string;
} {
  const parts = token.split("|").map((p) => p.trim());
  return {
    name: parts[0] ?? "",
    teamShort: parts[1] ?? "",
  };
}

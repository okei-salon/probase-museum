/**
 * 相棒データ — 月間MVP / チーム / 表彰 / 特別記録パーサー
 */

import type { LeagueSide } from "@/data/awards";
import type { MonthlyMvpImportDraft } from "@/data/import/types";
import { emptyMonthlyMvpDraft } from "@/lib/import/parseMonthlyMvp";
import { resolveImportPlayer } from "@/lib/import/resolveImportPlayer";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import { npbTeams, type TeamId } from "@/data/teams";
import type { StandingEntry } from "@/data/teamStandings";
import type { PennantMatchupDraft } from "@/data/pennantMatchups/types";
import type { TeamStatPartial } from "@/lib/import/parseTeamSeasonOcr";
import { parsePennantMatchupsOcrText } from "@/lib/import/parsePennantMatchupsOcr";
import {
  BATTER_TITLES,
  PITCHER_TITLES,
} from "@/data/titleRankings/defs";
import { ACHIEVEMENT_CATALOG } from "@/data/seasonAchievements/catalog";
import {
  parseLeagueToken,
  parseNameTeam,
  parsePartnerMeta,
  splitPartnerLines,
  type PartnerTypeId,
} from "./meta";
import { resolvePartnerPlayer } from "./resolvePlayer";
import {
  parseTeamFieldValue,
  resolveTeamBattingField,
  resolveTeamPitchingField,
} from "./fieldLabels";
import type { AnnualAwardKind } from "@/lib/sop/rules";

export type PartnerMonthlyMvpResult = {
  kind: "monthly_mvp";
  type: "MONTHLY_MVP";
  year: number;
  month: number;
  drafts: MonthlyMvpImportDraft[];
  message: string;
};

export type PartnerStandingsResult = {
  kind: "team_standings";
  type: "TEAM_STANDINGS";
  year: number;
  league: "central" | "pacific" | null;
  central: StandingEntry[];
  pacific: StandingEntry[];
  message: string;
};

export type PartnerInterleagueStandingsResult = {
  kind: "interleague_standings";
  type: "INTERLEAGUE_STANDINGS";
  year: number;
  rows: StandingEntry[];
  message: string;
};

export type PartnerInterleagueMatrixResult = {
  kind: "interleague_matrix";
  type: "INTERLEAGUE_MATRIX";
  year: number;
  rowTeams: string[];
  colTeams: string[];
  cells: string[][];
  message: string;
};

export type PartnerTeamMatchupsResult = {
  kind: "team_matchups";
  type: "TEAM_MATCHUPS";
  year: number;
  league: "central" | "pacific";
  cards: PennantMatchupDraft[];
  message: string;
};

export type PartnerTeamStatsResult = {
  kind: "team_batting" | "team_pitching";
  type: "TEAM_BATTING" | "TEAM_PITCHING";
  year: number;
  rows: TeamStatPartial[];
  message: string;
};

export type PartnerTitleEntry = {
  rank: number;
  league: LeagueSide;
  name: string;
  teamShort: string;
  valueText: string;
  playerId: string | null;
  displayName: string;
  status: "matched" | "needs_confirm" | "unknown";
};

export type PartnerTitleResult = {
  kind: "title";
  type: "TITLE";
  year: number;
  category: "batter" | "pitcher";
  titleId: string;
  titleLabel: string;
  entries: PartnerTitleEntry[];
  message: string;
};

export type PartnerAwardSlot = {
  key: string;
  kind: AnnualAwardKind;
  league?: LeagueSide;
  name: string;
  teamShort: string;
  playerId: string | null;
  displayName: string;
  status: "matched" | "needs_confirm" | "unknown";
};

export type PartnerAwardResult = {
  kind: "award";
  type: "AWARD";
  year: number;
  slots: PartnerAwardSlot[];
  message: string;
};

export type PartnerPositionEntry = {
  position: string;
  name: string;
  teamShort: string;
  playerId: string | null;
  displayName: string;
  status: "matched" | "needs_confirm" | "unknown";
};

export type PartnerPositionAwardResult = {
  kind: "best_nine" | "gold_glove";
  type: "BEST_NINE" | "GOLD_GLOVE";
  year: number;
  league: LeagueSide;
  entries: PartnerPositionEntry[];
  message: string;
};

export type PartnerSpecialEntry = {
  recordType: string;
  recordName: string;
  name: string;
  teamShort: string;
  value: number | null;
  playerId: string | null;
  displayName: string;
  status: "matched" | "needs_confirm" | "unknown";
};

export type PartnerSpecialResult = {
  kind: "special_record";
  type: "SPECIAL_RECORD";
  year: number;
  entries: PartnerSpecialEntry[];
  message: string;
};

export type PartnerUnsupportedResult = {
  kind: "unsupported";
  type: string | null;
  message: string;
};

function teamIdOf(short: string): TeamId | undefined {
  return npbTeams.find((t) => t.short === normalizeTeamShort(short))?.id;
}

function buildMvpSide(
  year: number,
  month: number,
  league: LeagueSide,
  batterRaw: string,
  pitcherRaw: string,
): MonthlyMvpImportDraft {
  const draft = emptyMonthlyMvpDraft();
  draft.year = year;
  draft.month = month;
  draft.league = league;
  draft.rawText = `partner MONTHLY_MVP ${year}/${month} ${league}`;
  draft.confidence = "high";

  const b = parseNameTeam(batterRaw);
  const p = parseNameTeam(pitcherRaw);

  draft.batter.gameDisplayName = b.name;
  draft.batter.teamName = normalizeTeamShort(b.teamShort);
  const br = resolveImportPlayer({
    gameDisplayName: b.name,
    team: draft.batter.teamName,
    year,
    role: "batter",
  });
  draft.batter.playerRef = br.playerRef;
  draft.batter.resolvedName = br.displayName;

  draft.pitcher.gameDisplayName = p.name;
  draft.pitcher.teamName = normalizeTeamShort(p.teamShort);
  const pr = resolveImportPlayer({
    gameDisplayName: p.name,
    team: draft.pitcher.teamName,
    year,
    role: "pitcher",
  });
  draft.pitcher.playerRef = pr.playerRef;
  draft.pitcher.resolvedName = pr.displayName;

  return draft;
}

export function parseMonthlyMvpPartner(
  rawText: string,
  fallbackYear: number,
): PartnerMonthlyMvpResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const month = meta.month;
  if (month == null || month < 4 || month > 9) {
    throw new Error("MONTH=4〜9 を指定してください");
  }

  // ブロック分割: LEAGUE= 行で区切る
  const blocks: Array<{
    league: LeagueSide;
    batter?: string;
    pitcher?: string;
  }> = [];
  let current: {
    league: LeagueSide;
    batter?: string;
    pitcher?: string;
  } | null = null;

  for (const line of lines) {
    const mLeague = line.match(/^LEAGUE\s*=\s*(.+)$/i);
    if (mLeague) {
      const league = parseLeagueToken(mLeague[1]!);
      if (!league) continue;
      if (current) blocks.push(current);
      current = { league };
      continue;
    }
    const mBatter = line.match(/^BATTER\s*=\s*(.+)$/i);
    if (mBatter && current) {
      current.batter = mBatter[1]!.trim();
      continue;
    }
    const mPitcher = line.match(/^PITCHER\s*=\s*(.+)$/i);
    if (mPitcher && current) {
      current.pitcher = mPitcher[1]!.trim();
      continue;
    }
  }
  if (current) blocks.push(current);

  if (blocks.length === 0) {
    throw new Error("LEAGUE=CL / LEAGUE=PL ブロックが見つかりません");
  }

  const drafts = blocks.map((b) =>
    buildMvpSide(
      year,
      month,
      b.league,
      b.batter ?? "",
      b.pitcher ?? "",
    ),
  );

  return {
    kind: "monthly_mvp",
    type: "MONTHLY_MVP",
    year,
    month,
    drafts,
    message: `月間MVP ${year}年${month}月: ${drafts.length}リーグ分を確認画面へ展開しました（未登録）`,
  };
}

export function parseTeamStandingsPartner(
  rawText: string,
  fallbackYear: number,
): PartnerStandingsResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const leagueHint = meta.league;

  const rows: StandingEntry[] = [];
  for (const line of meta.rest) {
    if (/^(YEAR|TYPE|LEAGUE)\s*=/i.test(line)) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 4) continue;
    const rank = Number(parts[0]);
    const teamShort = normalizeTeamShort(parts[1] ?? "");
    if (!teamShort || !Number.isFinite(rank)) continue;
    const w = Number(parts[2]) || 0;
    const l = Number(parts[3]) || 0;
    const d = Number(parts[4]) || 0;
    const pct = parts[5] || ".000";
    const gb = parts[6] || "—";
    rows.push({
      rank,
      team: teamShort,
      teamId: teamIdOf(teamShort),
      w,
      l,
      d,
      pct,
      gb: gb === "-" ? "—" : gb,
    });
  }

  if (rows.length === 0) {
    throw new Error("順位行（順位|球団|勝|敗|引分|勝率|ゲーム差）が見つかりません");
  }

  const sorted = [...rows].sort((a, b) => a.rank - b.rank).slice(0, 6);
  const central =
    leagueHint === "pacific" ? [] : leagueHint === "central" ? sorted : sorted;
  const pacific = leagueHint === "pacific" ? sorted : [];

  // LEAGUE未指定で12行ある場合は前半セ・後半パとみなす
  let c = central;
  let p = pacific;
  if (!leagueHint && rows.length > 6) {
    const all = [...rows].sort((a, b) => a.rank - b.rank);
    c = all.slice(0, 6);
    p = all.slice(6, 12).map((r, i) => ({ ...r, rank: i + 1 }));
  } else if (!leagueHint) {
    c = sorted;
    p = [];
  }

  return {
    kind: "team_standings",
    type: "TEAM_STANDINGS",
    year,
    league: leagueHint,
    central: c,
    pacific: p,
    message: `チーム順位 ${year}: ${c.length + p.length}球団を確認表へ展開しました（未登録）`,
  };
}

/**
 * 交流戦12球団順位。行フォーマットは TEAM_STANDINGS と同型
 * （順位|球団|勝|敗|引分|勝率|ゲーム差）。
 */
export function parseInterleagueStandingsPartner(
  rawText: string,
  fallbackYear: number,
): PartnerInterleagueStandingsResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const rows: StandingEntry[] = [];
  for (const line of meta.rest) {
    if (/^(YEAR|TYPE|LEAGUE|ROWS|COLS)\s*=/i.test(line)) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 4) continue;
    const rank = Number(parts[0]);
    const teamShort = normalizeTeamShort(parts[1] ?? "");
    if (!teamShort || !Number.isFinite(rank)) continue;
    rows.push({
      rank,
      team: teamShort,
      teamId: teamIdOf(teamShort),
      w: Number(parts[2]) || 0,
      l: Number(parts[3]) || 0,
      d: Number(parts[4]) || 0,
      pct: parts[5] || ".000",
      gb: (parts[6] || "—") === "-" ? "—" : parts[6] || "—",
    });
  }
  if (rows.length === 0) {
    throw new Error(
      "交流戦順位行（順位|球団|勝|敗|引分|勝率|ゲーム差）が見つかりません",
    );
  }
  const sorted = [...rows].sort((a, b) => a.rank - b.rank).slice(0, 12);
  return {
    kind: "interleague_standings",
    type: "INTERLEAGUE_STANDINGS",
    year,
    rows: sorted,
    message: `交流戦順位 ${year}: ${sorted.length}球団を確認表へ展開しました（未登録）`,
  };
}

/**
 * 交流戦対戦表。
 * ROWS=セ球団カンマ区切り
 * COLS=パ球団カンマ区切り
 * 行球団|列球団=勝-敗 または 勝-敗-分
 */
export function parseInterleagueMatrixPartner(
  rawText: string,
  fallbackYear: number,
): PartnerInterleagueMatrixResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const centralDefault = npbTeams
    .filter((t) => t.league === "セ")
    .map((t) => t.short);
  const pacificDefault = npbTeams
    .filter((t) => t.league === "パ")
    .map((t) => t.short);
  const rowTeams = (meta.kv.ROWS ?? "")
    .split(/[,、]/)
    .map((s) => normalizeTeamShort(s.trim()))
    .filter(Boolean);
  const colTeams = (meta.kv.COLS ?? "")
    .split(/[,、]/)
    .map((s) => normalizeTeamShort(s.trim()))
    .filter(Boolean);
  const rows = rowTeams.length ? rowTeams : centralDefault;
  const cols = colTeams.length ? colTeams : pacificDefault;
  const cells = rows.map(() => cols.map(() => "0-0"));

  for (const line of meta.rest) {
    if (/^(YEAR|TYPE|ROWS|COLS)\s*=/i.test(line)) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const left = line.slice(0, eq).trim();
    const right = line.slice(eq + 1).trim();
    const parts = left.split("|").map((p) => p.trim());
    if (parts.length < 2) continue;
    const ri = rows.indexOf(normalizeTeamShort(parts[0]!));
    const ci = cols.indexOf(normalizeTeamShort(parts[1]!));
    if (ri < 0 || ci < 0) continue;
    cells[ri]![ci] = right || "0-0";
  }

  return {
    kind: "interleague_matrix",
    type: "INTERLEAGUE_MATRIX",
    year,
    rowTeams: rows,
    colTeams: cols,
    cells,
    message: `交流戦対戦表 ${year}: ${rows.length}×${cols.length} を確認表へ展開しました（未登録）`,
  };
}

/**
 * リーグ内対戦表。
 * LEAGUE=CL|PL
 * 行: 阪神|中日=14-11-0 または 阪神 vs 中日|14勝11敗0分
 */
export function parseTeamMatchupsPartner(
  rawText: string,
  fallbackYear: number,
): PartnerTeamMatchupsResult | PartnerUnsupportedResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const league = meta.league;
  if (!league) {
    return {
      kind: "unsupported",
      type: "TEAM_MATCHUPS",
      message: "対戦表は LEAGUE=CL または LEAGUE=PL を指定してください",
    };
  }
  const body = meta.rest.join("\n");
  const cards = parsePennantMatchupsOcrText(body, league);
  const label = league === "central" ? "セ" : "パ";
  return {
    kind: "team_matchups",
    type: "TEAM_MATCHUPS",
    year,
    league,
    cards,
    message: `対戦表 ${year} ${label}: ${cards.length}カードを確認表へ展開しました（未登録）`,
  };
}

function parseTeamKvLine(
  line: string,
  kind: "batting" | "pitching",
): TeamStatPartial | null {
  const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const teamShort = normalizeTeamShort(parts[0] ?? "");
  if (!teamShort) return null;
  const fields: TeamStatPartial["fields"] = {};
  for (let i = 1; i < parts.length; i += 1) {
    const token = parts[i]!;
    const eq = token.indexOf("=");
    if (eq <= 0) continue;
    const label = token.slice(0, eq).trim();
    const raw = token.slice(eq + 1).trim();
    const field =
      kind === "batting"
        ? resolveTeamBattingField(label)
        : resolveTeamPitchingField(label);
    if (!field) continue;
    fields[field] = parseTeamFieldValue(field, raw);
  }
  if (Object.keys(fields).length === 0) return null;
  return {
    teamShort,
    teamId: teamIdOf(teamShort),
    fields,
  };
}

export function parseTeamStatsPartner(
  rawText: string,
  fallbackYear: number,
  kind: "batting" | "pitching",
): PartnerTeamStatsResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const rows: TeamStatPartial[] = [];
  for (const line of meta.rest) {
    if (/^(YEAR|TYPE|LEAGUE)\s*=/i.test(line)) continue;
    const row = parseTeamKvLine(line, kind);
    if (row) rows.push(row);
  }
  if (rows.length === 0) {
    throw new Error(
      kind === "batting"
        ? "チーム打撃行（球団|打率=…|試合=…）が見つかりません"
        : "チーム投手行（球団|防御率=…|…）が見つかりません",
    );
  }
  return {
    kind: kind === "batting" ? "team_batting" : "team_pitching",
    type: kind === "batting" ? "TEAM_BATTING" : "TEAM_PITCHING",
    year,
    rows,
    message: `チーム${kind === "batting" ? "打撃" : "投手"} ${year}: ${rows.length}球団を確認表へ展開しました（未登録）`,
  };
}

function resolveTitleId(
  category: "batter" | "pitcher",
  titleRaw: string,
): { id: string; label: string } {
  const list = category === "batter" ? BATTER_TITLES : PITCHER_TITLES;
  const compact = titleRaw.replace(/\s+/g, "");
  const byLabel = list.find(
    (t) => t.label === titleRaw || t.label.replace(/\s+/g, "") === compact,
  );
  if (byLabel) return { id: byLabel.id, label: byLabel.label };
  const byId = list.find((t) => t.id === titleRaw || t.id === compact);
  if (byId) return { id: byId.id, label: byId.label };
  // 別名
  const aliases: Record<string, string> = {
    本塁打: "hr",
    打率: "avg",
    打点: "rbi",
    安打: "h",
    盗塁: "sb",
    出塁率: "obp",
    防御率: "era",
    勝利: "w",
    勝: "w",
    奪三振: "so",
    セーブ: "sv",
    ホールド: "hp",
    勝率: "winPct",
    完封: "sho",
    完投: "cg",
    投球回: "ip",
    登板: "g",
  };
  const aid = aliases[compact];
  if (aid) {
    const t = list.find((x) => x.id === aid);
    if (t) return { id: t.id, label: t.label };
  }
  throw new Error(
    `未対応のタイトル「${titleRaw}」です（野手14／投手15部門の名称を指定）`,
  );
}

export function parseTitlePartner(
  rawText: string,
  fallbackYear: number,
): PartnerTitleResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const category = meta.category ?? "batter";
  if (!meta.title) throw new Error("TITLE=本塁打 などを指定してください");
  const { id: titleId, label: titleLabel } = resolveTitleId(
    category,
    meta.title,
  );

  const entries: PartnerTitleEntry[] = [];
  let league: LeagueSide = "central";
  for (const line of meta.rest) {
    if (/^CL$/i.test(line) || /^セ/.test(line)) {
      league = "central";
      continue;
    }
    if (/^PL$/i.test(line) || /^パ/.test(line)) {
      league = "pacific";
      continue;
    }
    if (/^(YEAR|TYPE|CATEGORY|TITLE|LEAGUE)\s*=/i.test(line)) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 3) continue;
    const rank = Number(parts[0]);
    if (!Number.isFinite(rank) || rank < 1 || rank > 5) continue;
    const name = parts[1] ?? "";
    const teamShort = normalizeTeamShort(parts[2] ?? "");
    const valueText = parts[3] ?? "";
    const resolved = resolvePartnerPlayer({
      name,
      teamShort,
      year,
      role: category,
    });
    entries.push({
      rank,
      league,
      name,
      teamShort,
      valueText,
      playerId: resolved.playerId,
      displayName: resolved.displayName,
      status: resolved.status,
    });
  }

  if (entries.length === 0) {
    throw new Error("タイトル順位行（順位|選手|球団|値）が見つかりません");
  }

  return {
    kind: "title",
    type: "TITLE",
    year,
    category,
    titleId,
    titleLabel,
    entries,
    message: `${titleLabel} ${year}: ${entries.length}件を確認表へ展開しました（未登録）`,
  };
}

export function parseAwardPartner(
  rawText: string,
  fallbackYear: number,
): PartnerAwardResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const slots: PartnerAwardSlot[] = [];

  const mapping: Array<{
    key: string;
    kind: AnnualAwardKind;
    league?: LeagueSide;
    role: "batter" | "pitcher";
  }> = [
    { key: "MVP_CL", kind: "mvp", league: "central", role: "batter" },
    { key: "MVP_PL", kind: "mvp", league: "pacific", role: "batter" },
    { key: "ROOKIE_CL", kind: "rookie", league: "central", role: "batter" },
    { key: "ROOKIE_PL", kind: "rookie", league: "pacific", role: "batter" },
    { key: "SAWAMURA", kind: "sawamura", role: "pitcher" },
    { key: "SAWAMURA_CL", kind: "sawamura", league: "central", role: "pitcher" },
    { key: "SAWAMURA_PL", kind: "sawamura", league: "pacific", role: "pitcher" },
  ];

  for (const m of mapping) {
    const raw = meta.kv[m.key];
    if (!raw) continue;
    const { name, teamShort } = parseNameTeam(raw);
    const resolved = resolvePartnerPlayer({
      name,
      teamShort: normalizeTeamShort(teamShort),
      year,
      role: m.role,
    });
    slots.push({
      key: m.key,
      kind: m.kind,
      league: m.league,
      name,
      teamShort: resolved.teamShort,
      playerId: resolved.playerId,
      displayName: resolved.displayName,
      status: resolved.status,
    });
  }

  if (slots.length === 0) {
    throw new Error(
      "MVP_CL / MVP_PL / ROOKIE_CL / ROOKIE_PL / SAWAMURA のいずれかを指定してください",
    );
  }

  return {
    kind: "award",
    type: "AWARD",
    year,
    slots,
    message: `年間表彰 ${year}: ${slots.length}件を確認表へ展開しました（未登録）`,
  };
}

const POSITION_ALIASES: Record<string, string> = {
  投手: "投手",
  捕手: "捕手",
  一塁手: "一塁手",
  一塁: "一塁手",
  二塁手: "二塁手",
  二塁: "二塁手",
  三塁手: "三塁手",
  三塁: "三塁手",
  遊撃手: "遊撃手",
  遊撃: "遊撃手",
  外野手: "外野手",
  外野手1: "外野手",
  外野手2: "外野手",
  外野手3: "外野手",
  外野1: "外野手",
  外野2: "外野手",
  外野3: "外野手",
};

export function parsePositionAwardPartner(
  rawText: string,
  fallbackYear: number,
  type: "BEST_NINE" | "GOLD_GLOVE",
): PartnerPositionAwardResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const league = meta.league ?? "central";
  const entries: PartnerPositionEntry[] = [];

  for (const line of meta.rest) {
    if (/^(YEAR|TYPE|LEAGUE)\s*=/i.test(line)) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 2) continue;
    const posRaw = parts[0]!;
    const position = POSITION_ALIASES[posRaw] ?? POSITION_ALIASES[posRaw.replace(/\s+/g, "")] ?? posRaw;
    const name = parts[1] ?? "";
    const teamShort = normalizeTeamShort(parts[2] ?? "");
    const role = position === "投手" ? "pitcher" : "batter";
    const resolved = resolvePartnerPlayer({ name, teamShort, year, role });
    entries.push({
      position,
      name,
      teamShort,
      playerId: resolved.playerId,
      displayName: resolved.displayName,
      status: resolved.status,
    });
  }

  if (entries.length === 0) {
    throw new Error("守備位置|選手|球団 の行が見つかりません");
  }

  return {
    kind: type === "BEST_NINE" ? "best_nine" : "gold_glove",
    type,
    year,
    league,
    entries,
    message: `${type === "BEST_NINE" ? "ベストナイン" : "ゴールデングラブ"} ${year}: ${entries.length}件を確認表へ展開しました（未登録）`,
  };
}

function matchRecordName(name: string): {
  recordType: string;
  recordName: string;
} | null {
  const compact = name.replace(/\s+/g, "");
  const hit = ACHIEVEMENT_CATALOG.find(
    (c) =>
      c.needsManual &&
      (c.recordName === name ||
        c.recordName.replace(/\s+/g, "") === compact ||
        c.recordType === name),
  );
  return hit
    ? { recordType: hit.recordType, recordName: hit.recordName }
    : null;
}

export function parseSpecialRecordPartner(
  rawText: string,
  fallbackYear: number,
): PartnerSpecialResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const entries: PartnerSpecialEntry[] = [];

  for (const line of meta.rest) {
    if (/^(YEAR|TYPE)\s*=/i.test(line)) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 2) continue;
    const rec = matchRecordName(parts[0]!);
    if (!rec) continue;
    const name = parts[1] ?? "";
    const teamShort = normalizeTeamShort(parts[2] ?? "");
    let value: number | null = null;
    if (parts[3]) {
      const n = Number(parts[3].replace(/[^\d.]/g, ""));
      if (Number.isFinite(n)) value = n;
    }
    const cat = ACHIEVEMENT_CATALOG.find((c) => c.recordType === rec.recordType);
    const role =
      rec.recordType.includes("hit") ||
      rec.recordType === "cycle" ||
      rec.recordType.includes("hr") ||
      rec.recordType.includes("on_base")
        ? "batter"
        : cat?.recordType === "perfect_game" ||
            cat?.recordType === "no_hitter" ||
            cat?.recordType === "scoreless_ip" ||
            cat?.recordType === "win_streak" ||
            cat?.recordType === "game_so"
          ? "pitcher"
          : "batter";
    const resolved = resolvePartnerPlayer({
      name,
      teamShort,
      year,
      role,
    });
    entries.push({
      recordType: rec.recordType,
      recordName: rec.recordName,
      name,
      teamShort,
      value,
      playerId: resolved.playerId,
      displayName: resolved.displayName,
      status: resolved.status,
    });
  }

  if (entries.length === 0) {
    throw new Error(
      "特別記録行（記録名|選手|球団|値）が見つかりません。記録名はカタログと一致させてください",
    );
  }

  return {
    kind: "special_record",
    type: "SPECIAL_RECORD",
    year,
    entries,
    message: `特別記録 ${year}: ${entries.length}件を確認表へ展開しました（未登録）`,
  };
}

function resolvePostseasonTeam(token: string): {
  name: string;
  id: TeamId | null;
} {
  const short = normalizeTeamShort(token);
  const hit =
    npbTeams.find((t) => t.short === short) ??
    npbTeams.find((t) => t.name === token.trim()) ??
    npbTeams.find((t) => t.id === token.trim());
  return {
    name: hit?.short ?? (short || token.trim()),
    id: (hit?.id as TeamId | undefined) ?? null,
  };
}

function parseGameScoreLines(
  kv: Record<string, string>,
): Array<{ game: number; scoreA: number; scoreB: number }> {
  const games: Array<{ game: number; scoreA: number; scoreB: number }> = [];
  for (let i = 1; i <= 7; i++) {
    const raw =
      kv[`GAME${i}`] ?? kv[`G${i}`] ?? kv[`第${i}戦`] ?? kv[`GAME_${i}`];
    if (!raw) continue;
    const m = String(raw)
      .trim()
      .match(/^(\d+)\s*[-－—:]\s*(\d+)$/);
    if (!m) continue;
    games.push({
      game: i,
      scoreA: Number(m[1]),
      scoreB: Number(m[2]),
    });
  }
  return games;
}

export type PartnerClimaxSeriesResult = {
  kind: "climax_series";
  type: "CLIMAX_SERIES";
  year: number;
  world: "BLUE" | "RED" | null;
  league: "central" | "pacific";
  stage: "first" | "final";
  teamA: string;
  teamAId: TeamId | null;
  teamB: string;
  teamBId: TeamId | null;
  winsA: number;
  winsB: number;
  winner: string;
  winnerId: TeamId | null;
  games: Array<{ game: number; scoreA: number; scoreB: number }>;
  advantageTeam: string | null;
  advantageTeamId: TeamId | null;
  advantageWins: number;
  message: string;
};

export function parseClimaxSeriesPartner(
  rawText: string,
  fallbackYear: number,
): PartnerClimaxSeriesResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const worldRaw = (meta.kv.WORLD ?? "").toUpperCase();
  const world =
    worldRaw === "BLUE" || worldRaw === "RED" ? worldRaw : null;
  const leagueToken = (meta.kv.LEAGUE ?? "").toLowerCase();
  const league: "central" | "pacific" =
    parseLeagueToken(meta.kv.LEAGUE ?? "") ??
    (leagueToken.includes("p") ||
    leagueToken.includes("パ") ||
    leagueToken.includes("pacific")
      ? "pacific"
      : "central");
  const stageRaw = (meta.kv.STAGE ?? meta.kv.ROUND ?? "first").toLowerCase();
  const stage: "first" | "final" =
    stageRaw.includes("final") || stageRaw.includes("ファイナル")
      ? "final"
      : "first";

  const teamA = resolvePostseasonTeam(
    meta.kv.TEAM_A ?? meta.kv.TEAMA ?? meta.kv.HOME ?? "",
  );
  const teamB = resolvePostseasonTeam(
    meta.kv.TEAM_B ?? meta.kv.TEAMB ?? meta.kv.AWAY ?? "",
  );
  if (!teamA.name || !teamB.name) {
    throw new Error("CLIMAX_SERIES: TEAM_A / TEAM_B が必要です");
  }

  const games = parseGameScoreLines(meta.kv);
  const winsA = Number(meta.kv.WINS_A ?? meta.kv.WIN_A ?? NaN);
  const winsB = Number(meta.kv.WINS_B ?? meta.kv.WIN_B ?? NaN);
  const derivedWinsA = Number.isFinite(winsA)
    ? winsA
    : games.filter((g) => g.scoreA > g.scoreB).length;
  const derivedWinsB = Number.isFinite(winsB)
    ? winsB
    : games.filter((g) => g.scoreB > g.scoreA).length;

  const winnerToken = meta.kv.WINNER ?? meta.kv.ADVANCE ?? "";
  const winnerResolved = winnerToken
    ? resolvePostseasonTeam(winnerToken)
    : derivedWinsA >= derivedWinsB
      ? teamA
      : teamB;

  const advToken =
    meta.kv.ADVANTAGE_TEAM ?? meta.kv.ADV_TEAM ?? meta.kv.ADVANTAGE ?? "";
  const adv = advToken ? resolvePostseasonTeam(advToken) : null;
  const advantageWins = Number(
    meta.kv.ADVANTAGE_WINS ?? meta.kv.ADV_WINS ?? (adv ? 1 : 0),
  );

  return {
    kind: "climax_series",
    type: "CLIMAX_SERIES",
    year,
    world,
    league,
    stage,
    teamA: teamA.name,
    teamAId: teamA.id,
    teamB: teamB.name,
    teamBId: teamB.id,
    winsA: derivedWinsA,
    winsB: derivedWinsB,
    winner: winnerResolved.name,
    winnerId: winnerResolved.id,
    games,
    advantageTeam: adv?.name ?? null,
    advantageTeamId: adv?.id ?? null,
    advantageWins: Number.isFinite(advantageWins) ? advantageWins : 0,
    message: `クライマックスシリーズ ${year} ${league} ${stage}: ${teamA.name} vs ${teamB.name}`,
  };
}

export type PartnerJapanSeriesResult = {
  kind: "japan_series";
  type: "JAPAN_SERIES";
  year: number;
  world: "BLUE" | "RED" | null;
  teamLeft: string;
  teamLeftId: TeamId | null;
  teamRight: string;
  teamRightId: TeamId | null;
  winsLeft: number;
  winsRight: number;
  games: Array<{ game: number; scoreA: number; scoreB: number }>;
  champion: string;
  championId: TeamId | null;
  mvpName: string;
  mvpTeam: string;
  mvpTeamId: TeamId | null;
  mvpAvg: string | null;
  mvpHr: number | null;
  mvpRbi: number | null;
  mvpNote: string | null;
  message: string;
};

export function parseJapanSeriesPartner(
  rawText: string,
  fallbackYear: number,
): PartnerJapanSeriesResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const year = meta.year ?? fallbackYear;
  const worldRaw = (meta.kv.WORLD ?? "").toUpperCase();
  const world =
    worldRaw === "BLUE" || worldRaw === "RED" ? worldRaw : null;

  const teamLeft = resolvePostseasonTeam(
    meta.kv.TEAM_CENTRAL ??
      meta.kv.CENTRAL ??
      meta.kv.TEAM_LEFT ??
      meta.kv.TEAM_A ??
      "",
  );
  const teamRight = resolvePostseasonTeam(
    meta.kv.TEAM_PACIFIC ??
      meta.kv.PACIFIC ??
      meta.kv.TEAM_RIGHT ??
      meta.kv.TEAM_B ??
      "",
  );
  if (!teamLeft.name || !teamRight.name) {
    throw new Error(
      "JAPAN_SERIES: TEAM_CENTRAL（セ代表）/ TEAM_PACIFIC（パ代表）が必要です",
    );
  }

  const games = parseGameScoreLines(meta.kv);
  const winsLeft = Number(
    meta.kv.WINS_CENTRAL ?? meta.kv.WINS_LEFT ?? meta.kv.WINS_A ?? NaN,
  );
  const winsRight = Number(
    meta.kv.WINS_PACIFIC ?? meta.kv.WINS_RIGHT ?? meta.kv.WINS_B ?? NaN,
  );
  const derivedLeft = Number.isFinite(winsLeft)
    ? winsLeft
    : games.filter((g) => g.scoreA > g.scoreB).length;
  const derivedRight = Number.isFinite(winsRight)
    ? winsRight
    : games.filter((g) => g.scoreB > g.scoreA).length;

  const champToken = meta.kv.CHAMPION ?? meta.kv.WINNER ?? "";
  const champ = champToken
    ? resolvePostseasonTeam(champToken)
    : derivedLeft >= derivedRight
      ? teamLeft
      : teamRight;

  const mvpTeam = resolvePostseasonTeam(
    meta.kv.MVP_TEAM ?? meta.kv.MVP_TEAM_NAME ?? champ.name,
  );
  const mvpHr = Number(meta.kv.MVP_HR ?? meta.kv.HR ?? NaN);
  const mvpRbi = Number(meta.kv.MVP_RBI ?? meta.kv.RBI ?? NaN);

  return {
    kind: "japan_series",
    type: "JAPAN_SERIES",
    year,
    world,
    teamLeft: teamLeft.name,
    teamLeftId: teamLeft.id,
    teamRight: teamRight.name,
    teamRightId: teamRight.id,
    winsLeft: derivedLeft,
    winsRight: derivedRight,
    games,
    champion: champ.name,
    championId: champ.id,
    mvpName: meta.kv.MVP ?? meta.kv.MVP_NAME ?? "登録待ち",
    mvpTeam: mvpTeam.name,
    mvpTeamId: mvpTeam.id,
    mvpAvg: meta.kv.MVP_AVG ?? meta.kv.AVG ?? null,
    mvpHr: Number.isFinite(mvpHr) ? mvpHr : null,
    mvpRbi: Number.isFinite(mvpRbi) ? mvpRbi : null,
    mvpNote: meta.kv.MVP_NOTE ?? meta.kv.NOTE ?? null,
    message: `日本シリーズ ${year}: ${teamLeft.name} vs ${teamRight.name}`,
  };
}

export type PartnerNonSeasonResult =
  | PartnerMonthlyMvpResult
  | PartnerStandingsResult
  | PartnerInterleagueStandingsResult
  | PartnerInterleagueMatrixResult
  | PartnerTeamMatchupsResult
  | PartnerTeamStatsResult
  | PartnerTitleResult
  | PartnerAwardResult
  | PartnerPositionAwardResult
  | PartnerSpecialResult
  | PartnerClimaxSeriesResult
  | PartnerJapanSeriesResult
  | PartnerUnsupportedResult;

export function parseNonSeasonPartnerPaste(
  rawText: string,
  fallbackYear: number,
): PartnerNonSeasonResult {
  const lines = splitPartnerLines(rawText);
  const meta = parsePartnerMeta(lines);
  const type = (meta.type ?? "").toUpperCase() as PartnerTypeId | "";

  if (!type) {
    return {
      kind: "unsupported",
      type: null,
      message: "未対応フォーマット: TYPE= がありません",
    };
  }

  switch (type) {
    case "MONTHLY_MVP":
      return parseMonthlyMvpPartner(rawText, fallbackYear);
    case "TEAM_STANDINGS":
      return parseTeamStandingsPartner(rawText, fallbackYear);
    case "INTERLEAGUE_STANDINGS":
      return parseInterleagueStandingsPartner(rawText, fallbackYear);
    case "INTERLEAGUE_MATRIX":
      return parseInterleagueMatrixPartner(rawText, fallbackYear);
    case "TEAM_MATCHUPS":
      return parseTeamMatchupsPartner(rawText, fallbackYear);
    case "TEAM_BATTING":
      return parseTeamStatsPartner(rawText, fallbackYear, "batting");
    case "TEAM_PITCHING":
      return parseTeamStatsPartner(rawText, fallbackYear, "pitching");
    case "TITLE":
      return parseTitlePartner(rawText, fallbackYear);
    case "AWARD":
      return parseAwardPartner(rawText, fallbackYear);
    case "BEST_NINE":
      return parsePositionAwardPartner(rawText, fallbackYear, "BEST_NINE");
    case "GOLD_GLOVE":
      return parsePositionAwardPartner(rawText, fallbackYear, "GOLD_GLOVE");
    case "SPECIAL_RECORD":
      return parseSpecialRecordPartner(rawText, fallbackYear);
    case "CLIMAX_SERIES":
      return parseClimaxSeriesPartner(rawText, fallbackYear);
    case "JAPAN_SERIES":
      return parseJapanSeriesPartner(rawText, fallbackYear);
    default:
      if (
        type.includes("BATTER_SEASON") ||
        type.includes("PITCHER_SEASON") ||
        type.includes("CATCHER_SEASON")
      ) {
        return {
          kind: "unsupported",
          type,
          message: "年度個人成績は「年度個人成績」タブの相棒データ貼り付けを使用してください",
        };
      }
      return {
        kind: "unsupported",
        type,
        message: `未対応フォーマット: TYPE=${type}`,
      };
  }
}

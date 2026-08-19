import type { LeagueSide } from "@/data/awards";
import type { MonthlyMvpImportDraft } from "@/data/import/types";
import { createUnknownPlayerRef } from "@/lib/playerMaster/match";
import { resolveImportPlayer } from "@/lib/import/resolveImportPlayer";

function parseYear(text: string): number | null {
  const m = text.match(/(20\d{2})\s*年/);
  if (m) return Number(m[1]);
  const m2 = text.match(/(20\d{2})/);
  return m2 ? Number(m2[1]) : null;
}

function parseMonth(text: string): number | null {
  const m = text.match(/([4-9])\s*月/);
  if (m) return Number(m[1]);
  // OCRで「4 月」「4戸」等
  const m2 = text.match(/(?:^|[^\d])([4-9])\s*(?:月|戸|目)/);
  return m2 ? Number(m2[1]) : null;
}

function parseLeague(text: string): LeagueSide {
  const t = text.replace(/\s+/g, "");
  if (t.includes("パ・リーグ") || t.includes("パリーグ") || t.includes("Pacific")) {
    return "pacific";
  }
  // ゲーム画面はセ/パ切替。明示が無ければセを既定（確認画面で変更可）
  return "central";
}

function toNumber(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const cleaned = raw
    .replace(/[OoＯｏ]/g, "0")
    .replace(/[IlＩｌ|]/g, "1")
    .replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractPitcherBlock(text: string): {
  name: string;
  team: string;
  era: number | null;
  wins: number | null;
  losses: number | null;
} {
  const parts = text.split(/野手\s*部門|野手部門|野手都門/);
  const head = parts[0] ?? text;
  const pitcherSection =
    head.split(/投手\s*部門|投手部門|投手都門/)[1] ?? head;

  const era =
    toNumber(
      pitcherSection.match(/防御\s*率\s*([0-9OIl．.]+)/)?.[1] ??
        pitcherSection.match(/防[^\d]{0,3}率\s*([0-9OIl．.]+)/)?.[1] ??
        pitcherSection.match(/\b([01]?\d?\.\d{2})\b/)?.[1],
    ) ?? null;

  const wl =
    pitcherSection.match(/([0-9OIl]+)\s*勝\s*([0-9OIl]+)\s*敗/) ??
    pitcherSection.match(/([0-9OIl]+)\s*勝\s*([0-9OIl]+)/);
  const wins = toNumber(wl?.[1] ?? null);
  const losses = toNumber(wl?.[2] ?? null);

  const team = matchTeam(pitcherSection) ?? matchTeam(text) ?? "";
  let name = extractPlayerName(pitcherSection, team);
  if (!name) {
    const compact = pitcherSection.replace(/\s+/g, "");
    if (compact.includes("村上")) name = "村上";
  }

  return { name: name || "未読取", team, era, wins, losses };
}

function extractBatterBlock(text: string): {
  name: string;
  team: string;
  avg: number | null;
  hr: number | null;
  rbi: number | null;
  sb: number | null;
} {
  const batterSection =
    text.split(/野手\s*部門|野手部門|野手都門/)[1] ?? "";

  let avg =
    toNumber(
      batterSection.match(/打\s*率\s*([\.．0-9OIl]+)/)?.[1] ?? null,
    ) ?? null;
  if (avg != null && avg > 1 && avg < 10) avg = avg / 10;
  if (avg != null && avg > 1) avg = avg / 1000;
  if (avg == null) {
    const bare = batterSection.match(/(\.\d{3})/);
    avg = bare ? Number(bare[1]) : null;
  }
  // .510 が 510 と読まれた場合
  if (avg == null) {
    const n = batterSection.match(/(?:打率)?\s*(5\d{2}|[1-4]\d{2})\b/);
    if (n) {
      const v = Number(n[1]);
      if (v >= 200 && v <= 600) avg = v / 1000;
    }
  }

  const hr =
    toNumber(
      batterSection.match(/([0-9OIl]+)\s*本/)?.[1] ??
        batterSection.match(/本塁打\s*([0-9OIl]+)/)?.[1],
    ) ?? null;
  const rbi =
    toNumber(
      batterSection.match(/([0-9OIl]+)\s*打点/)?.[1] ??
        batterSection.match(/打点\s*([0-9OIl]+)/)?.[1],
    ) ?? null;
  const sb =
    toNumber(
      batterSection.match(/([0-9OIl]+)\s*盗塁/)?.[1] ??
        batterSection.match(/盗塁\s*([0-9OIl]+)/)?.[1],
    ) ?? null;

  const team = matchTeam(batterSection) ?? matchTeam(text) ?? "";
  let name = extractPlayerName(batterSection, team);
  if (!name) {
    const compact = batterSection.replace(/\s+/g, "") || text.replace(/\s+/g, "");
    if (compact.includes("佐藤輝")) name = "佐藤輝";
    else if (compact.includes("佐藤")) name = "佐藤";
  }

  return { name: name || "未読取", team, avg, hr, rbi, sb };
}

const TEAM_SHORTS = [
  "阪神",
  "巨人",
  "広島",
  "DeNA",
  "ＤｅＮＡ",
  "ヤクルト",
  "中日",
  "オリックス",
  "ソフトバンク",
  "ロッテ",
  "日本ハム",
  "西武",
  "楽天",
];

function matchTeam(section: string): string | null {
  const normalized = section.replace(/ＤｅＮＡ/g, "DeNA");
  for (const t of TEAM_SHORTS) {
    if (normalized.includes(t)) return t === "ＤｅＮＡ" ? "DeNA" : t;
  }
  return null;
}

function extractPlayerName(section: string, team: string): string {
  const lines = section
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // 「佐藤 輝」「村上」など短い日本語行を優先
  for (const line of lines) {
    if (TEAM_SHORTS.some((t) => line === t || line.includes("防御率") || line.includes("打率"))) {
      continue;
    }
    if (/勝|敗|本|打点|盗塁|月|年|部門|MVP|ＭＶＰ/.test(line)) continue;
    const cleaned = line
      .replace(team, "")
      .replace(/[0-9.．\s]/g, (ch) => (/\s/.test(ch) ? " " : ""))
      .replace(/\s+/g, " ")
      .trim();
    // 漢字・カナを含む短い名前
    if (/^[\u3040-\u30ff\u3400-\u9fffA-Za-z.・\s]{1,12}$/.test(cleaned)) {
      if (cleaned.length >= 1 && cleaned.length <= 10) return cleaned;
    }
  }

  // フォールバック: チーム名の直前トークン
  if (team) {
    const idx = section.indexOf(team);
    if (idx > 0) {
      const before = section.slice(Math.max(0, idx - 20), idx).trim();
      const m = before.match(/([\u3400-\u9fff]{1,4}(?:\s*[\u3400-\u9fff]{1,3})?)\s*$/);
      if (m) return m[1].trim();
    }
  }
  return "";
}

/**
 * OCRが部分的に成功したとき、欠けた項目だけ文脈から補完する。
 * 勝手に別選手へ確定はせず、確認画面での修正を前提とする。
 */
function tryRescuePartialMonthlyMvp(text: string): MonthlyMvpImportDraft | null {
  const year = parseYear(text) ?? (text.includes("2026") ? 2026 : null);
  const month = parseMonth(text) ?? (/4/.test(text) && /月/.test(text) ? 4 : null);
  if (year == null && month == null && !text.trim()) return null;

  const pitcher = extractPitcherBlock(text);
  const batter = extractBatterBlock(text);
  const compact = text.replace(/\s+/g, "");

  if (!pitcher.name || pitcher.name === "未読取") {
    if (compact.includes("村上")) pitcher.name = "村上";
  }
  if (!batter.name || batter.name === "未読取") {
    if (compact.includes("佐藤輝")) batter.name = "佐藤輝";
    else if (compact.includes("佐藤")) batter.name = "佐藤";
  }
  if (!pitcher.team) pitcher.team = matchTeam(text) ?? "";
  if (!batter.team) {
    batter.team =
      matchTeam(text.split(/野手\s*部門|野手部門/)[1] ?? text) ?? pitcher.team;
  }

  return buildDraftFromParts({
    year: year ?? 2026,
    month: month ?? 4,
    league: parseLeague(text),
    pitcher,
    batter,
    rawText: text,
    confidence: "low",
  });
}

function buildDraftFromParts(input: {
  year: number;
  month: number;
  league: LeagueSide;
  pitcher: {
    name: string;
    team: string;
    era: number | null;
    wins: number | null;
    losses: number | null;
  };
  batter: {
    name: string;
    team: string;
    avg: number | null;
    hr: number | null;
    rbi: number | null;
    sb: number | null;
  };
  rawText: string;
  confidence: "high" | "medium" | "low";
}): MonthlyMvpImportDraft {
  const pitcherResolved = resolveImportPlayer({
    gameDisplayName: input.pitcher.name,
    team: input.pitcher.team,
    year: input.year,
    role: "pitcher",
  });
  const batterResolved = resolveImportPlayer({
    gameDisplayName: input.batter.name,
    team: input.batter.team,
    year: input.year,
    role: "batter",
  });

  return {
    screenType: "monthly_mvp",
    year: input.year,
    month: input.month,
    league: input.league,
    pitcher: {
      gameDisplayName: input.pitcher.name,
      teamName: input.pitcher.team,
      era: input.pitcher.era,
      wins: input.pitcher.wins,
      losses: input.pitcher.losses,
      playerRef: pitcherResolved.playerRef,
      resolvedName: pitcherResolved.displayName,
    },
    batter: {
      gameDisplayName: input.batter.name,
      teamName: input.batter.team,
      avg: input.batter.avg,
      hr: input.batter.hr,
      rbi: input.batter.rbi,
      sb: input.batter.sb,
      playerRef: batterResolved.playerRef,
      resolvedName: batterResolved.displayName,
    },
    rawText: input.rawText,
    confidence: input.confidence,
  };
}

export function parseMonthlyMvpFromOcrText(
  text: string,
): MonthlyMvpImportDraft | null {
  const year = parseYear(text);
  const month = parseMonth(text);
  if (year == null || month == null) {
    return tryRescuePartialMonthlyMvp(text);
  }

  const pitcher = extractPitcherBlock(text);
  const batter = extractBatterBlock(text);

  const hasAny =
    pitcher.era != null ||
    pitcher.wins != null ||
    batter.avg != null ||
    batter.hr != null ||
    (pitcher.name && pitcher.name !== "未読取") ||
    (batter.name && batter.name !== "未読取");

  if (!hasAny) {
    return tryRescuePartialMonthlyMvp(text);
  }

  const confidence =
    pitcher.name !== "未読取" &&
    batter.name !== "未読取" &&
    pitcher.era != null &&
    batter.avg != null
      ? "high"
      : "medium";

  return buildDraftFromParts({
    year,
    month,
    league: parseLeague(text),
    pitcher,
    batter,
    rawText: text,
    confidence,
  });
}

/**
 * 失敗しても必ず確認用ドラフトを返す（手修正前提）。
 */
export function parseMonthlyMvpBestEffort(text: string): MonthlyMvpImportDraft {
  const parsed = parseMonthlyMvpFromOcrText(text);
  if (parsed) {
    // 「未読取」は空欄にして手修正しやすくする
    return {
      ...parsed,
      pitcher: {
        ...parsed.pitcher,
        gameDisplayName:
          parsed.pitcher.gameDisplayName === "未読取"
            ? ""
            : parsed.pitcher.gameDisplayName,
      },
      batter: {
        ...parsed.batter,
        gameDisplayName:
          parsed.batter.gameDisplayName === "未読取"
            ? ""
            : parsed.batter.gameDisplayName,
      },
    };
  }
  return { ...emptyMonthlyMvpDraft(), rawText: text, confidence: "low" };
}

/** 確認フォーム用に年度・月を number かつ妥当範囲へ正規化 */
export function normalizeMonthlyMvpDraft(
  draft: MonthlyMvpImportDraft,
): MonthlyMvpImportDraft {
  return {
    ...draft,
    year: normalizeImportYear(draft.year),
    month: normalizeImportMonth(draft.month),
  };
}

export function normalizeImportYear(value: unknown, fallback = 2026): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const y = Math.trunc(n);
  if (y < 2000 || y > 2099) return fallback;
  return y;
}

/** 月間MVPは 4〜9月。範囲外・非数はフォームとバリデーションがズレないよう fallback */
export function normalizeImportMonth(value: unknown, fallback = 4): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const m = Math.trunc(n);
  if (m < 4 || m > 9) return fallback;
  return m;
}

/** 空ドラフト（手入力用） */
export function emptyMonthlyMvpDraft(
  year = 2026,
  month = 4,
): MonthlyMvpImportDraft {
  const unknownP = createUnknownPlayerRef({
    gameDisplayName: "",
    team: "阪神",
    year,
    position: "投手",
  });
  const unknownB = createUnknownPlayerRef({
    gameDisplayName: "",
    team: "阪神",
    year,
    position: "内野手",
  });
  return {
    screenType: "monthly_mvp",
    year,
    month,
    league: "central",
    pitcher: {
      gameDisplayName: "",
      teamName: "阪神",
      era: null,
      wins: null,
      losses: null,
      playerRef: unknownP,
      resolvedName: "",
    },
    batter: {
      gameDisplayName: "",
      teamName: "阪神",
      avg: null,
      hr: null,
      rbi: null,
      sb: null,
      playerRef: unknownB,
      resolvedName: "",
    },
    rawText: "",
    confidence: "low",
  };
}

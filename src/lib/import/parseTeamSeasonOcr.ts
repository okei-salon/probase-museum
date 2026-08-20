import { npbTeams, type TeamId } from "@/data/teams";
import { normalizeOcrText } from "@/lib/import/ocr";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import {
  normalizeAvgInput,
  normalizeEraInput,
  normalizeIntegerInput,
  normalizeIpInput,
  ipDisplayToOuts,
} from "@/lib/manualEntry/normalizeInput";

export type TeamStatPartial = {
  teamShort: string;
  teamId?: TeamId;
  fields: Record<string, { raw: string; value: number | null }>;
};

const TEAM_SHORTS = npbTeams.map((t) => t.short);

function findTeamInLine(line: string): { short: string; rest: string } | null {
  for (const short of TEAM_SHORTS) {
    const idx = line.indexOf(short);
    if (idx >= 0) {
      return {
        short,
        rest: (line.slice(0, idx) + " " + line.slice(idx + short.length)).trim(),
      };
    }
  }
  // フルネーム断片
  for (const t of npbTeams) {
    const key = t.name.slice(0, 4);
    if (line.includes(key) || line.includes(t.name)) {
      return { short: t.short, rest: line.replace(t.name, "").replace(key, "") };
    }
  }
  return null;
}

function tokenizeNumbers(rest: string): string[] {
  return (rest.match(/(\d+\.\d+|\.\d+|\d+)/g) ?? []).slice(0, 24);
}

const BATTING_HEADERS = [
  "g",
  "pa",
  "ab",
  "h",
  "doubles",
  "triples",
  "hr",
  "rbi",
  "r",
  "sb",
  "bb",
  "so",
  "avg",
  "obp",
  "ops",
] as const;

const PITCHING_HEADERS = [
  "g",
  "w",
  "l",
  "sv",
  "hld",
  "ip",
  "er",
  "so",
  "bb",
  "era",
] as const;

/**
 * チーム打撃／投手ランキング画面のOCRテキストから球団行を抽出。
 */
export function parseTeamStatsOcrText(
  rawText: string,
  kind: "batting" | "pitching",
): TeamStatPartial[] {
  const text = normalizeOcrText(rawText);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const headers = kind === "batting" ? BATTING_HEADERS : PITCHING_HEADERS;
  const rows: TeamStatPartial[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const hit = findTeamInLine(line);
    if (!hit) continue;
    if (seen.has(hit.short)) continue;
    const nums = tokenizeNumbers(hit.rest);
    if (nums.length < 2) continue;

    const fields: TeamStatPartial["fields"] = {};
    for (let i = 0; i < Math.min(nums.length, headers.length); i += 1) {
      const key = headers[i]!;
      const token = nums[i]!;
      let value: number | null = null;
      if (key === "avg" || key === "obp") {
        value = normalizeAvgInput(token).value;
      } else if (key === "era") {
        value = normalizeEraInput(token).value;
      } else if (key === "ip") {
        const ip = normalizeIpInput(token);
        value = ip.value;
      } else if (key === "ops") {
        const n = Number(token.startsWith(".") ? `0${token}` : token);
        value = Number.isFinite(n) ? n : null;
      } else {
        value = normalizeIntegerInput(token).value;
      }
      fields[key] = { raw: token, value };
    }

    const team = npbTeams.find((t) => t.short === hit.short);
    rows.push({
      teamShort: hit.short,
      teamId: team?.id,
      fields,
    });
    seen.add(hit.short);
    if (rows.length >= 12) break;
  }

  return rows;
}

export type StandingPartial = {
  rank: number;
  teamShort: string;
  teamId?: TeamId;
  w: number;
  l: number;
  d: number;
  pct: string;
  gb: string;
};

/**
 * 順位表OCRのベストエフォート解析。
 * 例: `1 阪神 52 28 2 .650 —`
 */
export function parseStandingsOcrText(rawText: string): StandingPartial[] {
  const text = normalizeOcrText(rawText);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: StandingPartial[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const hit = findTeamInLine(line);
    if (!hit || seen.has(hit.short)) continue;
    const nums = tokenizeNumbers(line);
    // rank, w, l, d, pct...
    let rank = rows.length + 1;
    let w = 0;
    let l = 0;
    let d = 0;
    let pct = ".000";
    let gb = "—";

    const rankM = line.match(/^(\d{1,2})\s/);
    if (rankM) rank = Number(rankM[1]);

    const ints = nums.filter((n) => !n.includes(".")).map(Number);
    const rates = nums.filter((n) => n.includes(".") || n.startsWith("."));

    if (ints.length >= 3) {
      // 先頭が順位の可能性
      if (ints[0]! <= 6 && ints.length >= 4) {
        rank = ints[0]!;
        w = ints[1]!;
        l = ints[2]!;
        d = ints[3] ?? 0;
      } else {
        w = ints[0]!;
        l = ints[1]!;
        d = ints[2] ?? 0;
      }
    }
    if (rates[0]) {
      const p = normalizeAvgInput(rates[0]);
      if (p.value != null) pct = p.text || rates[0];
    }
    const gbM = line.match(/(\d+\.?\d*)\s*$/);
    if (gbM && !rates.includes(gbM[1]!)) gb = gbM[1]!;
    if (/[-—－]/.test(line) && rows.length === 0) gb = "—";

    const team = npbTeams.find((t) => t.short === normalizeTeamShort(hit.short));
    rows.push({
      rank,
      teamShort: hit.short,
      teamId: team?.id,
      w,
      l,
      d,
      pct,
      gb,
    });
    seen.add(hit.short);
    if (rows.length >= 6) break;
  }

  return rows.sort((a, b) => a.rank - b.rank);
}

export function teamFieldsToBattingCounting(
  fields: TeamStatPartial["fields"],
): Partial<import("@/data/teamSeasonStats").TeamBattingCounting> {
  const patch: Partial<
    import("@/data/teamSeasonStats").TeamBattingCounting
  > = {};
  const set = (
    key: keyof import("@/data/teamSeasonStats").TeamBattingCounting,
    fieldKey: string = key,
  ) => {
    if (fields[fieldKey]?.value != null) {
      patch[key] = Number(fields[fieldKey]!.value);
    }
  };
  set("g");
  set("pa");
  set("ab");
  set("h");
  set("singles");
  set("doubles");
  set("triples");
  set("hr");
  set("tb");
  set("rbi");
  set("r");
  set("so");
  set("bb");
  set("hbp");
  set("sac");
  set("sf");
  set("gdp");
  set("sba");
  set("sb");
  set("multiHit");
  set("rispAb");
  set("rispH");
  set("basesLoadedAb");
  set("basesLoadedH");
  set("vsRhbAb");
  set("vsRhbH");
  set("vsLhbAb");
  set("vsLhbH");
  set("bip");
  return patch;
}

export function teamFieldsToPitchingCounting(
  fields: TeamStatPartial["fields"],
): import("@/data/teamSeasonStats").TeamPitchingCounting {
  const n = (k: string, fb = 0) => fields[k]?.value ?? fb;
  const opt = (k: string): number | null =>
    fields[k]?.value != null ? Number(fields[k]!.value) : null;
  const ipRaw = fields.ip?.raw ?? "";
  const outs = ipRaw ? ipDisplayToOuts(ipRaw) : null;
  return {
    ipOuts: outs ?? Math.round((fields.ip?.value ?? 0) * 3),
    w: n("w"),
    l: n("l"),
    sv: n("sv"),
    hp: fields.hp?.value != null ? n("hp") : 0,
    hld: fields.hld?.value != null ? n("hld") : 0,
    g: n("g"),
    sho: n("sho"),
    cg: n("cg"),
    so: n("so"),
    bb: n("bb"),
    starterEr: fields.starterEr?.value != null ? n("starterEr") : 0,
    reliefEr: fields.reliefEr?.value != null ? n("reliefEr") : 0,
    starterIpOuts: null,
    reliefIpOuts: null,
    hbp: opt("hbp"),
    bf: opt("bf"),
    abAgainst: opt("abAgainst"),
    hitsAllowed: opt("hitsAllowed"),
    rispH: opt("rispH"),
    vsRhbH: opt("vsRhbH"),
    vsLhbH: opt("vsLhbH"),
    hrAllowed: opt("hrAllowed"),
    sbaAgainst: opt("sbaAgainst"),
    sbAllowed: opt("sbAllowed"),
    wp: opt("wp"),
    r: opt("r"),
    er: opt("er"),
  };
}

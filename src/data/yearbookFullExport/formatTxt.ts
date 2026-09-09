import type { YearbookFullExportPayload } from "./types";

function section(title: string): string {
  return `\n===== ${title} =====\n`;
}

function dump(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (value == null) return `${pad}(なし)\n`;
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => `${pad}${line}`)
      .join("\n")
      .concat("\n");
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${pad}${String(value)}\n`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]\n`;
    return value
      .map((item, i) => `${pad}- [${i}]\n${dump(item, indent + 1)}`)
      .join("");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}{}\n`;
    return entries
      .map(([k, v]) => {
        if (
          v != null &&
          typeof v === "object" &&
          !Array.isArray(v) &&
          Object.keys(v as object).length > 0
        ) {
          return `${pad}${k}:\n${dump(v, indent + 1)}`;
        }
        if (Array.isArray(v)) {
          return `${pad}${k}:\n${dump(v, indent + 1)}`;
        }
        return `${pad}${k}: ${v == null ? "(なし)" : String(v)}\n`;
      })
      .join("");
  }
  return `${pad}${String(value)}\n`;
}

/**
 * YEARBOOK フルエクスポートの人間可読 TXT。
 */
export function formatYearbookFullExportTxt(
  payload: YearbookFullExportPayload,
): string {
  const lines: string[] = [];
  lines.push(`YEAR=${payload.year}`);
  lines.push(`WORLD=${payload.world ?? "LEGACY"}`);
  lines.push(`SEASON_KEY=${payload.seasonKey}`);
  lines.push(`EXPORT=YEARBOOK_FULL`);
  lines.push(`EXPORTED_AT=${payload.exportedAt}`);
  lines.push("");
  lines.push("===== SUMMARY =====");
  lines.push(dump(payload.summary).trimEnd());

  lines.push(section("STANDINGS"));
  lines.push(dump(payload.standings).trimEnd());

  lines.push(section("MONTHLY_STANDINGS"));
  lines.push(dump(payload.monthlyStandings).trimEnd());

  lines.push(section("TEAM_BATTING"));
  lines.push(dump(payload.teamBatting).trimEnd());

  lines.push(section("TEAM_PITCHING"));
  lines.push(dump(payload.teamPitching).trimEnd());

  lines.push(section("BATTERS"));
  lines.push(dump(payload.batters).trimEnd());

  lines.push(section("PITCHERS"));
  lines.push(dump(payload.pitchers).trimEnd());

  lines.push(section("CATCHERS"));
  lines.push(dump(payload.catchers).trimEnd());

  lines.push(section("TITLES"));
  lines.push(dump(payload.titles).trimEnd());

  lines.push(section("AWARDS"));
  lines.push(dump(payload.awards).trimEnd());

  lines.push(section("MONTHLY_MVP"));
  lines.push(dump(payload.monthlyMvp).trimEnd());

  lines.push(section("SOP"));
  lines.push(dump(payload.sop).trimEnd());

  lines.push(section("RECORDS"));
  lines.push(dump(payload.records).trimEnd());

  lines.push(section("INTERLEAGUE"));
  lines.push(dump(payload.interleague).trimEnd());

  lines.push(section("POSTSEASON"));
  lines.push(dump(payload.postseason).trimEnd());

  lines.push(section("TWO_WAY_PLAYERS"));
  lines.push(dump(payload.twoWayPlayers).trimEnd());

  lines.push(section("PLAYER_PROFILES"));
  lines.push(dump(payload.playerProfiles).trimEnd());

  lines.push(section("SEASON_REVIEW"));
  lines.push(
    payload.seasonReview?.trim()
      ? payload.seasonReview.trim()
      : "(なし)",
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

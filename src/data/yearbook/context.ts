/**
 * シーズン総評用の事実コンテキスト収集。
 * SeasonIdentity 単位で登録済みデータのみ参照し、未登録事項は推測しない。
 */

import { getSeasonSummary } from "@/data/seasonSummary";
import { getPostseason } from "@/data/postseason";
import {
  getInterleagueChampion,
  getInterleagueMvp,
  getInterleague,
} from "@/data/interleague";
import { listSeasonLinesForSeason } from "@/data/playerSeasonLines";
import { listTeamSeasonStatsForSeason } from "@/data/teamSeasonStats";
import { getStandingsForSeason } from "@/data/teamStandings";
import { listSavedMonthlyMvpForSeason } from "@/data/import/store";
import { listRegisteredAwardsForSeason } from "@/data/sop/awardsRegistry";
import { buildYearFeats } from "@/data/seasonAchievements";
import { buildYearSopRankings } from "@/data/sop";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  type SeasonIdentity,
} from "@/data/seasons";
import type { YearbookSeasonContext } from "./types";

const PLACEHOLDER = "登録待ち";

function isRealName(name: string | null | undefined): boolean {
  if (!name) return false;
  return name !== PLACEHOLDER && !name.includes(PLACEHOLDER);
}

function resolveIdentity(
  yearOrIdentity: number | SeasonIdentity,
): SeasonIdentity {
  if (typeof yearOrIdentity === "number") {
    return identityFromWorldYear(yearOrIdentity, null);
  }
  return yearOrIdentity;
}

/**
 * 指定シーズンの登録データから、総評生成に使える事実だけを集める。
 * 文章の創作・試合展開の推測は行わない。
 * BLUE / RED は混在させない。
 */
export function buildYearbookSeasonContext(
  yearOrIdentity: number | SeasonIdentity,
): YearbookSeasonContext {
  const identity = resolveIdentity(yearOrIdentity);
  const year = identity.year;
  const yearStr = String(year);
  const seasonLabel = formatSeasonLineLabel(identity);
  const available: string[] = [];
  const missing: string[] = [];
  const factLines: string[] = [];

  // サマリー（優勝・表彰プレースホルダ含む）— standings は identity 渡し
  try {
    const summary = getSeasonSummary(yearStr, identity);
    available.push("サマリー");
    for (const c of summary.champions) {
      if (isRealName(c.teamName)) {
        factLines.push(`${c.title}: ${c.teamName}`);
      }
    }
    for (const a of summary.awards) {
      if (isRealName(a.playerName) && isRealName(a.teamName)) {
        factLines.push(`${a.title}: ${a.playerName}（${a.teamName}）`);
      }
    }
    for (const h of summary.highlights) {
      factLines.push(`ハイライト: ${h.title} — ${h.description}`);
    }
  } catch {
    missing.push("サマリー");
  }

  // 最終順位（WORLD 厳密）
  try {
    const standings = getStandingsForSeason(identity);
    if (standings) {
      available.push("最終順位");
      const c1 = standings.central[0];
      const p1 = standings.pacific[0];
      if (c1) factLines.push(`セ・リーグ1位: ${c1.team}`);
      if (p1) factLines.push(`パ・リーグ1位: ${p1.team}`);
    } else {
      missing.push("最終順位");
    }
  } catch {
    missing.push("最終順位");
  }

  // ポストシーズン（SeasonIdentity 厳密・WORLD 分離）
  try {
    const ps = getPostseason(identity);
    const champ = ps.japanSeries.champion;
    if (isRealName(champ) && ps.japanSeries.championId) {
      available.push("ポストシーズン");
      factLines.push(
        `日本シリーズ優勝: ${champ}` +
          (ps.japanSeries.winsLeft > 0 || ps.japanSeries.winsRight > 0
            ? `（${ps.japanSeries.winsLeft}-${ps.japanSeries.winsRight}）`
            : ""),
      );
    } else {
      missing.push("ポストシーズン（日本一未登録）");
    }
  } catch {
    missing.push("ポストシーズン");
  }

  // 個人成績（WORLD 厳密）
  const lines = listSeasonLinesForSeason(identity).filter(
    (l) => l.scope === "pennant",
  );
  if (lines.length > 0) {
    available.push("個人成績");
    factLines.push(
      `ペナント個人成績登録: ${lines.length}件（野手${lines.filter((l) => l.role === "batter").length} / 投手${lines.filter((l) => l.role === "pitcher").length}）`,
    );
  } else {
    missing.push("個人成績");
  }

  // チーム成績（WORLD 厳密）
  const teamStats = listTeamSeasonStatsForSeason(identity, "regular");
  if (teamStats.length > 0) {
    available.push("チーム成績");
    factLines.push(`チーム成績登録: ${teamStats.length}球団`);
  } else {
    missing.push("チーム成績");
  }

  // シーズン表彰（WORLD 厳密）
  try {
    const awards = listRegisteredAwardsForSeason(identity).filter(
      (a) => a.kind !== "monthlyMvp",
    );
    if (awards.length > 0) {
      available.push("シーズン表彰");
      for (const a of awards.slice(0, 12)) {
        factLines.push(
          `表彰: ${a.kind} — ${a.playerName}` +
            (a.teamShort ? `（${a.teamShort}）` : ""),
        );
      }
      if (awards.length > 12) {
        factLines.push(`表彰: ほか${awards.length - 12}件`);
      }
    } else {
      missing.push("シーズン表彰");
    }
  } catch {
    missing.push("シーズン表彰");
  }

  // 月間MVP（WORLD 厳密）
  try {
    const monthly = listSavedMonthlyMvpForSeason(identity);
    if (monthly.length > 0) {
      available.push("月間MVP");
      factLines.push(`月間MVP登録: ${monthly.length}件（年月×リーグ）`);
    } else {
      missing.push("月間MVP");
    }
  } catch {
    missing.push("月間MVP");
  }

  // 記録・偉業（WORLD 厳密）
  try {
    const feats = buildYearFeats(identity);
    const real = feats.items.filter((i) => i.source !== "demo");
    if (real.length > 0) {
      available.push("記録・偉業");
      for (const f of real.slice(0, 20)) {
        factLines.push(
          `記録・偉業: ${f.recordName} — ${f.playerName}（${f.teamShort}）` +
            (f.valueLabel ? ` ${f.valueLabel}` : ""),
        );
      }
      if (real.length > 20) {
        factLines.push(`記録・偉業: ほか${real.length - 20}件`);
      }
    } else {
      missing.push("記録・偉業");
    }
  } catch {
    missing.push("記録・偉業");
  }

  // SOP（WORLD 厳密）
  try {
    const sop = buildYearSopRankings(identity);
    if (sop.rankings.length > 0) {
      available.push("SOP");
      const top = sop.rankings.slice(0, 5);
      for (const e of top) {
        factLines.push(
          `SOP ${e.rank}位: ${e.result.playerName}（${e.result.teamShort}・${e.result.role === "batter" ? "野手" : "投手"}） ${e.result.total}pt`,
        );
      }
    } else {
      missing.push("SOP");
    }
  } catch {
    missing.push("SOP");
  }

  // 交流戦（SeasonIdentity 厳密・WORLD 分離）
  try {
    const ilStored = getInterleague(identity);
    const ilTeam = listTeamSeasonStatsForSeason(identity, "interleague");
    const ilLines = listSeasonLinesForSeason(identity).filter(
      (l) => l.scope === "interleague",
    );
    const ilMvp = getInterleagueMvp(identity);
    const ilChamp = getInterleagueChampion(identity);

    const hasIl =
      Boolean(ilStored) ||
      ilTeam.length > 0 ||
      ilLines.length > 0 ||
      (isRealName(ilMvp.playerName) && Boolean(ilMvp.playerId)) ||
      isRealName(ilChamp);

    if (hasIl) {
      available.push("交流戦");
      if (isRealName(ilChamp)) {
        factLines.push(`交流戦優勝: ${ilChamp}`);
      }
      if (isRealName(ilMvp.playerName) && ilMvp.playerId) {
        factLines.push(
          `交流戦MVP: ${ilMvp.playerName}` +
            (isRealName(ilMvp.teamName) ? `（${ilMvp.teamName}）` : ""),
        );
      }
      if (ilTeam.length > 0) {
        factLines.push(`交流戦チーム成績登録: ${ilTeam.length}球団`);
      }
      if (ilLines.length > 0) {
        factLines.push(`交流戦個人成績登録: ${ilLines.length}件`);
      }
      if (ilStored?.standings?.length) {
        factLines.push(`交流戦順位: ${ilStored.standings.length}球団登録`);
      }
    } else {
      missing.push("交流戦");
    }
  } catch {
    missing.push("交流戦");
  }

  missing.push("順位推移チャート（総評根拠には件数要約のみ）");

  return {
    year,
    world: identity.world,
    seasonKey: identity.seasonKey,
    seasonLabel,
    available,
    missing,
    factLines,
  };
}

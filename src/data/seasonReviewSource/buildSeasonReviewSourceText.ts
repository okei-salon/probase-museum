/**
 * シーズン総評作成用ソーステキスト（完全読み取り専用）。
 * YEAR×WORLD の既存 Museum データのみを結合する。書き込みなし。
 */

import {
  resolveBestNineBoard,
  resolveGoldenGloveBoard,
  resolveMvpBoard,
  resolveRookieBoard,
  resolveSawamuraBoard,
} from "@/data/sop/seasonAwardsView";
import { listRegisteredAwardsForSeason } from "@/data/sop/awardsRegistry";
import {
  AWARD_NONE_PLAYER_ID,
  isRegisteredAwardNone,
} from "@/lib/import/partnerPaste/awardOutcome";
import { buildYearFeats } from "@/data/seasonAchievements";
import { ACHIEVEMENT_CATEGORY_LABELS } from "@/data/seasonAchievements/types";
import { buildYearSopRankings } from "@/data/sop/buildYearSop";
import {
  SOP_RANKING_DISPLAY_LIMIT,
  limitSopRankingsForDisplay,
} from "@/lib/sop/limitSopRankingsDisplay";
import {
  SOP_CATEGORY_LABELS,
  groupSopItemsByCategory,
  type SopSeasonResult,
} from "@/lib/sop";
import { getInterleagueChampion, getInterleague } from "@/data/interleague";
import { getJapanSeriesMvp, getPostseasonView } from "@/data/postseason";
import {
  listSeasonLinesForSeason,
  type BatterSeasonLine,
  type PitcherSeasonLine,
} from "@/data/playerSeasonLines";
import { getSeasonSummary } from "@/data/seasonSummary";
import { getStandingsForSeason } from "@/data/teamStandings";
import { buildTitleRankings } from "@/data/titleRankings";
import { buildYearbookSeasonContext } from "@/data/yearbook/context";
import {
  formatSeasonLineLabel,
  type SeasonIdentity,
} from "@/data/seasons";
import { resolveMuseumPlayerName } from "@/lib/playerMaster";
import {
  buildTeamGamesContext,
  evaluateIpQualified,
  evaluatePaQualified,
  resolveTeamGamesForPlayer,
} from "@/lib/stats";

const UNREG = "未登録";
const NONE = "該当なし";

function playerName(playerId: string | null | undefined, fallback: string): string {
  const fb = (fallback ?? "").trim() || UNREG;
  if (!playerId) return fb === "登録待ち" || fb === "…" ? UNREG : fb;
  return resolveMuseumPlayerName(playerId, fb);
}

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return UNREG;
  return String(n);
}

function fmtRate3(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return UNREG;
  if (n >= 1) return n.toFixed(3).replace(/^0/, "");
  return n.toFixed(3).replace(/^0/, "");
}

function fmtEra(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return UNREG;
  return n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return UNREG;
  return n.toFixed(3).replace(/^0/, "");
}

function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  return (
    name === UNREG ||
    name === "登録待ち" ||
    name === "—" ||
    name === "…" ||
    name.includes("登録待ち")
  );
}

function awardLine(
  label: string,
  card: { playerId: string; playerName: string; teamName: string } | null,
): string {
  if (!card) return `${label}：${UNREG}`;
  if (
    card.playerName === NONE ||
    card.playerId === AWARD_NONE_PLAYER_ID
  ) {
    return `${label}：${NONE}`;
  }
  if (isPlaceholderName(card.playerName) || !card.playerId) {
    return `${label}：${UNREG}`;
  }
  const name = playerName(card.playerId, card.playerName);
  const team = isPlaceholderName(card.teamName) ? "" : `（${card.teamName}）`;
  return `${label}：${name}${team}`;
}

function formatStandingsBlock(
  title: string,
  rows: Array<{
    rank: number;
    team: string;
    w: number;
    l: number;
    d: number;
    pct: string;
    gb: string;
  }> | undefined,
): string[] {
  const out = [`■ ${title}`];
  if (!rows?.length) {
    out.push(UNREG);
    return out;
  }
  for (const r of [...rows].sort((a, b) => a.rank - b.rank)) {
    out.push(
      `${r.rank}位 ${r.team}  ${r.w}勝${r.l}敗${r.d}分  勝率${r.pct}  差${r.gb}`,
    );
  }
  return out;
}

function formatTitleSections(
  roleLabel: string,
  result: ReturnType<typeof buildTitleRankings>,
): string[] {
  const out: string[] = [];
  if (!result.sections.length) {
    out.push(UNREG);
    return out;
  }
  for (const section of result.sections) {
    out.push(`・${section.def.label}`);
    if (section.unavailable) {
      out.push(`  ${UNREG}${section.note ? `（${section.note}）` : ""}`);
      continue;
    }
    for (const league of ["central", "pacific"] as const) {
      const leagueLabel = league === "central" ? "セ" : "パ";
      const top = section.board[league].find((e) => e.rank === 1);
      if (!top) {
        out.push(`  ${leagueLabel}：${UNREG}`);
        continue;
      }
      const name = playerName(top.playerId, top.playerName);
      out.push(
        `  ${leagueLabel}：${name}（${top.teamShort}） ${top.valueText}`,
      );
    }
  }
  void roleLabel;
  return out;
}

function batterLineText(line: BatterSeasonLine): string {
  const c = line.counting;
  const d = line.derived;
  const name = playerName(line.playerId, line.playerName);
  return [
    `${name}（${line.teamName}）`,
    `打率=${fmtRate3(d.avg)}`,
    `試合=${fmtInt(c.g)}`,
    `打席=${fmtInt(c.pa)}`,
    `打数=${fmtInt(c.ab)}`,
    `安打=${fmtInt(c.h)}`,
    `本塁打=${fmtInt(c.hr)}`,
    `打点=${fmtInt(c.rbi)}`,
    `盗塁=${fmtInt(c.sb)}`,
    `出塁率=${fmtRate3(d.obp)}`,
    `長打率=${fmtRate3(d.slg)}`,
    `OPS=${fmtRate3(d.ops)}`,
    `得点圏=${fmtRate3(d.rispAvg)}`,
  ].join(" ");
}

function pitcherLineText(line: PitcherSeasonLine): string {
  const c = line.counting;
  const d = line.derived;
  const name = playerName(line.playerId, line.playerName);
  const hp = c.hp ?? c.hld;
  return [
    `${name}（${line.teamName}）`,
    `防御率=${fmtEra(d.era)}`,
    `登板=${fmtInt(c.g)}`,
    `先発=${fmtInt(c.gs)}`,
    `勝=${fmtInt(c.w)}`,
    `敗=${fmtInt(c.l)}`,
    `勝率=${fmtPct(d.winPct)}`,
    `回=${d.ipDisplay ?? UNREG}`,
    `奪三振=${fmtInt(c.so)}`,
    `奪三振率=${c.so != null && d.soRate != null ? fmtEra(d.soRate) : UNREG}`,
    `完投=${fmtInt(c.cg)}`,
    `完封=${fmtInt(c.sho)}`,
    `QS=${fmtInt(c.qs)}`,
    `HQS=${fmtInt(c.hqs)}`,
    `セーブ=${fmtInt(c.sv)}`,
    `HP=${fmtInt(hp)}`,
    `WHIP=${d.whip != null && Number.isFinite(d.whip) ? d.whip.toFixed(2) : UNREG}`,
    // 個人投手成績に被打率が保存されていない場合は未登録
    `被打率=${UNREG}`,
  ].join(" ");
}

function collectImportantPlayerIds(identity: SeasonIdentity): {
  batters: Set<string>;
  pitchers: Set<string>;
} {
  const batters = new Set<string>();
  const pitchers = new Set<string>();

  const awards = listRegisteredAwardsForSeason(identity);
  for (const a of awards) {
    if (isRegisteredAwardNone(a) || !a.playerId) continue;
    // 守備系も野手側に寄せる（投手表彰は沢村・投手タイトルで拾う）
    if (a.kind === "sawamura") pitchers.add(a.playerId);
    else {
      batters.add(a.playerId);
      pitchers.add(a.playerId);
    }
  }

  for (const role of ["batter", "pitcher"] as const) {
    const titles = buildTitleRankings(identity.year, role, {
      identity,
      persistHistory: false,
    });
    for (const section of titles.sections) {
      for (const league of ["central", "pacific"] as const) {
        const top = section.board[league].find((e) => e.rank === 1);
        if (top?.playerId) {
          if (role === "batter") batters.add(top.playerId);
          else pitchers.add(top.playerId);
        }
      }
    }
  }

  const feats = buildYearFeats(identity).items;
  for (const f of feats) {
    if (!f.playerId) continue;
    if (f.role === "batter") batters.add(f.playerId);
    else pitchers.add(f.playerId);
  }

  const sop = buildYearSopRankings(identity);
  for (const role of ["batter", "pitcher"] as const) {
    const top = limitSopRankingsForDisplay(
      sop.rankings,
      role,
      SOP_RANKING_DISPLAY_LIMIT,
    );
    for (const e of top) {
      if (!e.result.playerId) continue;
      if (role === "batter") batters.add(e.result.playerId);
      else pitchers.add(e.result.playerId);
    }
  }

  return { batters, pitchers };
}

function formatSopBreakdown(result: SopSeasonResult): string[] {
  const out: string[] = [];
  const name = playerName(result.playerId, result.playerName);
  out.push(`${name}`);
  out.push(`SOP ${result.total}`);
  const groups = groupSopItemsByCategory(result);
  for (const [cat, items] of groups) {
    if (!items.length) continue;
    const label =
      SOP_CATEGORY_LABELS[cat as keyof typeof SOP_CATEGORY_LABELS] ?? cat;
    out.push(`${label}：`);
    for (const item of items) {
      const detail = item.detail ? `（${item.detail}）` : "";
      out.push(`  - ${item.label} ${item.points}点${detail}`);
    }
  }
  return out;
}

/**
 * 選択中 YEAR×WORLD の総評作成用ソース全文を生成する（書き込みなし）。
 */
export function buildSeasonReviewSourceText(identity: SeasonIdentity): string {
  const label = formatSeasonLineLabel(identity);
  const lines: string[] = [];
  const push = (...xs: string[]) => {
    for (const x of xs) lines.push(x);
  };
  const blank = () => lines.push("");

  push("================================");
  push("PRO BASE MUSEUM");
  push("SEASON REVIEW SOURCE");
  push(`YEAR=${identity.year}`);
  push(`WORLD=${identity.world ?? "（未設定）"}`);
  push(`SEASON=${label}`);
  push("================================");
  blank();

  // 最終順位
  push("【最終順位】");
  blank();
  const standings = getStandingsForSeason(identity);
  push(
    ...formatStandingsBlock("セ・リーグ", standings?.central),
  );
  blank();
  push(
    ...formatStandingsBlock("パ・リーグ", standings?.pacific),
  );
  blank();

  // シーズン優勝
  push("【シーズン優勝】");
  blank();
  const summary = getSeasonSummary(String(identity.year), identity);
  const champMap = new Map(summary.champions.map((c) => [c.id, c.teamName]));
  const champOrUnreg = (id: string) => {
    const v = champMap.get(id);
    return !v || isPlaceholderName(v) ? UNREG : v;
  };
  push(`セ・リーグ：${champOrUnreg("central")}`);
  push(`パ・リーグ：${champOrUnreg("pacific")}`);
  push(`交流戦：${champOrUnreg("interleague")}`);
  push(`日本一：${champOrUnreg("japan")}`);
  blank();

  // 主要表彰
  push("【主要表彰】");
  blank();
  const mvp = resolveMvpBoard(identity);
  const rookie = resolveRookieBoard(identity);
  const sawamura = resolveSawamuraBoard(identity);
  const jsMvp = getJapanSeriesMvp(identity);
  push(awardLine("セMVP", mvp.central));
  push(awardLine("パMVP", mvp.pacific));
  push(awardLine("セ新人王", rookie.central));
  push(awardLine("パ新人王", rookie.pacific));
  push(awardLine("沢村賞", sawamura.central));
  if (
    !isPlaceholderName(jsMvp.playerName) &&
    (jsMvp.playerId || jsMvp.playerName)
  ) {
    const name = playerName(jsMvp.playerId, jsMvp.playerName);
    const team = isPlaceholderName(jsMvp.teamName)
      ? ""
      : `（${jsMvp.teamName}）`;
    push(`日本シリーズMVP：${name}${team}`);
  } else {
    push(`日本シリーズMVP：${UNREG}`);
  }
  blank();

  // B9 / GG
  push("【ベストナイン】");
  blank();
  const b9 = resolveBestNineBoard(identity);
  const formatPosBoard = (
    leagueLabel: string,
    cards: typeof b9.central,
  ): string[] => {
    const out = [`■ ${leagueLabel}`];
    const registered = cards.filter(
      (c) => c.playerId && !isPlaceholderName(c.playerName),
    );
    if (!registered.length) {
      out.push(UNREG);
      return out;
    }
    for (const c of cards) {
      const pos = c.position || "—";
      if (!c.playerId || isPlaceholderName(c.playerName)) {
        out.push(`${pos}：${UNREG}`);
        continue;
      }
      if (c.playerName === NONE) {
        out.push(`${pos}：${NONE}`);
        continue;
      }
      out.push(
        `${pos}：${playerName(c.playerId, c.playerName)}（${c.teamName}）`,
      );
    }
    return out;
  };
  push(...formatPosBoard("セ・リーグ", b9.central));
  blank();
  push(...formatPosBoard("パ・リーグ", b9.pacific));
  blank();

  push("【ゴールデングラブ】");
  blank();
  const gg = resolveGoldenGloveBoard(identity);
  push(...formatPosBoard("セ・リーグ", gg.central));
  blank();
  push(...formatPosBoard("パ・リーグ", gg.pacific));
  blank();

  // 個人タイトル
  push("【個人タイトル】");
  blank();
  push("■ セ・リーグ / パ・リーグ（野手）");
  const batterTitles = buildTitleRankings(identity.year, "batter", {
    identity,
    persistHistory: false,
  });
  push(...formatTitleSections("batter", batterTitles));
  blank();
  push("■ セ・リーグ / パ・リーグ（投手）");
  const pitcherTitles = buildTitleRankings(identity.year, "pitcher", {
    identity,
    persistHistory: false,
  });
  push(...formatTitleSections("pitcher", pitcherTitles));
  blank();

  // Season lines
  const pennantLines = listSeasonLinesForSeason(identity).filter(
    (l) => l.scope === "pennant",
  );
  const batterLines = pennantLines.filter(
    (l): l is BatterSeasonLine => l.role === "batter",
  );
  const pitcherLines = pennantLines.filter(
    (l): l is PitcherSeasonLine => l.role === "pitcher",
  );

  const batterIds = new Set(batterLines.map((l) => l.playerId));
  const pitcherIds = new Set(pitcherLines.map((l) => l.playerId));
  const twoWayIds = [...batterIds].filter((id) => pitcherIds.has(id));

  const important = collectImportantPlayerIds(identity);
  for (const id of twoWayIds) {
    important.batters.add(id);
    important.pitchers.add(id);
  }

  const teamGamesCtx = buildTeamGamesContext({
    scope: "pennant",
    identity,
    year: identity.year,
    world: identity.world,
  });

  const selectedBatters = batterLines.filter((line) => {
    if (important.batters.has(line.playerId)) return true;
    const teamGames = resolveTeamGamesForPlayer(teamGamesCtx, line.teamId);
    const status = evaluatePaQualified({
      pa: line.counting.pa,
      teamGames,
      flag: line.counting.paQualified ?? null,
    });
    return status.known && status.qualified;
  });

  const selectedPitchers = pitcherLines.filter((line) => {
    if (important.pitchers.has(line.playerId)) return true;
    const sv = line.counting.sv ?? 0;
    const hp = line.counting.hp ?? line.counting.hld ?? 0;
    if (sv >= 10 || hp >= 20) return true;
    const teamGames = resolveTeamGamesForPlayer(teamGamesCtx, line.teamId);
    const status = evaluateIpQualified({
      ipOuts: line.counting.ipOuts,
      teamGames,
      flag: line.counting.ipQualified ?? null,
    });
    return status.known && status.qualified;
  });

  push("【主要野手成績】");
  blank();
  if (!selectedBatters.length) {
    push(UNREG);
  } else {
    for (const line of selectedBatters.sort((a, b) =>
      (b.derived.ops ?? 0) - (a.derived.ops ?? 0),
    )) {
      push(batterLineText(line));
    }
  }
  blank();

  push("【主要投手成績】");
  blank();
  if (!selectedPitchers.length) {
    push(UNREG);
  } else {
    for (const line of selectedPitchers.sort((a, b) => {
      const ea = a.derived.era ?? 999;
      const eb = b.derived.era ?? 999;
      return ea - eb;
    })) {
      push(pitcherLineText(line));
    }
  }
  blank();

  // 二刀流
  push("【二刀流】");
  blank();
  if (!twoWayIds.length) {
    push(UNREG);
  } else {
    for (const id of twoWayIds) {
      const b = batterLines.find((l) => l.playerId === id);
      const p = pitcherLines.find((l) => l.playerId === id);
      const name = playerName(
        id,
        b?.playerName ?? p?.playerName ?? id,
      );
      push(`■ ${name}`);
      if (b) push(`野手：${batterLineText(b)}`);
      else push(`野手：${UNREG}`);
      if (p) push(`投手：${pitcherLineText(p)}`);
      else push(`投手：${UNREG}`);
      blank();
    }
  }
  blank();

  // 記録・偉業
  push("【記録・偉業】");
  blank();
  const feats = buildYearFeats(identity).items;
  if (!feats.length) {
    push(UNREG);
  } else {
    const byCat = new Map<string, typeof feats>();
    for (const f of feats) {
      const list = byCat.get(f.category) ?? [];
      list.push(f);
      byCat.set(f.category, list);
    }
    for (const [cat, items] of byCat) {
      const catLabel =
        ACHIEVEMENT_CATEGORY_LABELS[
          cat as keyof typeof ACHIEVEMENT_CATEGORY_LABELS
        ] ?? cat;
      push(`■ ${catLabel}`);
      for (const f of items) {
        const name = playerName(f.playerId, f.playerName);
        const value =
          f.valueLabel?.trim() ||
          (f.value != null
            ? `${f.value}${f.unit ?? ""}`
            : UNREG);
        push(
          `${name}（${f.teamShort}） ${f.recordName} ${value}`,
        );
      }
      blank();
    }
  }
  blank();

  // SOP
  push("【SOPランキング】");
  blank();
  const sop = buildYearSopRankings(identity);
  const batterSop = limitSopRankingsForDisplay(
    sop.rankings,
    "batter",
    SOP_RANKING_DISPLAY_LIMIT,
  );
  const pitcherSop = limitSopRankingsForDisplay(
    sop.rankings,
    "pitcher",
    SOP_RANKING_DISPLAY_LIMIT,
  );

  push("■ 野手SOP TOP50");
  if (!batterSop.length) push(UNREG);
  else {
    for (const e of batterSop) {
      const name = playerName(e.result.playerId, e.result.playerName);
      push(
        `${e.rank}位 ${name}（${e.result.teamShort}） SOP ${e.result.total}`,
      );
    }
  }
  blank();

  push("■ 投手SOP TOP50");
  if (!pitcherSop.length) push(UNREG);
  else {
    for (const e of pitcherSop) {
      const name = playerName(e.result.playerId, e.result.playerName);
      push(
        `${e.rank}位 ${name}（${e.result.teamShort}） SOP ${e.result.total}`,
      );
    }
  }
  blank();

  push("■ SOP内訳（野手上位10）");
  blank();
  if (!batterSop.length) push(UNREG);
  else {
    for (const e of batterSop.slice(0, 10)) {
      push(...formatSopBreakdown(e.result));
      blank();
    }
  }

  push("■ SOP内訳（投手上位10）");
  blank();
  if (!pitcherSop.length) push(UNREG);
  else {
    for (const e of pitcherSop.slice(0, 10)) {
      push(...formatSopBreakdown(e.result));
      blank();
    }
  }

  // 日本シリーズ
  push("【日本シリーズ】");
  blank();
  const ps = getPostseasonView(identity);
  const js = ps.japanSeries;
  const hasJs =
    !isPlaceholderName(js.teamLeft) &&
    !isPlaceholderName(js.teamRight) &&
    (js.winsLeft > 0 || js.winsRight > 0 || (js.games?.length ?? 0) > 0);
  if (!hasJs && isPlaceholderName(js.champion)) {
    push(UNREG);
  } else {
    push(`${js.teamLeft} vs ${js.teamRight}`);
    if (!isPlaceholderName(js.champion)) {
      push(
        `優勝：${js.champion}（${js.winsLeft}勝${js.winsRight}敗 ※左=${js.teamLeft} / 右=${js.teamRight}）`,
      );
    } else {
      push(`勝敗：${js.winsLeft}-${js.winsRight}`);
    }
    if (js.games?.length) {
      for (const g of js.games) {
        push(
          `第${g.game}戦 ${js.teamLeft} ${g.scoreA} - ${g.scoreB} ${js.teamRight}`,
        );
      }
    } else if (js.gameMarks?.length) {
      push(
        `勝敗マーク（${js.teamLeft}視点）：${js.gameMarks.join(" ")}`,
      );
    }
    blank();
    push("MVP");
    if (isPlaceholderName(js.mvp.playerName)) {
      push(UNREG);
    } else {
      push(playerName(js.mvp.playerId, js.mvp.playerName));
      push(js.mvp.teamName || UNREG);
      if (js.mvp.avg) push(`打率 ${js.mvp.avg}`);
      if (js.mvp.hr != null) push(`本塁打 ${js.mvp.hr}`);
      if (js.mvp.rbi != null) push(`打点 ${js.mvp.rbi}`);
      if (js.mvp.note) push(js.mvp.note);
    }
  }
  blank();

  // 交流戦（MVPは出さない）
  push("【交流戦】");
  blank();
  const ilChamp = getInterleagueChampion(identity);
  const il = getInterleague(identity);
  if (isPlaceholderName(ilChamp) && !il?.standings?.length) {
    push(UNREG);
  } else {
    push(
      `交流戦優勝：${isPlaceholderName(ilChamp) ? UNREG : ilChamp}`,
    );
    if (il?.standings?.length) {
      push("最終順位：");
      for (const r of [...il.standings].sort((a, b) => a.rank - b.rank)) {
        push(
          `${r.rank}位 ${r.team}  ${r.w}勝${r.l}敗${r.d}分  勝率${r.pct}  差${r.gb}`,
        );
      }
    } else {
      push(`最終順位：${UNREG}`);
    }
  }
  blank();

  // 年表
  push("【年表】");
  blank();
  const ctx = buildYearbookSeasonContext(identity);
  const timelineFacts = ctx.factLines.filter(
    (f) => !f.startsWith("シーズン総評:"),
  );
  if (!timelineFacts.length) {
    push("年表：未登録");
  } else {
    push("（日付付き年表データは未登録。登録済み事実を時系列入口として列挙）");
    timelineFacts.forEach((f, i) => {
      push(`${i + 1}. ${f}`);
    });
  }
  blank();

  push("================================");
  push("END OF SEASON SOURCE");
  push("================================");

  return lines.join("\n");
}

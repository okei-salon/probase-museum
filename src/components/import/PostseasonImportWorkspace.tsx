"use client";

import { useMemo, useState } from "react";
import {
  ImportModeTabs,
  type ImportInputMode,
} from "@/components/import/ImportModeTabs";
import { ImportSubTabs } from "@/components/import/ImportSubTabs";
import { PartnerPastePanel } from "@/components/import/PartnerPastePanel";
import {
  POSTSEASON_IMPORT_SUBS,
  type PostseasonImportSubId,
} from "@/data/import/categories";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import { appendImportHistory } from "@/data/import/store";
import {
  getPostseason,
  hydratePostseasonFromCloud,
  placeholderSeason,
  upsertPostseasonSeasonAsync,
  type PostseasonSeason,
  type SeriesGameScore,
  type SeriesResult,
} from "@/data/postseason";
import {
  formatSeasonLineLabel,
  FORMAL_SEASON_START_YEAR,
  listEntrySeasonIdentities,
  makeSeasonKey,
  normalizeSeasonWorld,
  parseSeasonKey,
  type SeasonWorld,
} from "@/data/seasons";
import { npbTeams, type TeamId } from "@/data/teams";
import { parseNonSeasonPartnerPaste } from "@/lib/import/partnerPaste";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import { cn } from "@/lib/cn";

function resolveTeam(token: string): { name: string; id: TeamId | null } {
  const short = normalizeTeamShort(token);
  const hit =
    npbTeams.find((t) => t.short === short) ??
    npbTeams.find((t) => t.name === token.trim());
  return { name: hit?.short ?? (short || token.trim()), id: hit?.id ?? null };
}

function emptyGames(max: number): SeriesGameScore[] {
  return Array.from({ length: max }, (_, i) => ({
    game: i + 1,
    scoreA: 0,
    scoreB: 0,
  }));
}

/** 末尾の未入力（0-0）を落とし、実際に得点が入った試合までを残す */
function compactPlayedGames(games: SeriesGameScore[]): SeriesGameScore[] {
  let last = -1;
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (
      Number.isFinite(g.scoreA) &&
      Number.isFinite(g.scoreB) &&
      (g.scoreA > 0 || g.scoreB > 0)
    ) {
      last = i;
    }
  }
  return last >= 0 ? games.slice(0, last + 1) : [];
}

function seriesFromForm(input: {
  teamA: string;
  teamB: string;
  winsA: number;
  winsB: number;
  winner: string;
  games: SeriesGameScore[];
  advantageTeam?: string;
  advantageWins?: number;
}): SeriesResult {
  const a = resolveTeam(input.teamA);
  const b = resolveTeam(input.teamB);
  const w = resolveTeam(input.winner || input.teamA);
  const adv = input.advantageTeam
    ? resolveTeam(input.advantageTeam)
    : null;
  const filledGames = compactPlayedGames(input.games);
  return {
    teamA: a.name,
    teamB: b.name,
    teamAId: a.id,
    teamBId: b.id,
    winsA: input.winsA,
    winsB: input.winsB,
    winner: w.name,
    winnerId: w.id,
    games: filledGames.length > 0 ? filledGames : undefined,
    advantageTeam: adv?.name ?? null,
    advantageTeamId: adv?.id ?? null,
    advantageWins: input.advantageWins ?? 0,
  };
}

/**
 * ポストシーズン取込：CS / 日本シリーズ（手入力 + 相棒貼り付け）
 */
export function PostseasonImportWorkspace() {
  const identities = useMemo(
    () =>
      listEntrySeasonIdentities().filter(
        (i) => i.year >= FORMAL_SEASON_START_YEAR || i.kind === "formal",
      ),
    [],
  );
  const defaultKey =
    identities.find((i) => i.seasonKey === "BLUE_2026")?.seasonKey ??
    identities[0]?.seasonKey ??
    makeSeasonKey("BLUE", 2026);

  const [seasonKey, setSeasonKey] = useState(defaultKey);
  const [sub, setSub] = useState<PostseasonImportSubId>("cs_central");
  const [mode, setMode] = useState<ImportInputMode>("partner");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partnerText, setPartnerText] = useState("");

  const identity = parseSeasonKey(seasonKey);
  const year = identity?.year ?? 2026;
  const world: SeasonWorld | null = normalizeSeasonWorld(identity?.world);

  const [teamA, setTeamA] = useState("中日");
  const [teamB, setTeamB] = useState("巨人");
  const [winsA, setWinsA] = useState(1);
  const [winsB, setWinsB] = useState(2);
  const [winner, setWinner] = useState("巨人");
  const [advTeam, setAdvTeam] = useState("阪神");
  const [advWins, setAdvWins] = useState(1);
  const [games, setGames] = useState<SeriesGameScore[]>(() => emptyGames(6));

  const [jsLeft, setJsLeft] = useState("巨人");
  const [jsRight, setJsRight] = useState("ソフトバンク");
  const [jsWinsL, setJsWinsL] = useState(4);
  const [jsWinsR, setJsWinsR] = useState(3);
  const [jsChamp, setJsChamp] = useState("巨人");
  const [jsGames, setJsGames] = useState<SeriesGameScore[]>(() => emptyGames(7));
  const [mvpName, setMvpName] = useState("");
  const [mvpTeam, setMvpTeam] = useState("巨人");
  const [mvpAvg, setMvpAvg] = useState("");
  const [mvpHr, setMvpHr] = useState("");
  const [mvpRbi, setMvpRbi] = useState("");
  const [mvpNote, setMvpNote] = useState("");

  const label = formatSeasonLineLabel({ year, world });
  const teamOptions = npbTeams.map((t) => t.short);

  function updateGame(
    list: SeriesGameScore[],
    setList: (v: SeriesGameScore[]) => void,
    index: number,
    side: "scoreA" | "scoreB",
    value: string,
  ) {
    const next = list.map((g, i) =>
      i === index
        ? { ...g, [side]: Number(value.replace(/[^\d]/g, "") || 0) }
        : g,
    );
    setList(next);
  }

  async function loadBase(): Promise<PostseasonSeason> {
    await hydratePostseasonFromCloud();
    if (!identity) return placeholderSeason(String(year), world);
    return getPostseason(identity);
  }

  async function saveCs(stage: "first" | "final", league: "central" | "pacific") {
    if (shouldUseIsolatedDemoStore(year)) {
      setError("正式ポストシーズンは DEMO モードをオフにしてください");
      return;
    }
    setError(null);
    const base = await loadBase();
    const series = seriesFromForm({
      teamA,
      teamB,
      winsA,
      winsB,
      winner,
      games: stage === "first" ? games.slice(0, 3) : games.slice(0, 6),
      advantageTeam: stage === "final" ? advTeam : undefined,
      advantageWins: stage === "final" ? advWins : undefined,
    });
    const leagueRec = {
      ...(league === "central" ? base.central : base.pacific),
      league,
      leagueLabel: league === "central" ? "セ・リーグ" : "パ・リーグ",
      [stage]: series,
      representative:
        stage === "final"
          ? series.winner
          : league === "central"
            ? base.central.representative
            : base.pacific.representative,
      representativeId:
        stage === "final"
          ? series.winnerId
          : league === "central"
            ? base.central.representativeId
            : base.pacific.representativeId,
    };
    const next: PostseasonSeason = {
      ...base,
      year: String(year),
      world,
      source: "import",
      central: league === "central" ? leagueRec : base.central,
      pacific: league === "pacific" ? leagueRec : base.pacific,
    };
    const { cloud } = await upsertPostseasonSeasonAsync(next);
    appendImportHistory({
      id: `hist-ps-${Date.now()}`,
      at: new Date().toISOString(),
      year,
      fileName: "postseason-cs",
      screenType: "postseason",
      summary: `${label} CS ${league} ${stage}`,
      recordIds: [next.id ?? `${world}:${year}`],
    });
    notifyImportStoreChanged();
    setMessage(
      cloud.ok
        ? `${label} クライマックスシリーズを共有DBへ保存しました`
        : `${label} をこの端末に保存しました（クラウド同期失敗: ${cloud.error ?? "error"}）`,
    );
  }

  async function saveJapanSeries() {
    if (shouldUseIsolatedDemoStore(year)) {
      setError("正式ポストシーズンは DEMO モードをオフにしてください");
      return;
    }
    setError(null);
    const base = await loadBase();
    const left = resolveTeam(jsLeft);
    const right = resolveTeam(jsRight);
    const champ = resolveTeam(jsChamp || jsLeft);
    const mvpT = resolveTeam(mvpTeam || jsChamp);
    const filled = compactPlayedGames(jsGames);
    const gameMarks = filled.map((g) =>
      g.scoreA > g.scoreB ? ("W" as const) : ("L" as const),
    );
    const next: PostseasonSeason = {
      ...base,
      year: String(year),
      world,
      source: "import",
      japanSeries: {
        ...base.japanSeries,
        year: String(year),
        world,
        teamLeft: left.name,
        teamRight: right.name,
        teamLeftId: left.id,
        teamRightId: right.id,
        winsLeft: jsWinsL,
        winsRight: jsWinsR,
        games: filled,
        gameMarks,
        champion: champ.name,
        championId: champ.id,
        mvp: {
          ...base.japanSeries.mvp,
          award: "japan-series-mvp",
          year: String(year),
          world,
          playerId: null,
          playerName: mvpName || "登録待ち",
          teamId: mvpT.id,
          teamName: mvpT.name,
          avg: mvpAvg || null,
          hr: mvpHr ? Number(mvpHr) : null,
          rbi: mvpRbi ? Number(mvpRbi) : null,
          note: mvpNote || null,
        },
      },
    };
    const { cloud } = await upsertPostseasonSeasonAsync(next);
    appendImportHistory({
      id: `hist-ps-js-${Date.now()}`,
      at: new Date().toISOString(),
      year,
      fileName: "postseason-js",
      screenType: "postseason",
      summary: `${label} 日本シリーズ`,
      recordIds: [next.id ?? `${world}:${year}`],
    });
    notifyImportStoreChanged();
    setMessage(
      cloud.ok
        ? `${label} 日本シリーズを共有DBへ保存しました`
        : `${label} をこの端末に保存しました（クラウド同期失敗: ${cloud.error ?? "error"}）`,
    );
  }

  async function applyPartnerPaste() {
    setError(null);
    setMessage(null);
    try {
      const parsed = parseNonSeasonPartnerPaste(partnerText, year);
      if (parsed.kind === "unsupported") {
        setError(parsed.message);
        return;
      }
      if (parsed.kind === "climax_series") {
        const w =
          parsed.world ?? world ?? ("BLUE" as SeasonWorld);
        setSeasonKey(makeSeasonKey(w, parsed.year));
        setSub(
          parsed.league === "central"
            ? parsed.stage === "final"
              ? "cs_central_final"
              : "cs_central"
            : parsed.stage === "final"
              ? "cs_pacific_final"
              : "cs_pacific",
        );
        setTeamA(parsed.teamA);
        setTeamB(parsed.teamB);
        setWinsA(parsed.winsA);
        setWinsB(parsed.winsB);
        setWinner(parsed.winner);
        setAdvTeam(parsed.advantageTeam ?? "");
        setAdvWins(parsed.advantageWins);
        const max = parsed.stage === "first" ? 3 : 6;
        const nextGames = emptyGames(max).map((g) => {
          const hit = parsed.games.find((x) => x.game === g.game);
          return hit ?? g;
        });
        setGames(nextGames);
        setMessage(`${parsed.message}（確認後「登録」してください）`);
        setMode("manual");
        return;
      }
      if (parsed.kind === "japan_series") {
        const w =
          parsed.world ?? world ?? ("BLUE" as SeasonWorld);
        setSeasonKey(makeSeasonKey(w, parsed.year));
        setSub("japan_series");
        setJsLeft(parsed.teamLeft);
        setJsRight(parsed.teamRight);
        setJsWinsL(parsed.winsLeft);
        setJsWinsR(parsed.winsRight);
        setJsChamp(parsed.champion);
        setJsGames(
          emptyGames(7).map((g) => {
            const hit = parsed.games.find((x) => x.game === g.game);
            return hit ?? g;
          }),
        );
        setMvpName(parsed.mvpName);
        setMvpTeam(parsed.mvpTeam);
        setMvpAvg(parsed.mvpAvg ?? "");
        setMvpHr(parsed.mvpHr != null ? String(parsed.mvpHr) : "");
        setMvpRbi(parsed.mvpRbi != null ? String(parsed.mvpRbi) : "");
        setMvpNote(parsed.mvpNote ?? "");
        setMessage(`${parsed.message}（確認後「登録」してください）`);
        setMode("manual");
        return;
      }
      setError("ポストシーズンでは TYPE=CLIMAX_SERIES / JAPAN_SERIES を使用してください");
    } catch (e) {
      setError(e instanceof Error ? e.message : "貼り付け解析に失敗しました");
    }
  }

  const isCs = sub.startsWith("cs_");
  const csLeague: "central" | "pacific" = sub.includes("pacific")
    ? "pacific"
    : "central";
  const csStage: "first" | "final" = sub.includes("final") ? "final" : "first";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[12px] text-white/70">
          シーズン
          <select
            value={seasonKey}
            onChange={(e) => setSeasonKey(e.target.value)}
            className="mt-1 block rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
          >
            {identities.map((i) => (
              <option key={i.seasonKey} value={i.seasonKey}>
                {formatSeasonLineLabel(i)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ImportSubTabs
        options={POSTSEASON_IMPORT_SUBS}
        value={sub}
        onChange={(v) => setSub(v as PostseasonImportSubId)}
      />

      <ImportModeTabs
        value={mode}
        onChange={setMode}
        modes={["partner", "manual"]}
      />

      {message ? (
        <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
          {error}
        </p>
      ) : null}

      {mode === "partner" ? (
        <PartnerPastePanel
          value={partnerText}
          onChange={setPartnerText}
          onExpand={() => void applyPartnerPaste()}
          exampleKey={
            sub === "japan_series" ? "JAPAN_SERIES" : "CLIMAX_SERIES"
          }
          hint="TYPE=CLIMAX_SERIES または TYPE=JAPAN_SERIES"
        />
      ) : null}

      {mode === "manual" || mode === "partner" ? (
        <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
          {isCs ? (
            <>
              <p className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
                {csLeague === "central" ? "セ・リーグ" : "パ・リーグ"}{" "}
                {csStage === "first" ? "ファーストステージ" : "ファイナルステージ"}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <TeamSelect label="チームA" value={teamA} onChange={setTeamA} options={teamOptions} />
                <TeamSelect label="チームB" value={teamB} onChange={setTeamB} options={teamOptions} />
                <NumberField label="チームA勝数" value={winsA} onChange={setWinsA} />
                <NumberField label="チームB勝数" value={winsB} onChange={setWinsB} />
                <TeamSelect label="勝ち抜け" value={winner} onChange={setWinner} options={teamOptions} />
                {csStage === "final" ? (
                  <>
                    <TeamSelect
                      label="アドバンテージ対象"
                      value={advTeam}
                      onChange={setAdvTeam}
                      options={teamOptions}
                    />
                    <NumberField
                      label="アドバンテージ勝数"
                      value={advWins}
                      onChange={setAdvWins}
                    />
                  </>
                ) : null}
              </div>
              <GameScoreEditor
                games={games.slice(0, csStage === "first" ? 3 : 6)}
                teamA={teamA}
                teamB={teamB}
                onChange={(idx, side, val) =>
                  updateGame(games, setGames, idx, side, val)
                }
              />
              <button
                type="button"
                onClick={() => void saveCs(csStage, csLeague)}
                className="rounded-md border border-[color:var(--museum-accent,#d4af37)]/50 bg-[color:var(--museum-accent,#d4af37)]/15 px-4 py-2 text-[13px] text-[color:var(--museum-accent,#d4af37)]"
              >
                クライマックスシリーズを登録
              </button>
            </>
          ) : (
            <>
              <p className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
                日本シリーズ
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <TeamSelect label="セ・リーグ代表" value={jsLeft} onChange={setJsLeft} options={teamOptions} />
                <TeamSelect label="パ・リーグ代表" value={jsRight} onChange={setJsRight} options={teamOptions} />
                <NumberField label="セ代表勝数" value={jsWinsL} onChange={setJsWinsL} />
                <NumberField label="パ代表勝数" value={jsWinsR} onChange={setJsWinsR} />
                <TeamSelect label="日本一" value={jsChamp} onChange={setJsChamp} options={teamOptions} />
              </div>
              <GameScoreEditor
                games={jsGames}
                teamA={jsLeft}
                teamB={jsRight}
                onChange={(idx, side, val) =>
                  updateGame(jsGames, setJsGames, idx, side, val)
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="MVP選手名" value={mvpName} onChange={setMvpName} />
                <TeamSelect label="MVP所属" value={mvpTeam} onChange={setMvpTeam} options={teamOptions} />
                <TextField label="打率" value={mvpAvg} onChange={setMvpAvg} />
                <TextField label="本塁打" value={mvpHr} onChange={setMvpHr} />
                <TextField label="打点" value={mvpRbi} onChange={setMvpRbi} />
              </div>
              <label className="block text-[12px] text-white/70">
                MVP補足
                <textarea
                  value={mvpNote}
                  onChange={(e) => setMvpNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveJapanSeries()}
                className="rounded-md border border-[color:var(--museum-accent,#d4af37)]/50 bg-[color:var(--museum-accent,#d4af37)]/15 px-4 py-2 text-[13px] text-[color:var(--museum-accent,#d4af37)]"
              >
                日本シリーズを登録
              </button>
            </>
          )}
        </div>
      ) : null}

      <p className="text-[11px] text-white/45">
        Museum表示: /seasons/{seasonKey}/postseason
      </p>
    </div>
  );
}

function TeamSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-[12px] text-white/70">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-[12px] text-white/70">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 block w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-[12px] text-white/70">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
      />
    </label>
  );
}

function GameScoreEditor({
  games,
  teamA,
  teamB,
  onChange,
}: {
  games: SeriesGameScore[];
  teamA: string;
  teamB: string;
  onChange: (index: number, side: "scoreA" | "scoreB", value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-white/60">試合スコア</p>
      {games.map((g, i) => (
        <div key={g.game} className="flex flex-wrap items-center gap-2 text-[13px] text-white">
          <span className="w-14 text-white/55">第{g.game}戦</span>
          <span className="w-16 truncate text-white/70">{teamA}</span>
          <input
            type="number"
            min={0}
            value={g.scoreA}
            onChange={(e) => onChange(i, "scoreA", e.target.value)}
            className={cn(
              "w-16 rounded border border-white/15 bg-black/50 px-2 py-1 text-center",
            )}
          />
          <span className="text-white/45">-</span>
          <input
            type="number"
            min={0}
            value={g.scoreB}
            onChange={(e) => onChange(i, "scoreB", e.target.value)}
            className="w-16 rounded border border-white/15 bg-black/50 px-2 py-1 text-center"
          />
          <span className="w-16 truncate text-white/70">{teamB}</span>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildYearbookFullExport,
  downloadYearbookExportFile,
  type YearbookFullExportSummary,
} from "@/data/yearbookFullExport";
import {
  formatSeasonLineLabel,
  parseSeasonKey,
  type SeasonIdentity,
} from "@/data/seasons";
import { hydrateSeasonReviewSources } from "@/data/seasonReview";
import { hydratePlayerMasterFromCloud } from "@/data/playerMaster";
import { hydrateSopAwardsFromCloud } from "@/data/sop";
import { hydrateTeamStandingsFromCloud } from "@/data/teamStandings";
import { hydrateStandingsHistoryFromCloud } from "@/data/standingsHistory";
import { hydratePostseasonFromCloud } from "@/data/postseason";
import { hydrateInterleagueFromCloud } from "@/data/interleague";
import { hydrateSeasonLinesFromCloud } from "@/data/playerSeasonLines";
import { hydrateSeasonAchievementsFromCloud } from "@/data/seasonAchievements";
import { hydrateTeamSeasonStatsFromCloud } from "@/data/teamSeasonStats";
import { cn } from "@/lib/cn";

type Props = {
  seasonKey: string;
  className?: string;
};

/**
 * YEARBOOK 分析用フルデータ書き出し（読み取り専用）。
 * 既存の「シーズン資料をコピー」とは別機能。
 */
export function YearbookFullExportPanel({ seasonKey, className }: Props) {
  const identity: SeasonIdentity | null = useMemo(
    () => parseSeasonKey(seasonKey),
    [seasonKey],
  );

  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<YearbookFullExportSummary | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.allSettled([
        hydrateSeasonReviewSources(),
        hydratePlayerMasterFromCloud(),
        hydrateSopAwardsFromCloud(),
        hydrateTeamStandingsFromCloud(),
        hydrateStandingsHistoryFromCloud(),
        hydratePostseasonFromCloud(),
        hydrateInterleagueFromCloud(),
        hydrateSeasonLinesFromCloud(),
        hydrateSeasonAchievementsFromCloud(),
        hydrateTeamSeasonStatsFromCloud(),
      ]);
      if (cancelled || !identity) return;
      try {
        const bundle = buildYearbookFullExport(identity);
        setSummary(bundle.payload.summary);
        setReady(true);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "エクスポート準備に失敗しました",
        );
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  const label = identity ? formatSeasonLineLabel(identity) : seasonKey;

  function runExport(kind: "json" | "txt") {
    setError(null);
    setMessage(null);
    if (!identity) {
      setError("シーズンを特定できません");
      return;
    }
    setBusy(true);
    try {
      const bundle = buildYearbookFullExport(identity);
      setSummary(bundle.payload.summary);
      if (kind === "json") {
        downloadYearbookExportFile(
          `${bundle.filenameBase}.json`,
          bundle.jsonText,
          "application/json;charset=utf-8",
        );
        setMessage(`${label} の JSON を書き出しました`);
      } else {
        downloadYearbookExportFile(
          `${bundle.filenameBase}.txt`,
          bundle.txtText,
          "text/plain;charset=utf-8",
        );
        setMessage(`${label} の TXT を書き出しました`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "書き出しに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  if (!identity) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        シーズンを特定できません。
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-white/12 bg-black/50 px-4 py-4",
        className,
      )}
    >
      <p className="text-[10px] tracking-[0.18em] text-museum-gold/85">
        YEARBOOK FULL EXPORT
      </p>
      <h3 className="mt-1 text-[15px] font-medium text-museum-ivory">
        YEARBOOK用フルデータ
      </h3>
      <p className="mt-1 text-[13px] text-museum-ivory">{label}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-museum-ivory-soft">
        選択中の YEAR / WORLD に保存されているシーズンデータを、分析用に
        1ファイルへ集約して書き出します。既存データは変更しません。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => runExport("json")}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px]",
            !ready || busy
              ? "border-white/10 text-white/30"
              : "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]",
          )}
        >
          JSONを書き出す
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => runExport("txt")}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px]",
            !ready || busy
              ? "border-white/10 text-white/30"
              : "border-white/20 text-white/80 hover:border-white/35",
          )}
        >
          TXTを書き出す
        </button>
      </div>

      {summary ? (
        <ul className="mt-3 grid gap-1 text-[12px] text-museum-ivory-soft sm:grid-cols-2">
          <li>野手 {summary.batters}人</li>
          <li>投手 {summary.pitchers}人</li>
          <li>捕手（阻止データ） {summary.catchers}人</li>
          <li>チーム {summary.teams}球団</li>
          <li>表彰枠 {summary.awards}件</li>
          <li>記録・偉業 {summary.records}件</li>
          <li>SOP対象 {summary.sopPlayers}人</li>
          <li>二刀流候補 {summary.twoWayPlayers}人</li>
          <li>月間MVP {summary.monthlyMvp}件</li>
          <li>最終順位 {summary.hasStandings ? "あり" : "なし"}</li>
          <li>月次順位 {summary.hasMonthlyStandings ? "あり" : "なし"}</li>
          <li>交流戦 {summary.hasInterleague ? "あり" : "なし"}</li>
          <li>ポストシーズン {summary.hasPostseason ? "あり" : "なし"}</li>
          <li>
            SEASON_REVIEW{" "}
            {summary.hasSeasonReview
              ? [
                  summary.seasonReviewSections?.general ? "総評" : null,
                  summary.seasonReviewSections?.central ? "セ" : null,
                  summary.seasonReviewSections?.pacific ? "パ" : null,
                  summary.seasonReviewSections?.teams ? "12球団" : null,
                ]
                  .filter(Boolean)
                  .join("・") || "あり"
              : "なし"}
          </li>
        </ul>
      ) : null}

      {summary?.missingNotes?.length ? (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-200/85">
          欠落メモ: {summary.missingNotes.join(" / ")}
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 text-[12px] text-emerald-300/90">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[12px] text-amber-200">{error}</p>
      ) : null}

      {!ready ? (
        <p className="mt-3 text-[12px] text-white/45">データ準備中…</p>
      ) : null}
    </div>
  );
}

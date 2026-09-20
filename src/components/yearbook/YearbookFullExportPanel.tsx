"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
 * マウント時は集計しない。JSON／TXT 書き出しクリック時のみ hydrate + build。
 */
export function YearbookFullExportPanel({ seasonKey, className }: Props) {
  const identity: SeasonIdentity | null = useMemo(
    () => parseSeasonKey(seasonKey),
    [seasonKey],
  );

  const [summary, setSummary] = useState<YearbookFullExportSummary | null>(
    null,
  );
  const [summaryForKey, setSummaryForKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // YEAR/WORLD 切替時は旧サマリを破棄。生成は開始しない。
  useEffect(() => {
    setSummary(null);
    setSummaryForKey(null);
    setMessage(null);
    setError(null);
    setBusy(false);
    busyRef.current = false;
  }, [seasonKey]);

  const label = identity ? formatSeasonLineLabel(identity) : seasonKey;
  const visibleSummary =
    summary && summaryForKey === seasonKey ? summary : null;

  async function runExport(kind: "json" | "txt") {
    setError(null);
    setMessage(null);
    if (!identity) {
      setError("シーズンを特定できません");
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
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
      const bundle = buildYearbookFullExport(identity);
      setSummary(bundle.payload.summary);
      setSummaryForKey(identity.seasonKey);
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
      busyRef.current = false;
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
        集計は書き出しボタンを押したときのみ実行します。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runExport("json")}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px]",
            busy
              ? "border-white/10 text-white/30"
              : "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]",
          )}
        >
          JSONを書き出す
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runExport("txt")}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px]",
            busy
              ? "border-white/10 text-white/30"
              : "border-white/20 text-white/80 hover:border-white/35",
          )}
        >
          TXTを書き出す
        </button>
      </div>

      {visibleSummary ? (
        <ul className="mt-3 grid gap-1 text-[12px] text-museum-ivory-soft sm:grid-cols-2">
          <li>野手 {visibleSummary.batters}人</li>
          <li>投手 {visibleSummary.pitchers}人</li>
          <li>捕手（阻止データ） {visibleSummary.catchers}人</li>
          <li>チーム {visibleSummary.teams}球団</li>
          <li>表彰枠 {visibleSummary.awards}件</li>
          <li>記録・偉業 {visibleSummary.records}件</li>
          <li>SOP対象 {visibleSummary.sopPlayers}人</li>
          <li>二刀流候補 {visibleSummary.twoWayPlayers}人</li>
          <li>月間MVP {visibleSummary.monthlyMvp}件</li>
          <li>最終順位 {visibleSummary.hasStandings ? "あり" : "なし"}</li>
          <li>
            月次順位 {visibleSummary.hasMonthlyStandings ? "あり" : "なし"}
          </li>
          <li>交流戦 {visibleSummary.hasInterleague ? "あり" : "なし"}</li>
          <li>
            ポストシーズン {visibleSummary.hasPostseason ? "あり" : "なし"}
          </li>
          <li>
            SEASON_REVIEW{" "}
            {visibleSummary.hasSeasonReview
              ? [
                  visibleSummary.seasonReviewSections?.general
                    ? "総評"
                    : null,
                  visibleSummary.seasonReviewSections?.central ? "セ" : null,
                  visibleSummary.seasonReviewSections?.pacific ? "パ" : null,
                  visibleSummary.seasonReviewSections?.teams
                    ? "12球団"
                    : null,
                  visibleSummary.seasonReviewSections?.title
                    ? "タイトル"
                    : null,
                ]
                  .filter(Boolean)
                  .join("・") || "あり"
              : "なし"}
          </li>
        </ul>
      ) : null}

      {visibleSummary?.missingNotes?.length ? (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-200/85">
          欠落メモ: {visibleSummary.missingNotes.join(" / ")}
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 text-[12px] text-emerald-300/90">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[12px] text-amber-200">{error}</p>
      ) : null}

      {busy ? (
        <p className="mt-3 text-[12px] text-white/45">データ準備中…</p>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getPlayerMaster } from "@/data/playerMaster";
import {
  buildPlayerAwardSummary,
  buildPlayerSopCareer,
  buildTeamTimeline,
  getCurrentTeamShort,
  getPlayerDisplayPosition,
} from "@/data/playerDetail";
import { listSeasonLinesByPlayer } from "@/data/playerSeasonLines";
import { cn } from "@/lib/cn";

type PlayerProfileBoardProps = {
  playerId: string;
  fallbackName: string;
  fallbackTeam: string;
  fallbackPosition: string;
};

export function PlayerProfileBoard({
  playerId,
  fallbackName,
  fallbackTeam,
  fallbackPosition,
}: PlayerProfileBoardProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, [playerId]);

  const master = ready ? getPlayerMaster(playerId) : null;
  const name = master?.fullName ?? fallbackName;
  const team = ready
    ? getCurrentTeamShort(playerId) ?? fallbackTeam
    : fallbackTeam;
  const position = ready
    ? getPlayerDisplayPosition(playerId) ?? fallbackPosition
    : fallbackPosition;

  const timeline = useMemo(
    () => (ready ? buildTeamTimeline(playerId) : []),
    [ready, playerId],
  );
  const awards = useMemo(
    () => (ready ? buildPlayerAwardSummary(playerId) : []),
    [ready, playerId],
  );
  const sop = useMemo(
    () => (ready ? buildPlayerSopCareer(playerId) : null),
    [ready, playerId],
  );
  const hasLines = useMemo(
    () =>
      ready
        ? listSeasonLinesByPlayer(playerId).some((l) => l.scope === "pennant")
        : false,
    [ready, playerId],
  );

  if (!ready) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] tracking-[0.18em] text-museum-ivory-soft">
          PLAYER PROFILE
        </p>
        <h3 className="font-display text-[28px] tracking-[0.04em] text-museum-ivory md:text-[32px]">
          {name}
        </h3>
        <p className="text-[14px] text-museum-ivory-soft">
          {team}
          <span className="mx-2 opacity-40">/</span>
          {position}
        </p>
      </header>

      {timeline.length > 0 ? (
        <Section title="所属球団の推移">
          <ul className="space-y-1.5">
            {timeline.map((t) => (
              <li
                key={`${t.teamId}-${t.fromYear}`}
                className="text-[13px] text-museum-ivory"
              >
                {t.label}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {awards.length > 0 ? (
        <Section title="主要タイトル／表彰">
          <ul className="space-y-1.5">
            {awards.map((a) => (
              <li key={a.key} className="text-[13px] text-museum-ivory">
                {a.display}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {sop && sop.careerTotal != null ? (
        <Section title="SOP概要">
          <div className="grid gap-3 sm:grid-cols-3">
            <SopStat
              label="通算SOP"
              value={`${sop.careerTotal}pt`}
            />
            <SopStat
              label="歴代順位"
              value={
                sop.careerRank != null ? `${sop.careerRank}位` : "—"
              }
            />
            <SopStat
              label="最高シーズン"
              value={
                sop.bestSeason
                  ? `${sop.bestSeason.points}pt`
                  : "—"
              }
              sub={
                sop.bestSeason
                  ? `${sop.bestSeason.seasonLabel}・年度${sop.bestSeason.yearRank}位`
                  : undefined
              }
            />
          </div>
        </Section>
      ) : hasLines ? (
        <Section title="SOP概要">
          <p className="text-[13px] text-museum-ivory-soft">
            SOPを計算できる成績がありますが、集計結果がまだありません。
          </p>
        </Section>
      ) : null}

      {!timeline.length && !awards.length && sop?.careerTotal == null ? (
        <p className="text-[13px] text-museum-ivory-soft">
          表示できる所属・表彰・SOPデータはまだありません。年度成績や表彰の登録後に反映されます。
        </p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/12 bg-black/45 p-4">
      <h4 className="mb-3 text-[11px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
        {title}
      </h4>
      {children}
    </section>
  );
}

function SopStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-black/40 px-3 py-3",
      )}
    >
      <p className="text-[10px] tracking-[0.12em] text-museum-ivory-soft">
        {label}
      </p>
      <p className="mt-1 font-display text-[20px] text-[color:var(--museum-accent,#d4af37)]">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-[11px] text-museum-ivory-soft">{sub}</p>
      ) : null}
    </div>
  );
}

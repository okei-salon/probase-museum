"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import {
  buildTitleRankings,
  type TitleRankEntry,
  type TitleRole,
  type TitleSection,
} from "@/data/titleRankings";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import { identityFromSeasonKey } from "@/data/sop/seasonAwardsView";
import { cn } from "@/lib/cn";

type TitleRankingsBoardProps = {
  year: string;
  seasonKey?: string;
};

export function TitleRankingsBoard({
  year,
  seasonKey,
}: TitleRankingsBoardProps) {
  const y = Number(year);
  const [role, setRole] = useState<TitleRole>("batter");
  const [tick, setTick] = useState(0);
  const identity = useMemo(
    () => identityFromSeasonKey(seasonKey ?? year, year),
    [seasonKey, year],
  );

  useEffect(() => {
    hydratePlayerMasterFromStorage();
    setTick((t) => t + 1);
  }, [year, role, seasonKey]);

  const result = useMemo(() => {
    void tick;
    return buildTitleRankings(y, role, {
      persistHistory: true,
      identity,
    });
  }, [y, role, tick, identity]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <RoleTab
          active={role === "batter"}
          onClick={() => setRole("batter")}
          label="野手"
        />
        <RoleTab
          active={role === "pitcher"}
          onClick={() => setRole("pitcher")}
          label="投手"
        />
      </div>

      {result.usingSample ? (
        <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100/90">
          登録済みの年度個人成績が少ないため、選手マスターに基づくサンプル成績でランキングを表示しています。手入力で年度成績を登録すると、そのデータが優先されます。
        </p>
      ) : null}

      <div className="space-y-10">
        {result.sections.map((section) => (
          <TitleBlock key={section.def.id} section={section} />
        ))}
      </div>

      {result.dataGaps.length > 0 ? (
        <details className="rounded-xl border border-white/10 bg-black/40 p-4">
          <summary className="cursor-pointer text-[12px] tracking-[0.1em] text-white/55">
            集計条件・データ不足について
          </summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[12px] text-white/60">
            {result.dataGaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function RoleTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-5 py-2 text-[13px] tracking-[0.08em] transition-colors",
        active
          ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
          : "border-white/15 bg-black/40 text-white/65 hover:border-white/30",
      )}
    >
      {label}
    </button>
  );
}

function TitleBlock({ section }: { section: TitleSection }) {
  const { def, board, unavailable, note } = section;
  return (
    <section className="scroll-mt-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[color:var(--museum-accent,#d4af37)]/45 to-transparent" />
        <h2 className="shrink-0 text-[15px] tracking-[0.2em] text-[color:var(--museum-accent,#d4af37)] md:text-[16px]">
          {def.label}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[color:var(--museum-accent,#d4af37)]/45 to-transparent" />
      </div>

      {note ? (
        <p className="mb-3 text-center text-[11px] text-white/40">{note}</p>
      ) : null}

      {unavailable ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-black/35 px-4 py-8 text-center text-[13px] text-white/45">
          このタイトルは必要な成績項目が未収録のため、現時点ではランキングを生成できません。
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <LeagueColumn label="セ・リーグ" entries={board.central} />
          <LeagueColumn label="パ・リーグ" entries={board.pacific} />
        </div>
      )}
    </section>
  );
}

function LeagueColumn({
  label,
  entries,
}: {
  label: string;
  entries: TitleRankEntry[];
}) {
  const first = entries.find((e) => e.rank === 1) ?? null;
  const rest = entries.filter((e) => e.rank > 1);

  return (
    <div className="min-w-0">
      <p className="mb-2.5 text-center text-[11px] tracking-[0.16em] text-white/50">
        {label}
      </p>
      {first ? <FirstPlaceCard entry={first} /> : (
        <p className="rounded-lg border border-dashed border-white/12 px-3 py-6 text-center text-[12px] text-white/40">
          該当選手なし
        </p>
      )}
      {rest.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {rest.map((e) => (
            <li key={e.playerId + e.rank}>
              <RankRow entry={e} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FirstPlaceCard({ entry }: { entry: TitleRankEntry }) {
  return (
    <div className="rounded-xl border border-[color:var(--museum-accent,#d4af37)]/55 bg-gradient-to-b from-[color:var(--museum-accent,#d4af37)]/18 to-black/50 px-4 py-4 text-center shadow-[0_0_24px_rgba(212,175,55,0.08)]">
      <div className="flex items-center justify-center gap-1.5 text-[11px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
        <Crown className="h-3.5 w-3.5" aria-hidden />
        <span>1位</span>
      </div>
      <p className="mt-2">
        <PlayerLink
          playerId={entry.playerId}
          className="text-[20px] font-medium leading-tight text-white md:text-[22px]"
        >
          {entry.playerName}
        </PlayerLink>
      </p>
      <p className="mt-1 text-[13px] text-white/65">{entry.teamShort}</p>
      <p className="mt-2 text-[26px] font-semibold tabular-nums tracking-wide text-[color:var(--museum-accent,#d4af37)] md:text-[28px]">
        {entry.valueText}
      </p>
      {entry.historyLabel ? (
        <p className="mt-2 inline-block rounded-full border border-[color:var(--museum-accent,#d4af37)]/45 px-2.5 py-0.5 text-[11px] text-[color:var(--museum-accent,#d4af37)]">
          {entry.historyLabel}
        </p>
      ) : null}
    </div>
  );
}

function RankRow({ entry }: { entry: TitleRankEntry }) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-baseline gap-x-2 rounded-md px-1.5 py-1 text-[12px] md:grid-cols-[2.25rem_minmax(0,1fr)_7rem_4.75rem] md:gap-x-2.5 md:text-[13px]">
      <span className="tabular-nums text-white/45">{entry.rank}位</span>
      <PlayerLink
        playerId={entry.playerId}
        className="min-w-0 truncate font-medium text-white/90 hover:text-[color:var(--museum-accent,#d4af37)]"
      >
        {entry.playerName}
      </PlayerLink>
      <span className="whitespace-nowrap text-[11px] text-white/55 md:text-[12px]">
        {entry.teamShort}
      </span>
      <span className="text-right tabular-nums text-white/85">
        {entry.valueText}
      </span>
    </div>
  );
}

function PlayerLink({
  playerId,
  className,
  children,
}: {
  playerId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`/players/${playerId}/yearly`} className={className}>
      {children}
    </Link>
  );
}

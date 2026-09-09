"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  buildYearSopRankings,
  listSopSeasonIdentities,
} from "@/data/sop";
import { formatSeasonLineLabel, type SeasonIdentity } from "@/data/seasons";
import {
  SopCategoryBlocks,
} from "@/components/seasons/SeasonSopBoard";
import { RoleTabs } from "@/components/sop/RoleTabs";
import {
  buildOverallSeasonSopRankings,
  groupSopItemsByCategory,
  limitSopRankingsForDisplay,
  overallClassificationLabel,
  type SopOverallRankEntry,
  type SopRole,
} from "@/lib/sop";
import { cn } from "@/lib/cn";

type RoleFilter = "all" | SopRole;

export function SopSeasonHubBoard() {
  const [ready, setReady] = useState(false);
  const [seasons, setSeasons] = useState<SeasonIdentity[]>([]);
  const [seasonKey, setSeasonKey] = useState<string | null>(null);
  const [role, setRole] = useState<RoleFilter>("all");
  const [selectedOverall, setSelectedOverall] =
    useState<SopOverallRankEntry | null>(null);
  const detailRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    const list = listSopSeasonIdentities();
    setSeasons(list);
    setSeasonKey(list[0]?.seasonKey ?? null);
    setReady(true);
  }, []);

  const identity = useMemo(
    () => seasons.find((s) => s.seasonKey === seasonKey) ?? null,
    [seasons, seasonKey],
  );

  const { rankings, results, notes } = useMemo(() => {
    if (!ready || !identity) {
      return { rankings: [], results: [], notes: [] as string[] };
    }
    return buildYearSopRankings(identity);
  }, [ready, identity]);

  const overallRows = useMemo(
    () => buildOverallSeasonSopRankings(results),
    [results],
  );

  const roleRows = useMemo(() => {
    if (role === "all") return [];
    return limitSopRankingsForDisplay(rankings, role);
  }, [rankings, role]);

  useEffect(() => {
    setSelectedOverall(null);
  }, [seasonKey, role]);

  useEffect(() => {
    if (!selectedOverall || !detailRef.current) return;
    detailRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedOverall]);

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  if (seasons.length === 0 || !identity) {
    return (
      <div className="space-y-2">
        <p className="text-[13px] text-museum-ivory-soft">
          シーズンSOPを計算できる個人成績がまだありません。
        </p>
        <Link
          href="/import"
          className="text-[12px] text-[color:var(--museum-accent,#d4af37)] underline-offset-2 hover:underline"
        >
          手入力・画像取込で個人成績を登録
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {seasons.map((s) => (
          <button
            key={s.seasonKey}
            type="button"
            onClick={() => setSeasonKey(s.seasonKey)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors",
              seasonKey === s.seasonKey
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {formatSeasonLineLabel(s)}
          </button>
        ))}
      </div>

      <RoleTabs role={role} onChange={setRole} />

      {role === "all" ? (
        <OverallTable
          rows={overallRows}
          selected={selectedOverall}
          onToggle={(row) =>
            setSelectedOverall((prev) =>
              prev &&
              prev.playerId === row.playerId &&
              prev.year === row.year &&
              (prev.world ?? "") === (row.world ?? "")
                ? null
                : row,
            )
          }
          detailRef={detailRef}
          onCloseDetail={() => setSelectedOverall(null)}
        />
      ) : roleRows.length === 0 ? (
        <p className="text-[13px] text-museum-ivory-soft">
          この条件に該当するSOPはありません。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[560px] border-collapse text-left text-[12px] md:text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50 text-[11px] text-[color:var(--museum-accent,#d4af37)]">
                <th className="px-2.5 py-2 font-medium">順位</th>
                <th className="px-2.5 py-2 font-medium">選手</th>
                <th className="px-2.5 py-2 font-medium">球団</th>
                <th className="px-2.5 py-2 font-medium">SOP</th>
                <th className="px-2.5 py-2 font-medium">区分</th>
              </tr>
            </thead>
            <tbody>
              {roleRows.map((entry) => {
                const r = entry.result;
                return (
                  <tr
                    key={`${r.world ?? ""}:${r.playerId}:${r.role}:${r.year}`}
                    className="border-b border-white/8"
                  >
                    <td className="px-2.5 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                      {entry.rank}
                    </td>
                    <td className="px-2.5 py-2 font-medium text-museum-ivory">
                      {r.playerName}
                    </td>
                    <td className="px-2.5 py-2 text-museum-ivory-soft">
                      {r.teamShort}
                    </td>
                    <td className="px-2.5 py-2 tabular-nums font-medium text-museum-ivory">
                      {r.total}
                    </td>
                    <td className="px-2.5 py-2 text-museum-ivory-soft">
                      {r.role === "batter" ? "野手" : "投手"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {notes.length > 0 ? (
        <ul className="space-y-0.5 text-[10px] text-museum-ivory-soft/70">
          {notes.map((n) => (
            <li key={n}>・ {n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OverallTable({
  rows,
  selected,
  onToggle,
  detailRef,
  onCloseDetail,
}: {
  rows: SopOverallRankEntry[];
  selected: SopOverallRankEntry | null;
  onToggle: (row: SopOverallRankEntry) => void;
  detailRef: React.RefObject<HTMLTableRowElement | null>;
  onCloseDetail: () => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        この条件に該当するSOPはありません。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[560px] border-collapse text-left text-[12px] md:text-[13px]">
          <thead>
            <tr className="border-b border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50 text-[11px] text-[color:var(--museum-accent,#d4af37)]">
              <th className="px-2.5 py-2 font-medium">順位</th>
              <th className="px-2.5 py-2 font-medium">選手</th>
              <th className="px-2.5 py-2 font-medium">球団</th>
              <th className="px-2.5 py-2 font-medium">SOP</th>
              <th className="px-2.5 py-2 font-medium">区分</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active =
                selected != null &&
                selected.playerId === row.playerId &&
                selected.year === row.year &&
                (selected.world ?? "") === (row.world ?? "");
              return (
                <Fragment
                  key={`${row.world ?? ""}:${row.year}:${row.playerId}`}
                >
                  <tr
                    className={cn(
                      "border-b border-white/8 transition-colors",
                      active
                        ? "bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.12))]"
                        : "hover:bg-white/5",
                    )}
                  >
                    <td className="px-2.5 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                      {row.rank}
                    </td>
                    <td className="px-2.5 py-2 font-medium text-museum-ivory">
                      <button
                        type="button"
                        onClick={() => onToggle(row)}
                        className={cn(
                          "min-h-9 cursor-pointer text-left underline-offset-2",
                          "hover:text-[color:var(--museum-accent,#d4af37)] hover:underline",
                          active &&
                            "text-[color:var(--museum-accent,#d4af37)] underline",
                        )}
                      >
                        {row.playerName}
                      </button>
                    </td>
                    <td className="px-2.5 py-2 text-museum-ivory-soft">
                      {row.teamShort}
                    </td>
                    <td className="px-2.5 py-2 tabular-nums font-medium text-museum-ivory">
                      {row.total}
                    </td>
                    <td className="px-2.5 py-2 text-museum-ivory-soft">
                      {overallClassificationLabel(row.classification)}
                    </td>
                  </tr>
                  {active ? (
                    <tr
                      ref={detailRef}
                      className="border-b border-white/8 bg-black/55"
                    >
                      <td colSpan={5} className="px-2 py-3 sm:px-3">
                        <OverallDetailPanel
                          row={row}
                          onClose={onCloseDetail}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {!selected ? (
        <p className="text-[11px] text-museum-ivory-soft">
          選手名をクリックすると内訳を表示します。二刀流は野手SOP＋投手SOPの合算です。
        </p>
      ) : null}
    </div>
  );
}

function OverallDetailPanel({
  row,
  onClose,
}: {
  row: SopOverallRankEntry;
  onClose: () => void;
}) {
  return (
    <section className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/45 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-medium text-museum-ivory">
            {row.playerName}
            <span className="ml-2 text-[12px] text-museum-ivory-soft">
              {row.teamShort}・{overallClassificationLabel(row.classification)}
            </span>
          </h3>
          <p className="mt-1 text-[13px] text-[color:var(--museum-accent,#d4af37)]">
            順位 {row.rank}　合計SOP {row.total}
          </p>
          <p className="mt-0.5 text-[11px] text-museum-ivory-soft">
            野手SOP {row.batterTotal}点　／　投手SOP {row.pitcherTotal}点　／　合計SOP{" "}
            {row.total}点
          </p>
        </div>
        <div className="flex gap-2">
          {row.playerId ? (
            <Link
              href={`/players/${row.playerId}/yearly`}
              className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-museum-ivory-soft hover:border-white/30"
            >
              選手詳細
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-museum-ivory-soft hover:border-white/30"
          >
            閉じる
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {row.batterResult ? (
          <div>
            <h4 className="text-[12px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
              【野手SOP】 {row.batterTotal}点
            </h4>
            <div className="mt-2 space-y-3">
              <SopCategoryBlocks
                groups={groupSopItemsByCategory(row.batterResult)}
                empty={row.batterResult.items.length === 0}
                idPrefix="b:"
              />
            </div>
          </div>
        ) : null}
        {row.pitcherResult ? (
          <div>
            <h4 className="text-[12px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
              【投手SOP】 {row.pitcherTotal}点
            </h4>
            <div className="mt-2 space-y-3">
              <SopCategoryBlocks
                groups={groupSopItemsByCategory(row.pitcherResult)}
                empty={row.pitcherResult.items.length === 0}
                idPrefix="p:"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { RoleTabs } from "@/components/sop/RoleTabs";

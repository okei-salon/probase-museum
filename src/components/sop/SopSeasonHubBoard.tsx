"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildYearSopRankings,
  listSopSeasonIdentities,
} from "@/data/sop";
import { formatSeasonLineLabel, type SeasonIdentity } from "@/data/seasons";
import type { SopRole } from "@/lib/sop";
import { cn } from "@/lib/cn";

type RoleFilter = "all" | SopRole;

export function SopSeasonHubBoard() {
  const [ready, setReady] = useState(false);
  const [seasons, setSeasons] = useState<SeasonIdentity[]>([]);
  const [seasonKey, setSeasonKey] = useState<string | null>(null);
  const [role, setRole] = useState<RoleFilter>("all");

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

  const { rankings, notes } = useMemo(() => {
    if (!ready || !identity) return { rankings: [], notes: [] as string[] };
    return buildYearSopRankings(identity);
  }, [ready, identity]);

  const filtered = useMemo(() => {
    if (role === "all") return rankings;
    return rankings.filter((e) => e.result.role === role);
  }, [rankings, role]);

  const display = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      if (b.result.total !== a.result.total) {
        return b.result.total - a.result.total;
      }
      return a.result.playerName.localeCompare(b.result.playerName, "ja");
    });
    const out: { rank: number; entry: (typeof sorted)[number] }[] = [];
    let i = 0;
    while (i < sorted.length) {
      const score = sorted[i]!.result.total;
      let j = i;
      while (j < sorted.length && sorted[j]!.result.total === score) j += 1;
      const rank = i + 1;
      for (let k = i; k < j; k += 1) {
        out.push({ rank, entry: sorted[k]! });
      }
      i = j;
    }
    return out;
  }, [filtered]);

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

      {display.length === 0 ? (
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
              {display.map(({ rank, entry }) => {
                const r = entry.result;
                return (
                  <tr
                    key={`${r.world ?? ""}:${r.playerId}:${r.role}:${r.year}`}
                    className="border-b border-white/8"
                  >
                    <td className="px-2.5 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                      {rank}
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

export function RoleTabs({
  role,
  onChange,
  labels = [
    { id: "all" as const, label: "総合" },
    { id: "batter" as const, label: "野手" },
    { id: "pitcher" as const, label: "投手" },
  ],
}: {
  role: RoleFilter;
  onChange: (r: RoleFilter) => void;
  labels?: { id: RoleFilter; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-[12px] tracking-[0.08em] transition-colors",
            role === r.id
              ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
              : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

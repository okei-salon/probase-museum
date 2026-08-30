"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { listSeasonLines } from "@/data/playerSeasonLines";
import {
  buildInterleagueSopFourKings,
  buildInterleagueSopRankings,
} from "@/data/sop";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  parseSeasonKey,
  type SeasonIdentity,
} from "@/data/seasons";
import type { SopSeasonResult } from "@/lib/sop/types";
import { cn } from "@/lib/cn";
import { InterleagueSopDetailPanel } from "@/components/sop/InterleagueSopDetailPanel";

function listInterleagueSopIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const line of listSeasonLines().filter(
    (l) => l.scope === "interleague",
  )) {
    const id = identityFromWorldYear(line.year, line.world);
    map.set(id.seasonKey, id);
  }
  return [...map.values()].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
}

type SelectedSop = {
  result: SopSeasonResult;
  rank: number | null;
};

type InterleagueSopSeasonViewProps = {
  identity: SeasonIdentity;
  /** 読み込み完了済み（クライアント） */
  ready?: boolean;
};

/**
 * 1シーズン分の交流戦SOP（四天王＋ランキング）。
 * seasonKey 固定のシーズン詳細・全年度選択 UI の双方から再利用する。
 */
export function InterleagueSopSeasonView({
  identity,
  ready = true,
}: InterleagueSopSeasonViewProps) {
  const data = useMemo(() => {
    if (!ready) return null;
    return {
      rankings: buildInterleagueSopRankings(identity),
      kings: buildInterleagueSopFourKings(identity),
    };
  }, [ready, identity]);

  const [selected, setSelected] = useState<SelectedSop | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [identity.seasonKey]);

  function toggleDetail(result: SopSeasonResult, rank: number | null) {
    setSelected((prev) => {
      if (
        prev &&
        prev.result.playerId === result.playerId &&
        prev.result.role === result.role
      ) {
        return null;
      }
      return { result, rank };
    });
  }

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
          交流戦SOP四天王
        </h3>
        <p className="text-[12px] text-museum-ivory-soft">
          {formatSeasonLineLabel(identity)}{" "}
          の交流戦SOP上位4名（野手・投手混合）。カードをタップすると獲得ポイント内訳を表示します。
        </p>
        {data && data.kings.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.kings.map((k, i) => {
              const active =
                selected?.result.playerId === k.playerId &&
                selected?.result.role === k.role;
              const rankingRank =
                data.rankings.rankings.find(
                  (r) =>
                    r.result.playerId === k.playerId &&
                    r.result.role === k.role,
                )?.rank ?? i + 1;
              return (
                <button
                  key={`${k.playerId}-${k.role}`}
                  type="button"
                  onClick={() => toggleDetail(k, rankingRank)}
                  className={cn(
                    "rounded-xl border bg-black/50 p-4 text-left transition-colors",
                    "min-h-[7.5rem] cursor-pointer",
                    active
                      ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.12))]"
                      : "border-[color:var(--museum-accent,#d4af37)]/35 hover:border-[color:var(--museum-accent,#d4af37)]/70",
                  )}
                >
                  <p className="text-[10px] tracking-[0.16em] text-[color:var(--museum-accent,#d4af37)]">
                    第{i + 1}席
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[16px] text-museum-ivory underline-offset-2",
                      "group-hover:underline",
                      active && "text-[color:var(--museum-accent,#d4af37)]",
                    )}
                  >
                    {k.playerName}
                  </p>
                  <p className="text-[11px] text-museum-ivory-soft">
                    {k.teamShort} · {k.role === "batter" ? "野手" : "投手"}
                  </p>
                  <p className="mt-2 font-display text-[22px] text-[color:var(--museum-accent,#d4af37)]">
                    {k.total}pt
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[12px] text-white/45">
            交流戦SOP四天王を選出できるデータがありません。
          </p>
        )}
      </section>

      {selected &&
      !(data?.rankings.rankings ?? []).some(
        (r) =>
          r.result.playerId === selected.result.playerId &&
          r.result.role === selected.result.role,
      ) ? (
        <InterleagueSopDetailPanel
          result={selected.result}
          rank={selected.rank}
          onClose={() => setSelected(null)}
        />
      ) : null}

      <section className="space-y-3">
        <h3 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
          交流戦SOPランキング
        </h3>
        {data?.rankings.notes.map((n) => (
          <p key={n} className="text-[11px] text-museum-ivory-soft">
            {n}
          </p>
        ))}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
          <table className="min-w-full text-left text-[12px]">
            <thead>
              <tr className="text-white/50">
                <th className="px-3 py-2">順位</th>
                <th className="px-3 py-2">選手</th>
                <th className="px-3 py-2">区分</th>
                <th className="px-3 py-2">球団</th>
                <th className="px-3 py-2">SOP</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rankings.rankings ?? []).map((row) => {
                const active =
                  selected?.result.playerId === row.result.playerId &&
                  selected?.result.role === row.result.role;
                return (
                  <Fragment
                    key={`${row.result.playerId}-${row.result.role}`}
                  >
                    <tr
                      className={cn(
                        "border-t border-white/5",
                        active &&
                          "bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.1))]",
                      )}
                    >
                      <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleDetail(row.result, row.rank)
                          }
                          className={cn(
                            "min-h-9 cursor-pointer text-left text-museum-ivory underline-offset-2",
                            "hover:text-[color:var(--museum-accent,#d4af37)] hover:underline",
                            active &&
                              "text-[color:var(--museum-accent,#d4af37)] underline",
                          )}
                        >
                          {row.result.playerName}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-museum-ivory-soft">
                        {row.result.role === "batter" ? "野手" : "投手"}
                      </td>
                      <td className="px-3 py-2">{row.result.teamShort}</td>
                      <td
                        className={cn(
                          "px-3 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]",
                        )}
                      >
                        {row.result.total}pt
                      </td>
                    </tr>
                    {active ? (
                      <tr className="border-t border-white/5 bg-black/55">
                        <td colSpan={5} className="px-2 py-3 sm:px-3">
                          <InterleagueSopDetailPanel
                            result={selected!.result}
                            rank={selected!.rank}
                            onClose={() => setSelected(null)}
                            className="border-0 bg-transparent p-2 shadow-none sm:p-3"
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {(data?.rankings.rankings.length ?? 0) === 0 ? (
            <p className="px-4 py-8 text-center text-[12px] text-white/45">
              交流戦SOPデータがありません。交流戦個人成績を登録してください。
            </p>
          ) : null}
        </div>
        {!selected ? (
          <p className="text-[11px] text-museum-ivory-soft">
            選手名または四天王カードをタップすると、獲得ポイント内訳を表示します。
          </p>
        ) : null}
      </section>
    </div>
  );
}

type InterleagueSopSeasonBoardProps = {
  /**
   * 指定時はその seasonKey（WORLD＋年度）のみ表示し、シーズン選択 UI は出さない。
   * 未指定時は /sop/interleague 向けに全シーズンから選択。
   */
  seasonKey?: string;
};

/** 交流戦SOP（そのシーズン）ランキング＋四天王 */
export function InterleagueSopSeasonBoard({
  seasonKey: fixedSeasonKey,
}: InterleagueSopSeasonBoardProps = {}) {
  const [ready, setReady] = useState(false);
  const fixedIdentity = useMemo(
    () => (fixedSeasonKey ? parseSeasonKey(fixedSeasonKey) : null),
    [fixedSeasonKey],
  );

  const identities = useMemo(
    () =>
      ready && !fixedIdentity ? listInterleagueSopIdentities() : [],
    [ready, fixedIdentity],
  );
  const [seasonKey, setSeasonKey] = useState("");

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || fixedIdentity || identities.length === 0) return;
    if (!seasonKey) setSeasonKey(identities[0]!.seasonKey);
  }, [ready, identities, seasonKey, fixedIdentity]);

  const identity: SeasonIdentity | null = useMemo(() => {
    if (fixedIdentity) return fixedIdentity;
    return parseSeasonKey(seasonKey) ?? identities[0] ?? null;
  }, [fixedIdentity, seasonKey, identities]);

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  if (!identity) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        {fixedSeasonKey
          ? "シーズンを特定できません。"
          : "シーズンデータがありません。"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!fixedIdentity ? (
        <label className="block max-w-xs">
          <span className="mb-1 block text-[11px] tracking-[0.1em] text-white/55">
            シーズン
          </span>
          <select
            value={identity.seasonKey}
            onChange={(e) => setSeasonKey(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
          >
            {identities.map((id) => (
              <option key={id.seasonKey} value={id.seasonKey}>
                {formatSeasonLineLabel(id)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <InterleagueSopSeasonView identity={identity} ready={ready} />
    </div>
  );
}

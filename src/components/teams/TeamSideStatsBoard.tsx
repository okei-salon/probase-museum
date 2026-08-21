"use client";

import { useEffect, useState } from "react";
import {
  buildTeamBattingBoard,
  buildTeamPitchingBoard,
  type TeamSideBoard,
} from "@/data/teamDetail";
import type { TeamId } from "@/data/teams";
import { cn } from "@/lib/cn";

type Props = {
  teamId: TeamId;
  kind: "batting" | "pitching";
};

type LoadedState = {
  key: string;
  board: TeamSideBoard;
  mode: "year" | "career";
  seasonKey: string | null;
};

export function TeamSideStatsBoard({ teamId, kind }: Props) {
  const loadKey = `${teamId}:${kind}`;
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { hydrateTeamSeasonStatsFromCloud } = await import(
        "@/data/teamSeasonStats"
      );
      await hydrateTeamSeasonStatsFromCloud();
      if (cancelled) return;
      const board =
        kind === "batting"
          ? buildTeamBattingBoard(teamId)
          : buildTeamPitchingBoard(teamId);
      setState({
        key: `${teamId}:${kind}`,
        board,
        mode: "year",
        seasonKey:
          board.years.length > 0
            ? board.years[board.years.length - 1]!.seasonKey
            : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, kind]);

  if (!state || state.key !== loadKey) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  const { board, mode, seasonKey } = state;

  if (board.years.length === 0 && !board.career) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        この球団の
        {kind === "batting" ? "チーム打撃" : "チーム投手"}
        成績はまだありません。
      </p>
    );
  }

  const yearFields =
    board.years.find((y) => y.seasonKey === seasonKey)?.fields ??
    board.years[board.years.length - 1]?.fields ??
    [];
  const fields = mode === "career" ? board.career ?? [] : yearFields;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ModeBtn
          active={mode === "year"}
          label="年度"
          onClick={() =>
            setState((prev) =>
              prev ? { ...prev, mode: "year" } : prev,
            )
          }
        />
        {board.career ? (
          <ModeBtn
            active={mode === "career"}
            label="通算"
            onClick={() =>
              setState((prev) =>
                prev ? { ...prev, mode: "career" } : prev,
              )
            }
          />
        ) : null}
      </div>

      {mode === "year" && board.years.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {board.years.map((y) => (
            <button
              key={y.seasonKey}
              type="button"
              onClick={() =>
                setState((prev) =>
                  prev ? { ...prev, seasonKey: y.seasonKey } : prev,
                )
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors",
                seasonKey === y.seasonKey
                  ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                  : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
              )}
            >
              {y.seasonLabel}
            </button>
          ))}
        </div>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-[13px] text-museum-ivory-soft">
          表示できる項目がありません。
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div
              key={f.key}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5"
            >
              <span className="text-[12px] text-museum-ivory-soft">
                {f.label}
              </span>
              <span className="font-display text-[18px] tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                {f.valueText}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-[12px] tracking-[0.08em] transition-colors",
        active
          ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
          : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
      )}
    >
      {label}
    </button>
  );
}

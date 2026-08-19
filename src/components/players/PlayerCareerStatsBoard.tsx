"use client";

import { useEffect, useMemo, useState } from "react";
import { listSeasonLinesByPlayer } from "@/data/playerSeasonLines";
import {
  getPlayerCareerStatCards,
  type RecordsRole,
} from "@/data/recordsRankings";
import type { SeasonLineScope } from "@/data/playerSeasonLines";
import { cn } from "@/lib/cn";

type PlayerCareerStatsBoardProps = {
  playerId: string;
};

export function PlayerCareerStatsBoard({
  playerId,
}: PlayerCareerStatsBoardProps) {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<RecordsRole>("batter");
  const [scope, setScope] = useState<SeasonLineScope>("pennant");

  useEffect(() => {
    setReady(true);
  }, [playerId]);

  const available = useMemo(() => {
    if (!ready) {
      return {
        pennantBatter: false,
        pennantPitcher: false,
        ilBatter: false,
        ilPitcher: false,
      };
    }
    const lines = listSeasonLinesByPlayer(playerId);
    return {
      pennantBatter: lines.some(
        (l) => l.scope === "pennant" && l.role === "batter",
      ),
      pennantPitcher: lines.some(
        (l) => l.scope === "pennant" && l.role === "pitcher",
      ),
      ilBatter: lines.some(
        (l) => l.scope === "interleague" && l.role === "batter",
      ),
      ilPitcher: lines.some(
        (l) => l.scope === "interleague" && l.role === "pitcher",
      ),
    };
  }, [ready, playerId]);

  const hasPennant =
    available.pennantBatter || available.pennantPitcher;
  const hasInterleague = available.ilBatter || available.ilPitcher;

  useEffect(() => {
    if (!ready) return;
    if (scope === "pennant" && !hasPennant && hasInterleague) {
      setScope("interleague");
    } else if (scope === "interleague" && !hasInterleague && hasPennant) {
      setScope("pennant");
    }
  }, [ready, scope, hasPennant, hasInterleague]);

  const roleAvailable =
    scope === "pennant"
      ? {
          batter: available.pennantBatter,
          pitcher: available.pennantPitcher,
        }
      : { batter: available.ilBatter, pitcher: available.ilPitcher };

  useEffect(() => {
    if (!ready) return;
    if (role === "batter" && !roleAvailable.batter && roleAvailable.pitcher) {
      setRole("pitcher");
    } else if (
      role === "pitcher" &&
      !roleAvailable.pitcher &&
      roleAvailable.batter
    ) {
      setRole("batter");
    }
  }, [ready, roleAvailable, role]);

  const cards = useMemo(
    () => (ready ? getPlayerCareerStatCards(playerId, role, scope) : []),
    [ready, playerId, role, scope],
  );

  if (!ready) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>
    );
  }

  if (!hasPennant && !hasInterleague) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        登録済みの年度成績はまだありません。
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {hasPennant ? (
          <RoleBtn
            active={scope === "pennant"}
            onClick={() => setScope("pennant")}
            label="通常通算"
          />
        ) : null}
        {hasInterleague ? (
          <RoleBtn
            active={scope === "interleague"}
            onClick={() => setScope("interleague")}
            label="交流戦通算"
          />
        ) : null}
      </div>

      {scope === "interleague" ? (
        <p className="text-[12px] text-museum-ivory-soft">
          交流戦成績のみ合算（BLUE＋RED）。率は元数字から再計算。年度別は「年度別成績 →
          交流戦」を参照。
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {roleAvailable.batter ? (
          <RoleBtn
            active={role === "batter"}
            onClick={() => setRole("batter")}
            label="野手"
          />
        ) : null}
        {roleAvailable.pitcher ? (
          <RoleBtn
            active={role === "pitcher"}
            onClick={() => setRole("pitcher")}
            label="投手"
          />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards
          .filter((c) => c.value != null)
          .map((card) => (
            <article
              key={card.def.id}
              className="rounded-xl border border-white/12 bg-black/50 p-4"
            >
              <p className="text-[10px] tracking-[0.14em] text-museum-ivory-soft">
                {scope === "interleague" ? "交流戦通算" : "通算"}
                {card.def.label}
              </p>
              <p className="mt-2 font-display text-[26px] text-[color:var(--museum-accent,#d4af37)]">
                {card.valueText}
                {unitSuffix(card.def.id, card.def.format)}
              </p>
              <p className="mt-2 text-[12px] text-museum-ivory-soft">
                {card.ranked && card.rank != null
                  ? `歴代${card.rank}位`
                  : card.note ?? "順位対象外"}
              </p>
            </article>
          ))}
      </div>
    </div>
  );
}

function RoleBtn({
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

function unitSuffix(id: string, format: string): string {
  if (format !== "int" && format !== "ip") return "";
  const map: Record<string, string> = {
    h: "安打",
    hr: "本",
    w: "勝",
  };
  return map[id] ?? "";
}

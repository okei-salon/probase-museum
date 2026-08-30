"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerSeasonLinesPanel } from "@/components/players/PlayerSeasonLinesPanel";
import { getPlayerCareerDisplay } from "@/data/playerDetail/careerDisplay";
import { listSeasonLinesByPlayer } from "@/data/playerSeasonLines";
import type { SeasonLineScope } from "@/data/playerSeasonLines";
import type { RecordsRole } from "@/data/recordsRankings";
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

  const display = useMemo(
    () => (ready ? getPlayerCareerDisplay(playerId, role, scope) : null),
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
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[10px] tracking-[0.18em] text-museum-ivory-soft">
          {scope === "interleague" ? "INTERLEAGUE CAREER" : "CAREER STATS"}
        </p>
        {display ? (
          <p className="text-sm text-museum-ivory-soft md:text-base">
            {display.teamShort}
            <span className="mx-2 opacity-40">/</span>
            {display.positionLabel}
            <span className="ml-2 text-[12px] opacity-70">
              · {display.seasonCount}シーズン合算
            </span>
          </p>
        ) : null}
      </header>

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
          交流戦成績のみ合算（BLUE＋RED）。率は元数字から再計算します。
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

      {display ? (
        <section className="space-y-3">
          <h3 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
            主要成績サマリー
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {display.summary.map((card) => (
              <StatCard key={`sum-${card.id}`} card={card} featured />
            ))}
          </div>
        </section>
      ) : (
        <p className="text-[13px] text-museum-ivory-soft">
          この区分の登録成績はまだありません。
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
          年度別成績
        </h3>
        <PlayerSeasonLinesPanel
          playerId={playerId}
          scope={scope}
          onScopeChange={setScope}
          role={role}
          onRoleChange={setRole}
          hideControls
        />
      </section>

      {display ? (
        <section className="space-y-5">
          <h3 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
            詳細通算成績
          </h3>
          {display.groups.map((group) => (
            <div key={group.id} className="space-y-2.5">
              <h4 className="text-[11px] tracking-[0.12em] text-museum-ivory-soft">
                【{group.title}】
              </h4>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {group.cards.map((card) => (
                  <StatCard key={`${group.id}-${card.id}`} card={card} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  card,
  featured = false,
}: {
  card: {
    id: string;
    label: string;
    valueText: string;
    format: string;
  };
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border border-white/12 bg-black/50 p-3.5",
        featured && "border-[color:var(--museum-accent-border,#d4af3773)]/50",
      )}
    >
      <p className="text-[10px] tracking-[0.12em] text-museum-ivory-soft">
        {card.label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-display tabular-nums text-[color:var(--museum-accent,#d4af37)]",
          featured ? "text-[24px] md:text-[26px]" : "text-[20px] md:text-[22px]",
        )}
      >
        {card.valueText}
        {unitSuffix(card.id, card.format)}
      </p>
    </article>
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
  if (format === "ip") return "";
  if (id === "soRate" || id === "bbRate" || id === "hrRate") return "";
  if (id === "w") return "";
  if (id === "l") return "";
  return "";
}

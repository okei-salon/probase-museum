"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listSeasonLinesByPlayer,
  type BatterSeasonLine,
  type PitcherSeasonLine,
  type PlayerSeasonLine,
} from "@/data/playerSeasonLines";
import { formatSeasonLineLabel } from "@/data/seasons";
import { getTeam } from "@/data/teams";
import {
  aggregateBatterCounting,
  aggregatePitcherCounting,
  computeBatterDerived,
  computePitcherDerived,
} from "@/lib/manualEntry/computeSeasonStats";
import {
  formatAvgDisplay,
  formatEraDisplay,
  formatWinPctDisplay,
  outsToIpDisplay,
} from "@/lib/manualEntry/normalizeInput";
import { cn } from "@/lib/cn";

type Role = "batter" | "pitcher";

type PlayerSeasonLinesPanelProps = {
  playerId: string;
  /** @deprecated career は PlayerCareerStatsBoard を使用 */
  mode?: "yearly" | "career";
  /** 親からスコープを制御（通算ページ埋め込み用） */
  scope?: "pennant" | "interleague";
  onScopeChange?: (scope: "pennant" | "interleague") => void;
  role?: Role;
  onRoleChange?: (role: Role) => void;
  /** true のときスコープ／野手投手トグルを出さない */
  hideControls?: boolean;
};

export function PlayerSeasonLinesPanel({
  playerId,
  scope: scopeProp,
  onScopeChange,
  role: roleProp,
  onRoleChange,
  hideControls = false,
}: PlayerSeasonLinesPanelProps) {
  const [lines, setLines] = useState<PlayerSeasonLine[]>([]);
  const [roleState, setRoleState] = useState<Role>("batter");
  const [scopeState, setScopeState] = useState<"pennant" | "interleague">(
    "pennant",
  );

  const scope = scopeProp ?? scopeState;
  const role = roleProp ?? roleState;

  function setScope(next: "pennant" | "interleague") {
    onScopeChange?.(next);
    if (scopeProp == null) setScopeState(next);
  }

  function setRole(next: Role) {
    onRoleChange?.(next);
    if (roleProp == null) setRoleState(next);
  }
  useEffect(() => {
    setLines(listSeasonLinesByPlayer(playerId));
  }, [playerId]);

  const batters = useMemo(
    () =>
      lines
        .filter(
          (l): l is BatterSeasonLine =>
            l.role === "batter" && l.scope === scope,
        )
        .sort(
          (a, b) =>
            a.year - b.year ||
            String(a.world ?? "").localeCompare(String(b.world ?? "")),
        ),
    [lines, scope],
  );
  const pitchers = useMemo(
    () =>
      lines
        .filter(
          (l): l is PitcherSeasonLine =>
            l.role === "pitcher" && l.scope === scope,
        )
        .sort(
          (a, b) =>
            a.year - b.year ||
            String(a.world ?? "").localeCompare(String(b.world ?? "")),
        ),
    [lines, scope],
  );

  const hasPennant = lines.some((l) => l.scope === "pennant");
  const hasInterleague = lines.some((l) => l.scope === "interleague");

  useEffect(() => {
    if (scope === "pennant" && !hasPennant && hasInterleague) {
      setScope("interleague");
    } else if (scope === "interleague" && !hasInterleague && hasPennant) {
      setScope("pennant");
    }
  }, [scope, hasPennant, hasInterleague]);

  useEffect(() => {
    if (role === "batter" && batters.length === 0 && pitchers.length > 0) {
      setRole("pitcher");
    } else if (
      role === "pitcher" &&
      pitchers.length === 0 &&
      batters.length > 0
    ) {
      setRole("batter");
    }
  }, [role, batters.length, pitchers.length]);

  if (!hasPennant && !hasInterleague) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-black/35 px-4 py-8 text-center text-[13px] text-white/45">
        登録済みの年度成績はまだありません。
        <br />
        <a
          href="/import"
          className="mt-2 inline-block text-[color:var(--museum-accent,#d4af37)] underline-offset-2 hover:underline"
        >
          手入力または画像取込で登録
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hideControls ? (
        <div className="flex flex-wrap gap-2">
          {hasPennant ? (
            <RoleTab
              active={scope === "pennant"}
              label="通常シーズン"
              onClick={() => setScope("pennant")}
            />
          ) : null}
          {hasInterleague ? (
            <RoleTab
              active={scope === "interleague"}
              label="交流戦"
              onClick={() => setScope("interleague")}
            />
          ) : null}
        </div>
      ) : null}

      {scope === "interleague" && !hideControls ? (
        <p className="text-[12px] text-museum-ivory-soft">
          交流戦個人成績のみ。通算行は各年度の元数字を合算し、率を再計算します（BLUE＋RED合算）。
        </p>
      ) : null}

      {!hideControls ? (
        <div className="flex flex-wrap gap-2">
          {batters.length > 0 ? (
            <RoleTab
              active={role === "batter"}
              label="野手"
              onClick={() => setRole("batter")}
            />
          ) : null}
          {pitchers.length > 0 ? (
            <RoleTab
              active={role === "pitcher"}
              label="投手"
              onClick={() => setRole("pitcher")}
            />
          ) : null}
        </div>
      ) : null}

      {role === "batter" && batters.length > 0 ? (
        <BatterYearTable
          lines={batters}
          totalLabel={scope === "interleague" ? "交流戦通算" : "通算"}
        />
      ) : null}
      {role === "pitcher" && pitchers.length > 0 ? (
        <PitcherYearTable
          lines={pitchers}
          totalLabel={scope === "interleague" ? "交流戦通算" : "通算"}
        />
      ) : null}
      {batters.length === 0 && pitchers.length === 0 ? (
        <p className="text-[13px] text-museum-ivory-soft">
          この区分の登録成績はまだありません。
        </p>
      ) : null}
    </div>
  );
}

function RoleTab({
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

function teamShort(line: PlayerSeasonLine) {
  return getTeam(line.teamId)?.short ?? shortTeamName(line.teamName);
}

function BatterYearTable({
  lines,
  totalLabel = "通算",
}: {
  lines: BatterSeasonLine[];
  totalLabel?: string;
}) {
  const sum = aggregateBatterCounting(lines.map((l) => l.counting));
  const derived = computeBatterDerived(sum);

  const headers = [
    "年度",
    "球団",
    "打率",
    "試合",
    "打席",
    "打数",
    "安打",
    "二塁打",
    "三塁打",
    "本塁打",
    "塁打",
    "長打率",
    "打点",
    "得点圏打率",
    "得点圏打数",
    "得点圏安打",
    "得点",
    "四球",
    "死球",
    "犠打",
    "犠飛",
    "盗塁",
    "盗塁死",
    "出塁率",
    "連続安打",
    "連続出塁",
    "猛打賞",
    "OPS",
    "被盗塁企図数",
    "許盗塁数",
    "盗塁刺",
    "盗塁阻止率",
  ] as const;

  const colDivider =
    "border-r border-[color:rgba(212,175,55,0.12)]";

  function cell(
    v: number | null | undefined,
    kind: "int" | "avg" | "ops" = "int",
  ) {
    if (v == null) return "—";
    if (kind === "avg") return fmtAvg(v);
    if (kind === "ops") return v.toFixed(3);
    return String(v);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-max min-w-[1100px] border-collapse text-left text-[11px] md:text-[12px]">
        <thead>
          <tr className="border-b border-white/10 text-[11px] text-white/55">
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  "whitespace-nowrap px-2 py-2 font-medium",
                  h === "年度" || h === "球団"
                    ? "min-w-[4rem]"
                    : "min-w-[2.5rem]",
                  i < headers.length - 1 && colDivider,
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((row) => {
            const c = row.counting;
            const d = row.derived;
            const vals = [
              formatSeasonLineLabel(row),
              teamShort(row),
              cell(d.avg, "avg"),
              cell(c.g),
              cell(c.pa),
              cell(c.ab),
              cell(c.h),
              cell(c.doubles),
              cell(c.triples),
              cell(c.hr),
              cell(d.tb ?? c.tb),
              cell(d.slg, "avg"),
              cell(c.rbi),
              cell(d.rispAvg, "avg"),
              cell(c.rispAb),
              cell(c.rispH),
              cell(c.r),
              cell(c.bb),
              cell(c.hbp),
              cell(c.sac),
              cell(c.sf),
              cell(c.sb),
              cell(c.cs),
              cell(d.obp, "avg"),
              cell(c.hitStreak),
              cell(c.onBaseStreak),
              cell(c.multiHit),
              cell(d.ops, "ops"),
              cell(c.csAttempted),
              cell(c.csAllowed),
              cell(c.csCaught),
              cell(d.csRate, "avg"),
            ];
            return (
              <tr key={row.id} className="border-b border-white/8">
                {vals.map((v, i) => (
                  <td
                    key={`${row.id}-${i}`}
                    className={cn(
                      "whitespace-nowrap px-2 py-2 tabular-nums",
                      i === 0
                        ? "text-white/85"
                        : i === 1
                          ? "text-white/70"
                          : i === 2
                            ? "font-medium text-white"
                            : "",
                      i < vals.length - 1 && colDivider,
                    )}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="border-t border-[color:var(--museum-accent,#d4af37)]/35 bg-black/30">
            {[
              totalLabel,
              "—",
              cell(derived.avg, "avg"),
              cell(sum.g),
              cell(sum.pa),
              cell(sum.ab),
              cell(sum.h),
              cell(sum.doubles),
              cell(sum.triples),
              cell(sum.hr),
              cell(derived.tb ?? sum.tb),
              cell(derived.slg, "avg"),
              cell(sum.rbi),
              cell(derived.rispAvg, "avg"),
              cell(sum.rispAb),
              cell(sum.rispH),
              cell(sum.r),
              cell(sum.bb),
              cell(sum.hbp),
              cell(sum.sac),
              cell(sum.sf),
              cell(sum.sb),
              cell(sum.cs),
              cell(derived.obp, "avg"),
              cell(sum.hitStreak),
              cell(sum.onBaseStreak),
              cell(sum.multiHit),
              cell(derived.ops, "ops"),
              cell(sum.csAttempted),
              cell(sum.csAllowed),
              cell(sum.csCaught),
              cell(derived.csRate, "avg"),
            ].map((v, i) => (
              <td
                key={`sum-${i}`}
                className={cn(
                  "whitespace-nowrap px-2 py-2.5 tabular-nums",
                  i === 0
                    ? "font-medium text-[color:var(--museum-accent,#d4af37)]"
                    : i === 2
                      ? "font-medium text-white"
                      : "",
                  i < 32 && colDivider,
                )}
              >
                {v}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PitcherYearTable({
  lines,
  totalLabel = "通算",
}: {
  lines: PitcherSeasonLine[];
  totalLabel?: string;
}) {
  const sum = aggregatePitcherCounting(lines.map((l) => l.counting));
  const derived = computePitcherDerived(sum);
  const hp = sum.hld ?? sum.hp ?? null;

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[960px] border-collapse text-left text-[12px] md:text-[13px]">
        <thead>
          <tr className="border-b border-white/10 text-[11px] text-white/55">
            <th className="px-2.5 py-2 font-medium">年度</th>
            <th className="px-2.5 py-2 font-medium">球団</th>
            <th className="px-2.5 py-2 font-medium">防御率</th>
            <th className="px-2.5 py-2 font-medium">勝利</th>
            <th className="px-2.5 py-2 font-medium">勝率</th>
            <th className="px-2.5 py-2 font-medium">投球回</th>
            <th className="px-2.5 py-2 font-medium">奪三振</th>
            <th className="px-2.5 py-2 font-medium">奪三振率</th>
            <th className="px-2.5 py-2 font-medium">WHIP</th>
            <th className="px-2.5 py-2 font-medium">セーブ</th>
            <th className="px-2.5 py-2 font-medium">HP</th>
            <th className="px-2.5 py-2 font-medium">登板</th>
            <th className="px-2.5 py-2 font-medium">完投</th>
            <th className="px-2.5 py-2 font-medium">完封</th>
            <th className="px-2.5 py-2 font-medium">QS</th>
            <th className="px-2.5 py-2 font-medium">QS率</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((row) => {
            const rowHp = row.counting.hld ?? row.counting.hp ?? null;
            return (
              <tr key={row.id} className="border-b border-white/8">
                <td className="px-2.5 py-2 text-white/85">
                  {formatSeasonLineLabel(row)}
                </td>
                <td className="px-2.5 py-2 text-white/70">{teamShort(row)}</td>
                <td className="px-2.5 py-2 tabular-nums font-medium text-white">
                  {fmtEra(row.derived.era)}
                </td>
                <td className="px-2.5 py-2 tabular-nums">{row.counting.w}</td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.derived.winPct != null
                    ? formatWinPctDisplay(row.derived.winPct)
                    : "—"}
                </td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.derived.ipDisplay ?? "—"}
                </td>
                <td className="px-2.5 py-2 tabular-nums">{row.counting.so}</td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.derived.soRate != null
                    ? row.derived.soRate.toFixed(2)
                    : "—"}
                </td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.derived.whip != null
                    ? row.derived.whip.toFixed(2)
                    : "—"}
                </td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.counting.sv ?? "—"}
                </td>
                <td className="px-2.5 py-2 tabular-nums">{rowHp ?? "—"}</td>
                <td className="px-2.5 py-2 tabular-nums">{row.counting.g}</td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.counting.cg ?? "—"}
                </td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.counting.sho ?? "—"}
                </td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.counting.qs ?? "—"}
                </td>
                <td className="px-2.5 py-2 tabular-nums">
                  {row.derived.qsRate != null
                    ? formatWinPctDisplay(row.derived.qsRate)
                    : "—"}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-[color:var(--museum-accent,#d4af37)]/35 bg-black/30">
            <td className="px-2.5 py-2.5 font-medium text-[color:var(--museum-accent,#d4af37)]">
              {totalLabel}
            </td>
            <td className="px-2.5 py-2.5 text-white/50">—</td>
            <td className="px-2.5 py-2.5 tabular-nums font-medium text-white">
              {fmtEra(derived.era)}
            </td>
            <td className="px-2.5 py-2.5 tabular-nums">{sum.w}</td>
            <td className="px-2.5 py-2.5 tabular-nums">
              {derived.winPct != null
                ? formatWinPctDisplay(derived.winPct)
                : "—"}
            </td>
            <td className="px-2.5 py-2.5 tabular-nums">
              {outsToIpDisplay(sum.ipOuts)}
            </td>
            <td className="px-2.5 py-2.5 tabular-nums">{sum.so}</td>
            <td className="px-2.5 py-2.5 tabular-nums">
              {derived.soRate != null ? derived.soRate.toFixed(2) : "—"}
            </td>
            <td className="px-2.5 py-2.5 tabular-nums">
              {derived.whip != null ? derived.whip.toFixed(2) : "—"}
            </td>
            <td className="px-2.5 py-2.5 tabular-nums">{sum.sv ?? "—"}</td>
            <td className="px-2.5 py-2.5 tabular-nums">{hp ?? "—"}</td>
            <td className="px-2.5 py-2.5 tabular-nums">{sum.g}</td>
            <td className="px-2.5 py-2.5 tabular-nums">{sum.cg ?? "—"}</td>
            <td className="px-2.5 py-2.5 tabular-nums">{sum.sho ?? "—"}</td>
            <td className="px-2.5 py-2.5 tabular-nums">{sum.qs ?? "—"}</td>
            <td className="px-2.5 py-2.5 tabular-nums">
              {derived.qsRate != null
                ? formatWinPctDisplay(derived.qsRate)
                : "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function fmtAvg(v: number | null | undefined) {
  return v != null ? formatAvgDisplay(v) : "---";
}

function fmtEra(v: number | null | undefined) {
  return v != null ? formatEraDisplay(v) : "---";
}

function shortTeamName(name: string): string {
  const map: Record<string, string> = {
    阪神タイガース: "阪神",
    読売ジャイアンツ: "巨人",
    広島東洋カープ: "広島",
    横浜DeNAベイスターズ: "DeNA",
    東京ヤクルトスワローズ: "ヤクルト",
    中日ドラゴンズ: "中日",
    "オリックス・バファローズ": "オリックス",
    福岡ソフトバンクホークス: "ソフトバンク",
    千葉ロッテマリーンズ: "ロッテ",
    北海道日本ハムファイターズ: "日本ハム",
    埼玉西武ライオンズ: "西武",
    東北楽天ゴールデンイーグルス: "楽天",
  };
  return map[name] ?? name;
}

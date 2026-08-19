"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AutoCalcPanel } from "@/components/manualEntry/AutoCalcPanel";
import { PlayerNameAutocomplete } from "@/components/manualEntry/PlayerNameAutocomplete";
import { StatNumberField } from "@/components/manualEntry/StatNumberField";
import { MANUAL_ENTRY_KINDS, type ManualEntryKindId } from "@/data/manualEntry/kinds";
import { appendImportHistory } from "@/data/import/store";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  getDemoSeasonLine,
  upsertDemoSeasonLine,
} from "@/data/import/demoStore";
import {
  getSeasonLine,
  seasonLineKey,
  upsertBatterSeasonLine,
  upsertPitcherSeasonLine,
  type SeasonLineScope,
} from "@/data/playerSeasonLines";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import {
  formatSeasonLineLabel,
  listEntrySeasonIdentities,
  parseSeasonKey,
} from "@/data/seasons";
import type { TeamId } from "@/data/teams";
import {
  batterAutoCalcItems,
  computeBatterDerived,
  computePitcherDerived,
  formatBatterSummary,
  formatPitcherSummary,
  pitcherAutoCalcItems,
  validateBatterCounting,
  validatePitcherCounting,
  type BatterCountingInput,
  type PitcherCountingInput,
} from "@/lib/manualEntry/computeSeasonStats";
import {
  ipDisplayToOuts,
  normalizeIntegerInput,
  normalizeIpInput,
} from "@/lib/manualEntry/normalizeInput";
import {
  searchPlayerMasterCandidates,
  type PlayerSearchHit,
} from "@/lib/manualEntry/searchPlayers";
import { cn } from "@/lib/cn";

type BatterFields = {
  g: string;
  pa: string;
  ab: string;
  h: string;
  singles: string;
  doubles: string;
  triples: string;
  hr: string;
  tb: string;
  rbi: string;
  r: string;
  so: string;
  bb: string;
  hbp: string;
  sf: string;
  sac: string;
  sb: string;
  sba: string;
  cs: string;
  rispAb: string;
  rispH: string;
  basesLoadedPa: string;
  basesLoadedH: string;
  hitStreak: string;
  onBaseStreak: string;
  multiHit: string;
  csAttempted: string;
  csAllowed: string;
  csCaught: string;
};

type PitcherFields = {
  g: string;
  w: string;
  l: string;
  sv: string;
  hld: string;
  cg: string;
  sho: string;
  ip: string;
  er: string;
  r: string;
  so: string;
  h: string;
  hr: string;
  bb: string;
  hbp: string;
  qs: string;
  hqs: string;
  gs: string;
};

const emptyBatter = (): BatterFields => ({
  g: "",
  pa: "",
  ab: "",
  h: "",
  singles: "",
  doubles: "",
  triples: "",
  hr: "",
  tb: "",
  rbi: "",
  r: "",
  so: "",
  bb: "",
  hbp: "",
  sf: "",
  sac: "",
  sb: "",
  sba: "",
  cs: "",
  rispAb: "",
  rispH: "",
  basesLoadedPa: "",
  basesLoadedH: "",
  hitStreak: "",
  onBaseStreak: "",
  multiHit: "",
  csAttempted: "",
  csAllowed: "",
  csCaught: "",
});

const emptyPitcher = (): PitcherFields => ({
  g: "",
  w: "",
  l: "",
  sv: "",
  hld: "",
  cg: "",
  sho: "",
  ip: "",
  er: "",
  r: "",
  so: "",
  h: "",
  hr: "",
  bb: "",
  hbp: "",
  qs: "",
  hqs: "",
  gs: "",
});

function reqInt(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = normalizeIntegerInput(raw);
  return n.confidence === "invalid" ? null : n.value;
}

function optInt(raw: string): number | null | undefined {
  if (!raw.trim()) return undefined;
  return reqInt(raw);
}

type ManualEntryWorkspaceProps = {
  /** 交流戦入力など、スコープ固定 */
  fixedScope?: SeasonLineScope;
  /** 親ワークスペースに埋め込む */
  embed?: boolean;
  seasonKey?: string;
  onSeasonKeyChange?: (key: string) => void;
};

export function ManualEntryWorkspace({
  fixedScope = "pennant",
  embed = false,
  seasonKey: seasonKeyProp,
  onSeasonKeyChange,
}: ManualEntryWorkspaceProps = {}) {
  const router = useRouter();
  const [kind, setKind] = useState<ManualEntryKindId>("season_batting");
  const [seasonKeyInternal, setSeasonKeyInternal] = useState("BLUE_2026");
  const seasonKey = seasonKeyProp ?? seasonKeyInternal;
  const setSeasonKey = (key: string) => {
    if (seasonKeyProp == null) setSeasonKeyInternal(key);
    onSeasonKeyChange?.(key);
  };
  const scope = fixedScope;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlayerSearchHit | null>(null);
  const [batter, setBatter] = useState<BatterFields>(emptyBatter);
  const [pitcher, setPitcher] = useState<PitcherFields>(emptyPitcher);
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    hydratePlayerMasterFromStorage();
  }, []);

  const entrySeasons = useMemo(() => listEntrySeasonIdentities(), []);
  const identity = useMemo(
    () => parseSeasonKey(seasonKey) ?? entrySeasons[0]!,
    [seasonKey, entrySeasons],
  );
  const year = identity.year;
  const world = identity.world;

  const isBatter = kind === "season_batting";
  const isPitcher = kind === "season_pitching";
  const kindEnabled = MANUAL_ENTRY_KINDS.find((k) => k.id === kind)?.enabled;

  /** 入力途中でも同じ計算関数でリアルタイム更新 */
  const batterLive = useMemo(() => {
    if (!isBatter) return null;
    const derived = computeBatterDerived({
      ab: reqInt(batter.ab),
      h: reqInt(batter.h),
      singles: optInt(batter.singles) ?? null,
      doubles: optInt(batter.doubles) ?? 0,
      triples: optInt(batter.triples) ?? 0,
      hr: optInt(batter.hr) ?? 0,
      tb: optInt(batter.tb) ?? null,
      bb: optInt(batter.bb) ?? 0,
      hbp: optInt(batter.hbp) ?? 0,
      sf: optInt(batter.sf) ?? 0,
      sac: optInt(batter.sac) ?? 0,
      pa: optInt(batter.pa) ?? null,
      so: optInt(batter.so) ?? null,
      sb: optInt(batter.sb) ?? null,
      sba: optInt(batter.sba) ?? null,
      cs: optInt(batter.cs) ?? null,
      rispAb: optInt(batter.rispAb) ?? null,
      rispH: optInt(batter.rispH) ?? null,
      basesLoadedPa: optInt(batter.basesLoadedPa) ?? null,
      basesLoadedH: optInt(batter.basesLoadedH) ?? null,
      csAttempted: optInt(batter.csAttempted) ?? null,
      csCaught: optInt(batter.csCaught) ?? null,
    });
    return {
      derived,
      items: batterAutoCalcItems(derived),
    };
  }, [batter, isBatter]);

  const pitcherLive = useMemo(() => {
    if (!isPitcher) return null;
    const ipOuts = pitcher.ip.trim() ? ipDisplayToOuts(pitcher.ip) : null;
    const ipN = pitcher.ip.trim() ? normalizeIpInput(pitcher.ip) : null;
    const derived = computePitcherDerived({
      w: reqInt(pitcher.w),
      l: reqInt(pitcher.l),
      ipOuts: ipN?.confidence === "invalid" ? null : ipOuts,
      er: reqInt(pitcher.er),
      so: reqInt(pitcher.so),
      h: reqInt(pitcher.h),
      bb: reqInt(pitcher.bb),
      qs: optInt(pitcher.qs) ?? null,
      hqs: optInt(pitcher.hqs) ?? null,
      gs: optInt(pitcher.gs) ?? null,
    });
    return {
      derived,
      items: pitcherAutoCalcItems(derived),
    };
  }, [pitcher, isPitcher]);

  const batterParsed = useMemo(() => {
    if (!isBatter) return null;
    const ab = reqInt(batter.ab);
    const h = reqInt(batter.h);
    const doubles = reqInt(batter.doubles) ?? 0;
    const triples = reqInt(batter.triples) ?? 0;
    const hr = reqInt(batter.hr);
    const rbi = reqInt(batter.rbi);
    const bb = reqInt(batter.bb) ?? 0;
    if (ab == null || h == null || hr == null || rbi == null) return null;
    const counting: BatterCountingInput = {
      g: optInt(batter.g) ?? null,
      pa: optInt(batter.pa) ?? null,
      ab,
      h,
      singles: optInt(batter.singles) ?? null,
      doubles,
      triples,
      hr,
      tb: optInt(batter.tb) ?? null,
      rbi,
      r: optInt(batter.r) ?? null,
      so: optInt(batter.so) ?? null,
      bb,
      hbp: optInt(batter.hbp) ?? null,
      sf: optInt(batter.sf) ?? null,
      sac: optInt(batter.sac) ?? null,
      sb: optInt(batter.sb) ?? null,
      sba: optInt(batter.sba) ?? null,
      cs: optInt(batter.cs) ?? null,
      rispAb: optInt(batter.rispAb) ?? null,
      rispH: optInt(batter.rispH) ?? null,
      basesLoadedPa: optInt(batter.basesLoadedPa) ?? null,
      basesLoadedH: optInt(batter.basesLoadedH) ?? null,
      hitStreak: optInt(batter.hitStreak) ?? null,
      onBaseStreak: optInt(batter.onBaseStreak) ?? null,
      multiHit: optInt(batter.multiHit) ?? null,
      csAttempted: optInt(batter.csAttempted) ?? null,
      csAllowed: optInt(batter.csAllowed) ?? null,
      csCaught: optInt(batter.csCaught) ?? null,
    };
    const derived = computeBatterDerived(counting);
    const { errors, warnings } = validateBatterCounting(counting);
    return { counting, derived, errors, warnings };
  }, [batter, isBatter]);

  const pitcherParsed = useMemo(() => {
    if (!isPitcher) return null;
    const g = reqInt(pitcher.g);
    const w = reqInt(pitcher.w);
    const l = reqInt(pitcher.l);
    const er = reqInt(pitcher.er);
    const so = reqInt(pitcher.so);
    const ipN = pitcher.ip.trim() ? normalizeIpInput(pitcher.ip) : null;
    const ipOuts = pitcher.ip.trim() ? ipDisplayToOuts(pitcher.ip) : null;
    if (
      g == null ||
      w == null ||
      l == null ||
      er == null ||
      so == null ||
      ipOuts == null ||
      !ipN ||
      ipN.confidence === "invalid"
    ) {
      return null;
    }
    const counting: PitcherCountingInput = {
      g,
      w,
      l,
      sv: optInt(pitcher.sv) ?? null,
      hld: optInt(pitcher.hld) ?? null,
      hp: optInt(pitcher.hld) ?? null,
      cg: optInt(pitcher.cg) ?? null,
      sho: optInt(pitcher.sho) ?? null,
      ipOuts,
      er,
      r: optInt(pitcher.r) ?? null,
      so,
      h: optInt(pitcher.h) ?? null,
      hr: optInt(pitcher.hr) ?? null,
      bb: optInt(pitcher.bb) ?? null,
      hbp: optInt(pitcher.hbp) ?? null,
      qs: optInt(pitcher.qs) ?? null,
      hqs: optInt(pitcher.hqs) ?? null,
      gs: optInt(pitcher.gs) ?? null,
    };
    const derived = computePitcherDerived(counting);
    const { errors, warnings } = validatePitcherCounting(counting);
    if (ipN.confidence === "needs_confirm") {
      warnings.push(ipN.note ?? "投球回の解釈を確認してください");
    }
    return { counting, derived, errors, warnings };
  }, [pitcher, isPitcher]);

  const existing = useMemo(() => {
    if (!selected) return null;
    const role = isBatter ? "batter" : isPitcher ? "pitcher" : null;
    if (!role) return null;
    const id = seasonLineKey(
      selected.player.playerId,
      year,
      role,
      scope,
      world,
    );
    if (shouldUseIsolatedDemoStore(year)) return getDemoSeasonLine(id);
    return getSeasonLine(
      selected.player.playerId,
      year,
      role,
      scope,
      world,
    );
  }, [selected, year, world, isBatter, isPitcher, scope]);

  function patchBatter(key: keyof BatterFields, value: string) {
    setBatter((prev) => ({ ...prev, [key]: value }));
  }
  function patchPitcher(key: keyof PitcherFields, value: string) {
    setPitcher((prev) => ({ ...prev, [key]: value }));
  }

  function goConfirm() {
    setError(null);
    if (!kindEnabled) {
      setError("この成績種別はまだ手入力に対応していません");
      return;
    }
    if (!selected) {
      setError("選手を候補から選択してください");
      return;
    }
    if (!selected.affiliation) {
      setError("選択年度の所属球団が見つかりません");
      return;
    }
    if (isBatter) {
      if (!batterParsed) {
        setError("打数・安打・本塁打・打点は必須です");
        return;
      }
      if (batterParsed.errors.length) {
        setError(batterParsed.errors[0] ?? "入力内容を確認してください");
        return;
      }
    }
    if (isPitcher) {
      if (!pitcherParsed) {
        setError("登板・勝・敗・投球回・自責点・奪三振は必須です");
        return;
      }
      if (pitcherParsed.errors.length) {
        setError(pitcherParsed.errors[0] ?? "入力内容を確認してください");
        return;
      }
    }
    setStep("confirm");
  }

  function save(force = false) {
    if (!selected?.affiliation) return;
    if (existing && !force) {
      setOverwriteOpen(true);
      return;
    }

    const useSandbox = shouldUseIsolatedDemoStore(year);
    const now = new Date().toISOString();
    const teamId = selected.affiliation.teamId as TeamId;
    const teamName = selected.affiliation.teamName;

    if (isBatter && batterParsed) {
      const id = seasonLineKey(
        selected.player.playerId,
        year,
        "batter",
        scope,
        world,
      );
      const line = {
        id,
        playerId: selected.player.playerId,
        playerName: selected.player.fullName,
        year,
        world,
        teamId,
        teamName,
        scope,
        role: "batter" as const,
        source: "manual" as const,
        counting: batterParsed.counting,
        derived: batterParsed.derived,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (useSandbox) upsertDemoSeasonLine(line);
      else upsertBatterSeasonLine(line);
      const hist = {
        id: `hist-${Date.now()}`,
        at: now,
        year,
        fileName: "manual-entry",
        screenType: "player_batting" as const,
        summary: `${formatSeasonLineLabel({ year, world })} ${selected.player.fullName} ${scope === "interleague" ? "交流戦" : ""}野手成績を手入力登録`,
        recordIds: [id],
      };
      if (useSandbox) appendDemoImportHistory(hist);
      else appendImportHistory(hist);
    } else if (isPitcher && pitcherParsed) {
      const id = seasonLineKey(
        selected.player.playerId,
        year,
        "pitcher",
        scope,
        world,
      );
      const line = {
        id,
        playerId: selected.player.playerId,
        playerName: selected.player.fullName,
        year,
        world,
        teamId,
        teamName,
        scope,
        role: "pitcher" as const,
        source: "manual" as const,
        counting: pitcherParsed.counting,
        derived: pitcherParsed.derived,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (useSandbox) upsertDemoSeasonLine(line);
      else upsertPitcherSeasonLine(line);
      const hist = {
        id: `hist-${Date.now()}`,
        at: now,
        year,
        fileName: "manual-entry",
        screenType: "player_pitching" as const,
        summary: `${formatSeasonLineLabel({ year, world })} ${selected.player.fullName} ${scope === "interleague" ? "交流戦" : ""}投手成績を手入力登録`,
        recordIds: [id],
      };
      if (useSandbox) appendDemoImportHistory(hist);
      else appendImportHistory(hist);
    } else {
      return;
    }

    if (!useSandbox) notifyImportStoreChanged();

    setOverwriteOpen(false);
    if (embed) {
      setSaveMessage(
        useSandbox
          ? `${selected.player.fullName} を分離デモ領域に登録しました。`
          : `${selected.player.fullName} の${scope === "interleague" ? "交流戦" : ""}成績を登録しました。`,
      );
      setStep("edit");
      return;
    }
    if (useSandbox) {
      router.push("/import/demo");
    } else {
      router.push(`/players/${selected.player.playerId}/yearly`);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50 p-4 md:p-5">
        <h2 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
          {scope === "interleague"
            ? "交流戦個人成績（手入力）"
            : "手入力登録（1選手）"}
        </h2>
        <p className="mt-1 text-[12px] text-white/55">
          {scope === "interleague"
            ? "scope: interleague として既存の個人成績ストアへ保存します。野手・投手を切り替えできます。"
            : "1選手ずつ詳細入力・修正します。画像からの10人一括は「画像から読み込み」を使ってください。打率・OPS・防御率などは自動計算します。"}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] tracking-[0.1em] text-white/55">
              登録するデータの種類
            </span>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as ManualEntryKindId);
                setStep("edit");
                setError(null);
                setSaveMessage(null);
              }}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
            >
              {MANUAL_ENTRY_KINDS.map((k) => (
                <option key={k.id} value={k.id} disabled={!k.enabled}>
                  {k.label}
                  {!k.enabled ? "（準備中）" : ""}
                </option>
              ))}
            </select>
          </label>

          {embed ? null : (
          <label className="block">
            <span className="mb-1 block text-[11px] tracking-[0.1em] text-white/55">
              シーズン
            </span>
            <select
              value={seasonKey}
              onChange={(e) => {
                const nextKey = e.target.value;
                setSeasonKey(nextKey);
                const next = parseSeasonKey(nextKey);
                const y = next?.year ?? year;
                if (selected) {
                  const hits = searchPlayerMasterCandidates(
                    selected.player.fullName,
                    y,
                    20,
                  );
                  const again =
                    hits.find(
                      (h) => h.player.playerId === selected.player.playerId,
                    ) ?? null;
                  setSelected(again);
                  if (!again) setQuery(selected.player.fullName);
                }
                setStep("edit");
              }}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
            >
              {entrySeasons.map((s) => (
                <option key={s.seasonKey} value={s.seasonKey}>
                  {s.kind === "demo"
                    ? `${s.year} DEMO SEASON`
                    : s.world
                      ? `${s.year} ${s.world}`
                      : `${s.year}年`}
                </option>
              ))}
            </select>
          </label>
          )}
        </div>

        <div className="mt-4">
          <PlayerNameAutocomplete
            year={year}
            value={query}
            selected={selected}
            onQueryChange={(q) => {
              setQuery(q);
              setSelected(null);
              setStep("edit");
            }}
            onSelect={(hit) => {
              setSelected(hit);
              setQuery(hit.player.fullName);
              setStep("edit");
            }}
            onClear={() => {
              setSelected(null);
              setQuery("");
            }}
          />
        </div>

        {selected?.affiliation ? (
          <p className="mt-2 text-[12px] text-white/60">
            所属球団（{year}年）:{" "}
            <span className="text-white">{selected.affiliation.teamName}</span>
          </p>
        ) : null}
      </section>

      {kindEnabled && step === "edit" ? (
        <section className="rounded-xl border border-white/10 bg-black/45 p-4 md:p-5">
          <h3 className="text-[12px] tracking-[0.12em] text-white/70">
            成績入力
          </h3>
          <p className="mt-1 text-[11px] text-white/45">
            率・指標は手入力不要です。下の数字を入れると自動計算が更新されます。
          </p>

          {isBatter && batterLive ? (
            <AutoCalcPanel className="mt-3" items={batterLive.items} />
          ) : null}
          {isPitcher && pitcherLive ? (
            <AutoCalcPanel className="mt-3" items={pitcherLive.items} />
          ) : null}

          {isBatter ? (
            <div className="mt-3 space-y-4">
              <div>
                <p className="mb-2 text-[11px] tracking-[0.08em] text-white/50">
                  基本打撃
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <StatNumberField
                    label="試合"
                    optional
                    value={batter.g}
                    onChange={(v) => patchBatter("g", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="打席"
                    optional
                    value={batter.pa}
                    onChange={(v) => patchBatter("pa", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="打数"
                    value={batter.ab}
                    onChange={(v) => patchBatter("ab", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="安打"
                    value={batter.h}
                    onChange={(v) => patchBatter("h", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="単打"
                    optional
                    hint="未入力時は安打−二−三−本"
                    value={batter.singles}
                    onChange={(v) => patchBatter("singles", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="二塁打"
                    optional
                    value={batter.doubles}
                    onChange={(v) => patchBatter("doubles", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="三塁打"
                    optional
                    value={batter.triples}
                    onChange={(v) => patchBatter("triples", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="本塁打"
                    value={batter.hr}
                    onChange={(v) => patchBatter("hr", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="塁打"
                    optional
                    hint="未入力時は内訳から算出"
                    value={batter.tb}
                    onChange={(v) => patchBatter("tb", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="打点"
                    value={batter.rbi}
                    onChange={(v) => patchBatter("rbi", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="得点"
                    optional
                    value={batter.r}
                    onChange={(v) => patchBatter("r", v)}
                    normalize={normalizeIntegerInput}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] tracking-[0.08em] text-white/50">
                  得点圏（正式保存）
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <StatNumberField
                    label="得点圏打数"
                    optional
                    value={batter.rispAb}
                    onChange={(v) => patchBatter("rispAb", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="得点圏安打"
                    optional
                    value={batter.rispH}
                    onChange={(v) => patchBatter("rispH", v)}
                    normalize={normalizeIntegerInput}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] tracking-[0.08em] text-white/50">
                  走塁・出塁
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <StatNumberField
                    label="三振"
                    optional
                    value={batter.so}
                    onChange={(v) => patchBatter("so", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="四球"
                    optional
                    value={batter.bb}
                    onChange={(v) => patchBatter("bb", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="死球"
                    optional
                    value={batter.hbp}
                    onChange={(v) => patchBatter("hbp", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="犠打"
                    optional
                    value={batter.sac}
                    onChange={(v) => patchBatter("sac", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="犠飛"
                    optional
                    value={batter.sf}
                    onChange={(v) => patchBatter("sf", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="盗塁"
                    optional
                    value={batter.sb}
                    onChange={(v) => patchBatter("sb", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="盗塁死"
                    optional
                    hint="未入力はデータなし（0とは区別）"
                    value={batter.cs}
                    onChange={(v) => patchBatter("cs", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="連続安打"
                    optional
                    value={batter.hitStreak}
                    onChange={(v) => patchBatter("hitStreak", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="連続出塁"
                    optional
                    value={batter.onBaseStreak}
                    onChange={(v) => patchBatter("onBaseStreak", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="猛打賞"
                    optional
                    value={batter.multiHit}
                    onChange={(v) => patchBatter("multiHit", v)}
                    normalize={normalizeIntegerInput}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] tracking-[0.08em] text-white/50">
                  捕手（盗塁阻止）
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <StatNumberField
                    label="被盗塁企図数"
                    optional
                    hint="未入力はデータなし（0とは区別）"
                    value={batter.csAttempted}
                    onChange={(v) => patchBatter("csAttempted", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="許盗塁数"
                    optional
                    value={batter.csAllowed}
                    onChange={(v) => patchBatter("csAllowed", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="盗塁刺"
                    optional
                    value={batter.csCaught}
                    onChange={(v) => patchBatter("csCaught", v)}
                    normalize={normalizeIntegerInput}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {isPitcher ? (
            <div className="mt-3 space-y-4">
              <div>
                <p className="mb-2 text-[11px] tracking-[0.08em] text-white/50">
                  基本成績
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <StatNumberField
                    label="登板"
                    value={pitcher.g}
                    onChange={(v) => patchPitcher("g", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="勝利"
                    value={pitcher.w}
                    onChange={(v) => patchPitcher("w", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="敗戦"
                    value={pitcher.l}
                    onChange={(v) => patchPitcher("l", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="セーブ"
                    optional
                    value={pitcher.sv}
                    onChange={(v) => patchPitcher("sv", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="ホールド"
                    optional
                    value={pitcher.hld}
                    onChange={(v) => patchPitcher("hld", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="投球回"
                    hint="例: 120.1（.1=1/3回）"
                    value={pitcher.ip}
                    onChange={(v) => patchPitcher("ip", v)}
                    normalize={normalizeIpInput}
                  />
                  <StatNumberField
                    label="失点"
                    optional
                    value={pitcher.r}
                    onChange={(v) => patchPitcher("r", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="自責点"
                    value={pitcher.er}
                    onChange={(v) => patchPitcher("er", v)}
                    normalize={normalizeIntegerInput}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] tracking-[0.08em] text-white/50">
                  先発・QS
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <StatNumberField
                    label="先発"
                    optional
                    hint="QS率・HQS率の分母"
                    value={pitcher.gs}
                    onChange={(v) => patchPitcher("gs", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="完投"
                    optional
                    value={pitcher.cg}
                    onChange={(v) => patchPitcher("cg", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="完封"
                    optional
                    value={pitcher.sho}
                    onChange={(v) => patchPitcher("sho", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="QS"
                    optional
                    value={pitcher.qs}
                    onChange={(v) => patchPitcher("qs", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="HQS"
                    optional
                    value={pitcher.hqs}
                    onChange={(v) => patchPitcher("hqs", v)}
                    normalize={normalizeIntegerInput}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] tracking-[0.08em] text-white/50">
                  奪三振・四球・被打撃
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <StatNumberField
                    label="奪三振"
                    value={pitcher.so}
                    onChange={(v) => patchPitcher("so", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="与四球"
                    optional
                    hint="四球率・K/BB・WHIP"
                    value={pitcher.bb}
                    onChange={(v) => patchPitcher("bb", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="与死球"
                    optional
                    value={pitcher.hbp}
                    onChange={(v) => patchPitcher("hbp", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="被安打"
                    optional
                    hint="WHIP算出に使用"
                    value={pitcher.h}
                    onChange={(v) => patchPitcher("h", v)}
                    normalize={normalizeIntegerInput}
                  />
                  <StatNumberField
                    label="被本塁打"
                    optional
                    value={pitcher.hr}
                    onChange={(v) => patchPitcher("hr", v)}
                    normalize={normalizeIntegerInput}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {isBatter && batterParsed && batterParsed.warnings.length > 0 ? (
            <ul className="mt-3 space-y-0.5 text-[11px] text-amber-200/90">
              {batterParsed.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}
          {isPitcher && pitcherParsed && pitcherParsed.warnings.length > 0 ? (
            <ul className="mt-3 space-y-0.5 text-[11px] text-amber-200/90">
              {pitcherParsed.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}

        </section>
      ) : null}

      {step === "confirm" && selected ? (
        <section className="rounded-xl border border-[color:var(--museum-accent,#d4af37)]/40 bg-[color:var(--museum-accent,#d4af37)]/8 p-4 md:p-5">
          <h3 className="text-[12px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
            登録内容の確認
          </h3>
          <dl className="mt-3 space-y-2 text-[13px] text-white/85">
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-white/45">年度</dt>
              <dd>{year}年</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-white/45">選手</dt>
              <dd>{selected.player.fullName}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-white/45">球団</dt>
              <dd>{selected.affiliation?.teamName ?? "—"}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-white/45">成績</dt>
              <dd>
                {isBatter && batterParsed
                  ? formatBatterSummary(
                      batterParsed.counting,
                      batterParsed.derived,
                    )
                  : null}
                {isPitcher && pitcherParsed
                  ? formatPitcherSummary(
                      pitcherParsed.counting,
                      pitcherParsed.derived,
                    )
                  : null}
              </dd>
            </div>
          </dl>
          {isBatter && batterLive ? (
            <AutoCalcPanel className="mt-3" items={batterLive.items} />
          ) : null}
          {isPitcher && pitcherLive ? (
            <AutoCalcPanel className="mt-3" items={pitcherLive.items} />
          ) : null}
          {(isBatter && batterParsed?.warnings.length) ||
          (isPitcher && pitcherParsed?.warnings.length) ? (
            <ul className="mt-3 space-y-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
              {(batterParsed?.warnings ?? pitcherParsed?.warnings ?? []).map(
                (w) => (
                  <li key={w}>⚠ {w}</li>
                ),
              )}
              <li className="text-amber-100/70">警告のみです。登録は可能です。</li>
            </ul>
          ) : null}
          {existing ? (
            <p className="mt-3 text-[12px] text-amber-100">
              同じ年度・選手・成績種別のデータが既にあります。更新になります。
            </p>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-[13px] text-red-100">
          {error}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white/70">
          {saveMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {step === "edit" ? (
          <button
            type="button"
            onClick={goConfirm}
            className="rounded-md border border-[color:var(--museum-accent,#d4af37)]/55 bg-[color:var(--museum-accent,#d4af37)]/20 px-4 py-2 text-[13px] text-[color:var(--museum-accent,#d4af37)]"
          >
            確認へ
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep("edit")}
              className="rounded-md border border-white/20 px-4 py-2 text-[13px] text-white/75"
            >
              戻って修正
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              className="rounded-md border border-[color:var(--museum-accent,#d4af37)]/55 bg-[color:var(--museum-accent,#d4af37)]/20 px-4 py-2 text-[13px] text-[color:var(--museum-accent,#d4af37)]"
            >
              登録する
            </button>
          </>
        )}
      </div>

      {overwriteOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0b1220] p-5">
            <p className="text-[15px] font-medium text-white">
              既存データがあります。更新しますか？
            </p>
            <p className="mt-2 text-[12px] text-white/60">
              同じ年度・選手・成績種別の記録を上書きします。二重登録はされません。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverwriteOpen(false)}
                className="rounded-md border border-white/20 px-3 py-1.5 text-[12px] text-white/70"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => save(true)}
                className={cn(
                  "rounded-md border border-[color:var(--museum-accent,#d4af37)]/55 bg-[color:var(--museum-accent,#d4af37)]/20 px-3 py-1.5 text-[12px] text-[color:var(--museum-accent,#d4af37)]",
                )}
              >
                更新する
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


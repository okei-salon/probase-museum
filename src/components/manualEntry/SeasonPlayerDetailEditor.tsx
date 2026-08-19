"use client";

import { useEffect, useMemo, useState } from "react";
import { AutoCalcPanel } from "@/components/manualEntry/AutoCalcPanel";
import { PlayerNameAutocomplete } from "@/components/manualEntry/PlayerNameAutocomplete";
import { StatNumberField } from "@/components/manualEntry/StatNumberField";
import { DEMO_IMPORT_YEAR } from "@/data/import/demoMode";
import type {
  SeasonBatchFieldKey,
  SeasonBatchPlayerRow,
  SeasonBatchRole,
} from "@/data/import/seasonBatchTypes";
import {
  teamIdFromShort,
  teamNameFromShort,
  normalizeTeamShort,
} from "@/lib/import/seasonBatchMerge";
import {
  batterAutoCalcItems,
  computeBatterDerived,
  computePitcherDerived,
  pitcherAutoCalcItems,
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

type SeasonPlayerDetailEditorProps = {
  role: SeasonBatchRole;
  year: number;
  row: SeasonBatchPlayerRow;
  onSave: (row: SeasonBatchPlayerRow) => void;
  onClose: () => void;
};

function fieldStr(
  row: SeasonBatchPlayerRow,
  key: SeasonBatchFieldKey,
): string {
  const c = row.fields[key];
  if (!c) return "";
  if (c.display) return c.display;
  if (c.value == null) return "";
  return String(c.value);
}

function setField(
  row: SeasonBatchPlayerRow,
  key: SeasonBatchFieldKey,
  raw: string,
  asNumber = true,
): SeasonBatchPlayerRow {
  const trimmed = raw.trim();
  if (!trimmed) {
    const fields = { ...row.fields };
    delete fields[key];
    return { ...row, fields };
  }
  const n = asNumber ? Number(trimmed.replace(/[^\d.-]/g, "")) : NaN;
  const value =
    asNumber && Number.isFinite(n)
      ? n
      : key === "ip"
        ? trimmed
        : Number.isFinite(n)
          ? n
          : trimmed;
  return {
    ...row,
    fields: {
      ...row.fields,
      [key]: {
        value: typeof value === "number" ? value : value,
        display: trimmed,
        status: "ok",
        sources: row.fields[key]?.sources ?? [],
      },
    },
  };
}

export function SeasonPlayerDetailEditor({
  role,
  year,
  row: initial,
  onSave,
  onClose,
}: SeasonPlayerDetailEditorProps) {
  const [row, setRow] = useState(initial);
  const [query, setQuery] = useState(initial.playerName);
  const [selected, setSelected] = useState<PlayerSearchHit | null>(null);

  useEffect(() => {
    setRow(initial);
    setQuery(initial.playerName);
    if (initial.playerId) {
      const hits = searchPlayerMasterCandidates(initial.playerName, year, 20);
      setSelected(
        hits.find((h) => h.player.playerId === initial.playerId) ?? null,
      );
    } else {
      setSelected(null);
    }
  }, [initial, year]);

  const isPitcher = role === "pitcher";
  const isCatcher = role === "catcher";

  const batterLive = useMemo(() => {
    if (isPitcher) return null;
    const ab = Number(fieldStr(row, "ab")) || 0;
    const h = Number(fieldStr(row, "h")) || 0;
    const derived = computeBatterDerived({
      ab,
      h,
      doubles: Number(fieldStr(row, "doubles")) || 0,
      triples: Number(fieldStr(row, "triples")) || 0,
      hr: Number(fieldStr(row, "hr")) || 0,
      bb: Number(fieldStr(row, "bb")) || 0,
      hbp: Number(fieldStr(row, "hbp")) || 0,
      sf: Number(fieldStr(row, "sf")) || 0,
      singles: fieldStr(row, "singles") ? Number(fieldStr(row, "singles")) : null,
      tb: fieldStr(row, "tb") ? Number(fieldStr(row, "tb")) : null,
      pa: fieldStr(row, "pa") ? Number(fieldStr(row, "pa")) : null,
      so: fieldStr(row, "so") ? Number(fieldStr(row, "so")) : null,
      sb: fieldStr(row, "sb") ? Number(fieldStr(row, "sb")) : null,
      sba: fieldStr(row, "sba") ? Number(fieldStr(row, "sba")) : null,
      csAttempted: fieldStr(row, "csAttempted")
        ? Number(fieldStr(row, "csAttempted"))
        : null,
      csCaught: fieldStr(row, "csCaught")
        ? Number(fieldStr(row, "csCaught"))
        : null,
    });
    return { items: batterAutoCalcItems(derived), derived };
  }, [row, isPitcher]);

  const pitcherLive = useMemo(() => {
    if (!isPitcher) return null;
    const ip = fieldStr(row, "ip");
    const outs = ip ? ipDisplayToOuts(ip) : 0;
    const counting = {
      g: Number(fieldStr(row, "g")) || 0,
      w: Number(fieldStr(row, "w")) || 0,
      l: Number(fieldStr(row, "l")) || 0,
      ipOuts: outs ?? 0,
      er: Number(fieldStr(row, "er")) || 0,
      so: Number(fieldStr(row, "so")) || 0,
      h: fieldStr(row, "h") ? Number(fieldStr(row, "h")) : null,
      bb: fieldStr(row, "bb") ? Number(fieldStr(row, "bb")) : null,
      hr: fieldStr(row, "hr") ? Number(fieldStr(row, "hr")) : null,
      hbp: fieldStr(row, "hbp") ? Number(fieldStr(row, "hbp")) : null,
      sv: fieldStr(row, "sv") ? Number(fieldStr(row, "sv")) : null,
      hld: fieldStr(row, "hld") ? Number(fieldStr(row, "hld")) : null,
      qs: fieldStr(row, "qs") ? Number(fieldStr(row, "qs")) : null,
      hqs: fieldStr(row, "hqs") ? Number(fieldStr(row, "hqs")) : null,
      gs: fieldStr(row, "gs") ? Number(fieldStr(row, "gs")) : null,
    };
    const derived = computePitcherDerived(counting);
    return { items: pitcherAutoCalcItems(derived), derived };
  }, [row, isPitcher]);

  function patch(key: SeasonBatchFieldKey, v: string) {
    setRow((r) => setField(r, key, v, key !== "ip"));
  }

  function applyPlayer(hit: PlayerSearchHit) {
    setSelected(hit);
    setQuery(hit.player.fullName);
    const teamShort =
      hit.teamShort !== "—"
        ? hit.teamShort
        : normalizeTeamShort(hit.affiliation?.teamName ?? row.teamShort);
    setRow((r) => ({
      ...r,
      playerName: hit.player.fullName,
      playerId: hit.player.playerId,
      teamShort,
      teamId: (hit.affiliation?.teamId as typeof r.teamId) ?? teamIdFromShort(teamShort),
      teamName: hit.affiliation?.teamName ?? teamNameFromShort(teamShort),
      nameStatus: "ok",
      teamStatus: teamShort ? "ok" : "needs_confirm",
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-[#0c0c0c] p-4 shadow-xl md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
              個別修正
            </h3>
            <p className="mt-1 text-[12px] text-white/50">
              一括確認表の1選手を詳細編集します。保存すると表へ反映されます（まだ本登録ではありません）。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2 py-1 text-[12px] text-white/70 hover:border-white/30"
          >
            閉じる
          </button>
        </div>

        <div className="mt-4">
          <PlayerNameAutocomplete
            year={year === DEMO_IMPORT_YEAR ? 2026 : year}
            value={query}
            selected={selected}
            onQueryChange={(q) => {
              setQuery(q);
              setSelected(null);
              setRow((r) => ({
                ...r,
                playerName: q,
                playerId: undefined,
                nameStatus: "needs_confirm",
              }));
            }}
            onSelect={applyPlayer}
            onClear={() => {
              setSelected(null);
              setQuery("");
              setRow((r) => ({
                ...r,
                playerName: "",
                playerId: undefined,
                nameStatus: "needs_confirm",
              }));
            }}
          />
          {row.ocrName ? (
            <p className="mt-1 text-[11px] text-white/40">
              OCR読取: {row.ocrName}
            </p>
          ) : null}
          {(row.nameCandidates?.length ?? 0) > 0 &&
          row.nameStatus === "needs_confirm" ? (
            <label className="mt-2 block">
              <span className="mb-1 block text-[11px] text-amber-200/80">
                選手マスタ候補（OCR＋球団照合）
              </span>
              <select
                value={row.playerId ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const c = row.nameCandidates?.find((x) => x.playerId === id);
                  if (!c) return;
                  const fullName = c.label.replace(/（[^）]*）$/, "");
                  setQuery(fullName);
                  setSelected(null);
                  setRow((r) => ({
                    ...r,
                    playerId: c.playerId,
                    playerName: fullName,
                    teamShort: c.teamShort || r.teamShort,
                    teamId: teamIdFromShort(c.teamShort || r.teamShort),
                    teamName: teamNameFromShort(c.teamShort || r.teamShort),
                    nameStatus: "ok",
                    teamStatus: c.teamShort ? "ok" : r.teamStatus,
                  }));
                }}
                className="w-full rounded-lg border border-amber-400/40 bg-black/60 px-3 py-2 text-[13px] text-amber-50"
              >
                <option value="">要確認 — 候補から選択</option>
                {row.nameCandidates!.map((c) => (
                  <option key={c.playerId} value={c.playerId}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] text-white/55">球団（略称）</span>
          <input
            value={row.teamShort}
            onChange={(e) => {
              const teamShort = normalizeTeamShort(e.target.value);
              setRow((r) => ({
                ...r,
                teamShort: e.target.value,
                teamId: teamIdFromShort(teamShort),
                teamName: teamNameFromShort(teamShort),
                teamStatus: teamIdFromShort(teamShort) ? "ok" : "needs_confirm",
              }));
            }}
            className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
            placeholder="阪神"
          />
        </label>

        {batterLive ? <AutoCalcPanel className="mt-3" items={batterLive.items} /> : null}
        {pitcherLive ? <AutoCalcPanel className="mt-3" items={pitcherLive.items} /> : null}

        {isPitcher ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {(
              [
                ["g", "登板", false],
                ["w", "勝利", false],
                ["l", "敗戦", false],
                ["sv", "セーブ", true],
                ["hld", "ホールド", true],
                ["ip", "投球回", false],
                ["er", "自責点", false],
                ["r", "失点", true],
                ["so", "奪三振", false],
                ["h", "被安打", true],
                ["hr", "被本塁打", true],
                ["bb", "与四球", true],
                ["hbp", "与死球", true],
                ["qs", "QS", true],
                ["hqs", "HQS", true],
                ["gs", "先発", true],
              ] as const
            ).map(([key, label, optional]) => (
              <StatNumberField
                key={key}
                label={label}
                optional={optional}
                value={fieldStr(row, key)}
                onChange={(v) => patch(key, v)}
                normalize={key === "ip" ? normalizeIpInput : normalizeIntegerInput}
              />
            ))}
          </div>
        ) : isCatcher ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {(
              [
                ["g", "試合"],
                ["csAttempted", "被盗塁企図数"],
                ["csAllowed", "許盗塁数"],
                ["csCaught", "盗塁刺"],
              ] as const
            ).map(([key, label]) => (
              <StatNumberField
                key={key}
                label={label}
                optional
                value={fieldStr(row, key)}
                onChange={(v) => patch(key, v)}
                normalize={normalizeIntegerInput}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {(
              [
                ["g", "試合", true],
                ["pa", "打席", true],
                ["ab", "打数", false],
                ["h", "安打", false],
                ["doubles", "二塁打", true],
                ["triples", "三塁打", true],
                ["hr", "本塁打", false],
                ["tb", "塁打", true],
                ["rbi", "打点", false],
                ["rispAb", "得点圏打数", true],
                ["rispH", "得点圏安打", true],
                ["r", "得点", true],
                ["bb", "四球", true],
                ["hbp", "死球", true],
                ["sac", "犠打", true],
                ["sf", "犠飛", true],
                ["sb", "盗塁", true],
                ["cs", "盗塁死", true],
                ["hitStreak", "連続安打", true],
                ["onBaseStreak", "連続出塁", true],
                ["multiHit", "猛打賞", true],
                ["csAttempted", "被盗塁企図数", true],
                ["csAllowed", "許盗塁数", true],
                ["csCaught", "盗塁刺", true],
              ] as const
            ).map(([key, label, optional]) => (
              <StatNumberField
                key={key}
                label={label}
                optional={optional}
                value={fieldStr(row, key)}
                onChange={(v) => patch(key, v)}
                normalize={normalizeIntegerInput}
              />
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onSave(row)}
            className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
          >
            表へ反映
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  notifyImportStoreChanged,
  subscribeImportDemoMode,
} from "@/data/import/demoMode";
import { ACHIEVEMENT_CATALOG } from "@/data/seasonAchievements/catalog";
import {
  hydrateSeasonAchievementsFromCloud,
  listStoredAchievementsForSeasonIdentity,
  removeStoredAchievementAsync,
  upsertStoredAchievementAsync,
  type SeasonAchievement,
} from "@/data/seasonAchievements";
import {
  listEntrySeasonIdentities,
  makeSeasonKey,
  parseSeasonKey,
} from "@/data/seasons";
import {
  recordNeedsValue,
  roleForRecordType,
  sopPointsForRecordType,
} from "@/lib/import/achievementSopPoints";
import { normalizeIntegerInput } from "@/lib/manualEntry/normalizeInput";
import { npbTeams } from "@/data/teams";
import { cn } from "@/lib/cn";

const EDITABLE = ACHIEVEMENT_CATALOG.filter((c) => c.needsManual);

type EditDraft = {
  recordType: string;
  playerName: string;
  teamShort: string;
  valueStr: string;
};

function formatValue(a: SeasonAchievement): string {
  if (a.valueLabel) return a.valueLabel;
  if (a.value != null) return `${a.value}${a.unit ?? ""}`;
  return "—";
}

export function SpecialRecordsManagePanel() {
  const entrySeasons = useMemo(() => listEntrySeasonIdentities(), []);
  const [seasonKey, setSeasonKey] = useState(
    () =>
      entrySeasons.find((s) => s.seasonKey === "BLUE_2027")?.seasonKey ??
      entrySeasons[0]?.seasonKey ??
      makeSeasonKey("BLUE", 2027),
  );
  const identity = useMemo(
    () => parseSeasonKey(seasonKey) ?? entrySeasons[0]!,
    [seasonKey, entrySeasons],
  );
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SeasonAchievement | null>(
    null,
  );

  useEffect(() => subscribeImportDemoMode(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    void hydrateSeasonAchievementsFromCloud().then(() => {
      setTick((t) => t + 1);
      notifyImportStoreChanged();
    });
  }, [seasonKey]);

  const rows = useMemo(() => {
    void tick;
    return listStoredAchievementsForSeasonIdentity(identity).sort((a, b) => {
      const c = a.recordName.localeCompare(b.recordName, "ja");
      if (c !== 0) return c;
      return a.playerName.localeCompare(b.playerName, "ja");
    });
  }, [identity, tick]);

  function startEdit(row: SeasonAchievement) {
    setError(null);
    setMessage(null);
    setEditingId(row.id);
    setDraft({
      recordType: row.recordType,
      playerName: row.playerName,
      teamShort: row.teamShort,
      valueStr: row.value != null ? String(row.value) : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(row: SeasonAchievement) {
    if (!draft) return;
    const catalog = ACHIEVEMENT_CATALOG.find(
      (c) => c.recordType === draft.recordType,
    );
    if (!catalog) {
      setError("記録種別が不正です");
      return;
    }
    const needsValue = recordNeedsValue(draft.recordType);
    let value: number | null = null;
    if (needsValue) {
      const n = normalizeIntegerInput(draft.valueStr);
      if (n.value == null) {
        setError("記録数値を入力してください");
        return;
      }
      value = n.value;
    }
    const playerName = draft.playerName.trim();
    if (!playerName) {
      setError("選手名を入力してください");
      return;
    }
    const teamShort = draft.teamShort.trim() || "—";
    const sopPoints = sopPointsForRecordType(draft.recordType, value);
    const next: SeasonAchievement = {
      ...row,
      id: row.id,
      recordType: draft.recordType,
      recordName: catalog.recordName,
      category: catalog.category,
      role: roleForRecordType(draft.recordType),
      playerName,
      teamShort,
      value,
      unit: catalog.unit ?? null,
      valueLabel: needsValue
        ? `${value}${catalog.unit ?? ""}`
        : catalog.recordName,
      sopPoints,
      updatedAt: new Date().toISOString(),
    };

    setBusyId(row.id);
    setError(null);
    setMessage(null);
    const result = await upsertStoredAchievementAsync(next);
    setBusyId(null);
    if (!result.ok) {
      setError(`修正に失敗しました（${result.error}）。画面の内容は変更していません。`);
      return;
    }
    setEditingId(null);
    setDraft(null);
    setMessage(
      result.cloudSynced
        ? `修正しました: ${next.recordName} / ${next.playerName}`
        : `修正をローカルに保存しました（クラウド未接続）。接続後に再同期してください: ${next.recordName} / ${next.playerName}`,
    );
    setTick((t) => t + 1);
    notifyImportStoreChanged();
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    setBusyId(target.id);
    setError(null);
    setMessage(null);
    const result = await removeStoredAchievementAsync(target.id);
    setBusyId(null);
    if (!result.ok) {
      setPendingDelete(null);
      setError(
        `削除に失敗しました（${result.error}）。一覧から消えていません。再試行してください。`,
      );
      return;
    }
    setPendingDelete(null);
    setMessage(
      result.cloudSynced
        ? `削除しました: ${target.recordName} / ${target.playerName} / ${formatValue(target)}`
        : `ローカルから削除しました（クラウド未接続）: ${target.recordName} / ${target.playerName}。接続後に再削除が必要な場合があります。`,
    );
    setTick((t) => t + 1);
    notifyImportStoreChanged();
  }

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-black/35 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[13px] tracking-[0.08em] text-[color:var(--museum-accent,#d4af37)]">
            登録済み記録を管理
          </h3>
          <p className="mt-1 text-[11px] text-white/45">
            修正・削除は選択した1件のIDのみ対象です。同種・同値の他記録には影響しません。
          </p>
        </div>
        <label className="block min-w-[12rem]">
          <span className="mb-1 block text-[11px] text-white/55">
            年度・WORLD
          </span>
          <select
            value={seasonKey}
            onChange={(e) => {
              setSeasonKey(e.target.value);
              cancelEdit();
              setPendingDelete(null);
              setMessage(null);
              setError(null);
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
      </div>

      {rows.length === 0 ? (
        <p className="text-[12px] text-white/45">
          このシーズンに登録済みの特殊記録はありません。
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[12px]">
            <thead>
              <tr className="text-white/45">
                <th className="py-1.5 pr-2">記録種別</th>
                <th className="pr-2">選手</th>
                <th className="pr-2">球団</th>
                <th className="pr-2">数値</th>
                <th className="pr-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const editing = editingId === row.id && draft;
                return (
                  <tr key={row.id} className="border-t border-white/8 align-top">
                    <td className="py-2 pr-2">
                      {editing ? (
                        <select
                          value={draft.recordType}
                          onChange={(e) =>
                            setDraft({ ...draft, recordType: e.target.value })
                          }
                          className="w-full rounded border border-white/15 bg-black/60 px-2 py-1 text-white"
                        >
                          {EDITABLE.map((c) => (
                            <option key={c.recordType} value={c.recordType}>
                              {c.recordName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{row.recordName}</span>
                      )}
                      <div className="mt-0.5 font-mono text-[10px] text-white/25">
                        {row.id}
                      </div>
                    </td>
                    <td className="pr-2">
                      {editing ? (
                        <input
                          value={draft.playerName}
                          onChange={(e) =>
                            setDraft({ ...draft, playerName: e.target.value })
                          }
                          className="w-full rounded border border-white/15 bg-black/60 px-2 py-1 text-white"
                        />
                      ) : (
                        row.playerName
                      )}
                    </td>
                    <td className="pr-2">
                      {editing ? (
                        <select
                          value={draft.teamShort}
                          onChange={(e) =>
                            setDraft({ ...draft, teamShort: e.target.value })
                          }
                          className="w-full rounded border border-white/15 bg-black/60 px-2 py-1 text-white"
                        >
                          {!npbTeams.some((t) => t.short === draft.teamShort) ? (
                            <option value={draft.teamShort}>
                              {draft.teamShort || "—"}
                            </option>
                          ) : null}
                          {npbTeams.map((t) => (
                            <option key={t.id} value={t.short}>
                              {t.short}
                            </option>
                          ))}
                        </select>
                      ) : (
                        row.teamShort
                      )}
                    </td>
                    <td className="pr-2">
                      {editing ? (
                        recordNeedsValue(draft.recordType) ? (
                          <input
                            value={draft.valueStr}
                            onChange={(e) =>
                              setDraft({ ...draft, valueStr: e.target.value })
                            }
                            className="w-24 rounded border border-white/15 bg-black/60 px-2 py-1 text-white"
                          />
                        ) : (
                          <span className="text-white/40">（不要）</span>
                        )
                      ) : (
                        formatValue(row)
                      )}
                    </td>
                    <td className="pr-2">
                      {editing ? (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void saveEdit(row)}
                            className="rounded border border-[color:var(--museum-accent,#d4af37)]/50 bg-[color:var(--museum-accent,#d4af37)]/15 px-2 py-1 text-[11px] text-[color:var(--museum-accent,#d4af37)] disabled:opacity-40"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={cancelEdit}
                            className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/65"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={busyId != null}
                            onClick={() => startEdit(row)}
                            className="rounded border border-white/20 px-2 py-1 text-[11px] text-white/75 hover:border-white/40"
                          >
                            修正
                          </button>
                          <button
                            type="button"
                            disabled={busyId != null}
                            onClick={() => {
                              setError(null);
                              setPendingDelete(row);
                            }}
                            className={cn(
                              "rounded border border-rose-400/35 px-2 py-1 text-[11px] text-rose-200/90 hover:border-rose-300/55",
                            )}
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {message ? (
        <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100/90">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          {error}
        </p>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0c0c0c] p-5">
            <h3 className="text-[13px] text-[color:var(--museum-accent,#d4af37)]">
              削除の確認
            </h3>
            <p className="mt-2 text-[12px] text-white/65">
              次の記録を削除します。この操作は選択した1件だけです。
            </p>
            <ul className="mt-3 space-y-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[12px] text-white/80">
              <li>記録: {pendingDelete.recordName}</li>
              <li>選手: {pendingDelete.playerName}</li>
              <li>球団: {pendingDelete.teamShort}</li>
              <li>数値: {formatValue(pendingDelete)}</li>
              <li className="font-mono text-[10px] text-white/40">
                id: {pendingDelete.id}
              </li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={busyId === pendingDelete.id}
                onClick={() => setPendingDelete(null)}
                className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
              >
                戻る
              </button>
              <button
                type="button"
                disabled={busyId === pendingDelete.id}
                onClick={() => void confirmDelete()}
                className="rounded-md border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-[12px] text-rose-100"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

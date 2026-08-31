"use client";

import { useState, type CSSProperties, type MouseEvent } from "react";
import type {
  SeasonBatchFieldKey,
  SeasonBatchNameCandidate,
  SeasonBatchPlayerRow,
  SeasonBatchRole,
} from "@/data/import/seasonBatchTypes";
import {
  batchColumnsForRole,
  type BatchColumnDef,
} from "@/lib/import/seasonBatchConvert";
import {
  cellNeedsAttention,
  rowHasStatWarnings,
  rowNameNeedsAttention,
  summarizeRowWarnings,
} from "@/lib/import/seasonBatchMerge";
import {
  finalizeBatchRow,
  listStatWarningLabels,
} from "@/lib/import/seasonBatchRateCheck";
import { parseStatToken } from "@/lib/import/parseSeasonRankingOcr";
import { PlayerNameAutocomplete } from "@/components/manualEntry/PlayerNameAutocomplete";
import { confirmExistingPlayer } from "@/lib/playerMaster/learn";
import { cn } from "@/lib/cn";

type SeasonBatchTableProps = {
  role: SeasonBatchRole;
  year: number;
  rows: SeasonBatchPlayerRow[];
  onSelectRow: (rowId: string) => void;
  onPatchCell?: (
    rowId: string,
    patch: Partial<
      Pick<
        SeasonBatchPlayerRow,
        | "playerName"
        | "teamShort"
        | "playerId"
        | "nameStatus"
        | "teamStatus"
        | "teamId"
        | "teamName"
        | "fields"
        | "nameCandidates"
        | "ocrName"
        | "pendingNewPlayer"
      >
    >,
  ) => void;
};

const RANK_COL_W = 40;

function stickyLeftFor(
  columns: BatchColumnDef[],
  key: string,
): number | undefined {
  let left = RANK_COL_W;
  for (const col of columns) {
    if (col.key === key) return left;
    if (col.sticky) left += col.minWidth;
  }
  return undefined;
}

export function SeasonBatchTable({
  role,
  year,
  rows,
  onSelectRow,
  onPatchCell,
}: SeasonBatchTableProps) {
  const columns = batchColumnsForRole(role);
  const [editing, setEditing] = useState<{
    rowId: string;
    key: SeasonBatchFieldKey | "playerName" | "teamShort";
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [nameQueryByRow, setNameQueryByRow] = useState<Record<string, string>>(
    {},
  );

  function startEdit(
    row: SeasonBatchPlayerRow,
    key: SeasonBatchFieldKey | "playerName" | "teamShort",
    e: MouseEvent,
  ) {
    e.stopPropagation();
    if (!onPatchCell) {
      onSelectRow(row.rowId);
      return;
    }
    // 未照合の選手名はオートコンプリートで選択（自由編集は候補選択後）
    if (key === "playerName" && !row.playerId) {
      return;
    }
    const value =
      key === "playerName"
        ? row.playerName
        : key === "teamShort"
          ? row.teamShort
          : row.fields[key]?.display ||
            (row.fields[key]?.value != null
              ? String(row.fields[key]!.value)
              : "");
    setEditing({ rowId: row.rowId, key });
    setDraft(value);
  }

  function commitEdit(row: SeasonBatchPlayerRow) {
    if (!editing || !onPatchCell) return;
    const { key } = editing;
    if (key === "playerName") {
      onPatchCell(row.rowId, {
        playerName: draft.trim(),
        playerId: undefined,
        nameStatus: "needs_confirm",
      });
    } else if (key === "teamShort") {
      onPatchCell(row.rowId, { teamShort: draft.trim() });
    } else {
      const parsed = parseStatToken(draft, key, role);
      onPatchCell(row.rowId, {
        fields: {
          ...row.fields,
          [key]: {
            value: parsed.value,
            display: parsed.display || draft,
            status:
              parsed.status === "empty"
                ? "empty"
                : parsed.status === "invalid"
                  ? "needs_confirm"
                  : parsed.status,
            note: parsed.note,
            sources: row.fields[key]?.sources ?? [],
          },
        },
      });
    }
    setEditing(null);
  }

  function applyCandidate(row: SeasonBatchPlayerRow, c: SeasonBatchNameCandidate) {
    if (!onPatchCell) return;
    const labelName = c.label.replace(/（.*）$/, "");
    const ocrName = row.ocrName || row.playerName;
    try {
      confirmExistingPlayer({
        playerId: c.playerId,
        observation: {
          gameDisplayName: ocrName,
          team: c.teamShort || row.teamShort,
          year,
          position: role === "pitcher" ? "投手" : null,
        },
        learnOcrAsAlias: true,
      });
    } catch {
      // マスター更新に失敗しても選択自体は反映
    }
    onPatchCell(row.rowId, {
      playerId: c.playerId,
      playerName: labelName,
      ocrName,
      teamShort: c.teamShort || row.teamShort,
      nameStatus: "ok",
      teamStatus: c.teamShort ? "ok" : row.teamStatus,
      nameCandidates: undefined,
      pendingNewPlayer: false,
    });
    setNameQueryByRow((prev) => {
      const next = { ...prev };
      delete next[row.rowId];
      return next;
    });
  }

  function applyMasterHit(
    row: SeasonBatchPlayerRow,
    playerId: string,
    fullName: string,
    teamShort: string,
  ) {
    if (!onPatchCell) return;
    const ocrName = row.ocrName || row.playerName;
    try {
      confirmExistingPlayer({
        playerId,
        observation: {
          gameDisplayName: ocrName,
          team: teamShort || row.teamShort,
          year,
          position: role === "pitcher" ? "投手" : null,
        },
        learnOcrAsAlias: true,
      });
    } catch {
      // ignore
    }
    onPatchCell(row.rowId, {
      playerId,
      playerName: fullName,
      ocrName,
      teamShort: teamShort !== "—" ? teamShort : row.teamShort,
      nameStatus: "ok",
      teamStatus: teamShort && teamShort !== "—" ? "ok" : row.teamStatus,
      nameCandidates: undefined,
      pendingNewPlayer: false,
    });
    setNameQueryByRow((prev) => {
      const next = { ...prev };
      delete next[row.rowId];
      return next;
    });
  }

  function markAsNewPlayer(row: SeasonBatchPlayerRow) {
    if (!onPatchCell) return;
    const name = (row.playerName || row.ocrName || "").trim();
    if (!name) return;
    onPatchCell(row.rowId, {
      playerId: undefined,
      playerName: name,
      ocrName: row.ocrName || name,
      pendingNewPlayer: true,
      nameStatus: "ok",
      nameCandidates: undefined,
    });
  }

  function cancelNewPlayer(row: SeasonBatchPlayerRow) {
    if (!onPatchCell) return;
    onPatchCell(row.rowId, {
      pendingNewPlayer: false,
      playerId: undefined,
      nameStatus: "needs_confirm",
    });
  }

  function roleLabel(r: SeasonBatchRole): string {
    if (r === "pitcher") return "投手";
    if (r === "catcher") return "捕手";
    return "野手";
  }

  function cellStyle(col: BatchColumnDef): CSSProperties {
    const style: CSSProperties = {
      minWidth: col.minWidth,
      width: col.minWidth,
      maxWidth: col.key === "playerName" ? 200 : col.minWidth + 24,
    };
    if (col.sticky) {
      const left = stickyLeftFor(columns, col.key);
      if (left != null) style.left = left;
    }
    return style;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <table className="border-separate border-spacing-0 text-left text-[12px]">
        <thead>
          <tr className="text-[11px] tracking-[0.06em] text-white/55">
            <th
              className="sticky left-0 z-30 border-b border-white/10 bg-[#0c0c0c] px-2 py-2"
              style={{ minWidth: RANK_COL_W, width: RANK_COL_W }}
            >
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                style={cellStyle(col)}
                className={cn(
                  "border-b border-r border-white/10 bg-[#0c0c0c] px-2 py-2 whitespace-nowrap",
                  col.sticky && "sticky z-20",
                )}
              >
                {col.label}
              </th>
            ))}
            <th
              className="border-b border-white/10 bg-[#0c0c0c] px-2 py-2"
              style={{ minWidth: 110 }}
            >
              状態
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((raw) => {
            const row = finalizeBatchRow(raw, role);
            const nameWarn = rowNameNeedsAttention(row);
            const statWarn = rowHasStatWarnings(row);
            const statLabels = listStatWarningLabels(row, role);
            const summary = summarizeRowWarnings(row, statLabels);
            const showCandidates =
              !row.playerId &&
              !row.pendingNewPlayer &&
              (row.nameCandidates?.length ?? 0) > 0;
            const showMasterSearch = !row.playerId && !row.pendingNewPlayer;
            const showPendingNew = Boolean(row.pendingNewPlayer && !row.playerId);
            const nameQuery =
              nameQueryByRow[row.rowId] ??
              row.ocrName ??
              row.playerName;

            return (
              <tr
                key={row.rowId}
                onClick={() => onSelectRow(row.rowId)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-white/[0.04]",
                  (nameWarn || statWarn) && "bg-amber-500/5",
                  showPendingNew && "bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.06))]",
                )}
              >
                <td
                  className="sticky left-0 z-20 border-b border-white/5 bg-[#0a0a0a] px-2 py-2 text-white/40"
                  style={{ minWidth: RANK_COL_W, width: RANK_COL_W }}
                >
                  {row.displayRank ?? row.rowIndex + 1}
                </td>
                {columns.map((col) => {
                  const isEditing =
                    editing?.rowId === row.rowId && editing.key === col.key;

                  if (col.key === "playerName" || col.key === "teamShort") {
                    const status =
                      col.key === "playerName" ? row.nameStatus : row.teamStatus;
                    const text =
                      col.key === "playerName" ? row.playerName : row.teamShort;
                    return (
                      <td
                        key={col.key}
                        style={cellStyle(col)}
                        onClick={(e) => startEdit(row, col.key, e)}
                        className={cn(
                          "border-b border-r border-white/5 bg-[#0a0a0a] px-2 py-2 align-top",
                          col.sticky && "sticky z-10",
                          col.key === "playerName" && "font-medium text-white",
                          col.key === "teamShort" && "text-white/80",
                          col.key === "playerName" &&
                            nameWarn &&
                            "bg-rose-500/15 text-rose-50",
                          col.key === "playerName" &&
                            showPendingNew &&
                            "bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.12))] text-[color:var(--museum-accent,#d4af37)]",
                          col.key === "teamShort" &&
                            cellNeedsAttention(status) &&
                            "bg-amber-500/15 text-amber-100",
                        )}
                      >
                        {col.key === "playerName" && showPendingNew ? (
                          <div
                            className="space-y-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-[10px] font-normal text-[color:var(--museum-accent,#d4af37)]">
                              新規登録予定
                            </p>
                            <input
                              value={row.playerName}
                              onChange={(e) =>
                                onPatchCell?.(row.rowId, {
                                  playerName: e.target.value,
                                  pendingNewPlayer: true,
                                  nameStatus: "ok",
                                })
                              }
                              className="w-full rounded border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/80 px-1 py-0.5 text-[12px] text-white"
                            />
                            <p className="text-[10px] font-normal text-white/55">
                              {row.playerName || "—"} / {row.teamShort || "球団未設定"} /{" "}
                              {roleLabel(role)}
                            </p>
                            <button
                              type="button"
                              onClick={() => cancelNewPlayer(row)}
                              className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/60 hover:border-white/40"
                            >
                              取消（未照合に戻す）
                            </button>
                          </div>
                        ) : col.key === "playerName" && showMasterSearch ? (
                          <div
                            className="space-y-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-[10px] font-normal text-rose-200/90">
                              選手マスター未照合
                            </p>
                            <PlayerNameAutocomplete
                              mode="freeText"
                              compact
                              hideLabel
                              year={year}
                              value={nameQuery}
                              onQueryChange={(q) =>
                                setNameQueryByRow((prev) => ({
                                  ...prev,
                                  [row.rowId]: q,
                                }))
                              }
                              onSelect={(hit) =>
                                applyMasterHit(
                                  row,
                                  hit.player.playerId,
                                  hit.player.fullName,
                                  hit.teamShort,
                                )
                              }
                              placeholder="既存選手を検索・選択"
                            />
                            {showCandidates ? (
                              <select
                                value=""
                                onChange={(e) => {
                                  const id = e.target.value;
                                  if (!id) return;
                                  const c = row.nameCandidates?.find(
                                    (x) => x.playerId === id,
                                  );
                                  if (c) applyCandidate(row, c);
                                }}
                                className="mt-0.5 w-full max-w-full rounded border border-rose-400/50 bg-black/90 px-1 py-0.5 text-[10px] text-rose-50"
                              >
                                <option value="">既存選手を選択…</option>
                                {row.nameCandidates!.map((c) => (
                                  <option key={c.playerId} value={c.playerId}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => markAsNewPlayer(row)}
                              className="mt-0.5 w-full rounded border border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.14))] px-1.5 py-1 text-[10px] text-[color:var(--museum-accent,#d4af37)] hover:bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.22))]"
                            >
                              ＋ 新規選手として登録
                            </button>
                          </div>
                        ) : isEditing ? (
                          <input
                            autoFocus
                            value={draft}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => commitEdit(row)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit(row);
                              if (e.key === "Escape") setEditing(null);
                            }}
                            className="w-full min-w-0 rounded border border-amber-400/40 bg-black/80 px-1 py-0.5 text-white"
                          />
                        ) : (
                          <div className="space-y-1 overflow-hidden">
                            <div className="truncate" title={text || undefined}>
                              {text || "—"}
                            </div>
                            {col.key === "playerName" &&
                            row.ocrName &&
                            row.ocrName !== row.playerName ? (
                              <div className="truncate text-[10px] font-normal text-white/35">
                                入力: {row.ocrName}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </td>
                    );
                  }

                  const cell = row.fields[col.key];
                  const attention = cell
                    ? cellNeedsAttention(cell.status)
                    : false;
                  return (
                    <td
                      key={col.key}
                      style={cellStyle(col)}
                      title={cell?.note}
                      onClick={(e) => startEdit(row, col.key, e)}
                      className={cn(
                        "border-b border-r border-white/5 px-2 py-2 tabular-nums text-white/85 whitespace-nowrap overflow-hidden text-ellipsis",
                        attention && "bg-amber-400/20 text-amber-50",
                        cell?.status === "conflict" &&
                          "bg-amber-500/35 ring-1 ring-inset ring-amber-400/40",
                      )}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={draft}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commitEdit(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(row);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="w-full min-w-0 rounded border border-amber-400/40 bg-black/80 px-1 py-0.5 text-white"
                        />
                      ) : cell?.value != null ||
                        (cell?.display != null && cell.display !== "") ? (
                        cell.value === 0
                          ? cell.display || "0"
                          : String(
                              cell.display !== "" && cell.display != null
                                ? cell.display
                                : cell.value,
                            )
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-white/5 px-2 py-2 align-top">
                  {summary.reasons.length === 0 ? (
                    <span className="text-[10px] text-white/35">OK</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {summary.nameUnresolved ? (
                        <span className="rounded bg-rose-500/25 px-1.5 py-0.5 text-[10px] text-rose-100">
                          未照合
                        </span>
                      ) : null}
                      {summary.pendingNewPlayer ? (
                        <span className="rounded bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.22))] px-1.5 py-0.5 text-[10px] text-[color:var(--museum-accent,#d4af37)]">
                          新規予定
                        </span>
                      ) : null}
                      {summary.statLabels.length > 0 ? (
                        <span
                          className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] text-amber-100"
                          title={summary.statLabels.join("・")}
                        >
                          数値要確認
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12px] text-white/45">
          画像または相棒データを取り込むと、ここに確認表が表示されます。横スクロールで全項目を確認できます。
        </p>
      ) : null}
    </div>
  );
}

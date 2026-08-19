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
  enrichRowDerivedDisplays,
  type BatchColumnDef,
} from "@/lib/import/seasonBatchConvert";
import { cellNeedsAttention, rowHasWarnings } from "@/lib/import/seasonBatchMerge";
import { parseStatToken } from "@/lib/import/parseSeasonRankingOcr";
import { cn } from "@/lib/cn";

type SeasonBatchTableProps = {
  role: SeasonBatchRole;
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
      const parsed = parseStatToken(draft, key);
      onPatchCell(row.rowId, {
        fields: {
          ...row.fields,
          [key]: {
            value: parsed.value,
            display: parsed.display || draft,
            status: parsed.status === "empty" ? "empty" : "ok",
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
    onPatchCell(row.rowId, {
      playerId: c.playerId,
      playerName: labelName,
      teamShort: c.teamShort || row.teamShort,
      nameStatus: "ok",
      teamStatus: c.teamShort ? "ok" : row.teamStatus,
    });
  }

  function cellStyle(col: BatchColumnDef): CSSProperties {
    const style: CSSProperties = {
      minWidth: col.minWidth,
      width: col.minWidth,
      maxWidth: col.key === "playerName" ? 160 : col.minWidth + 24,
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
              style={{ minWidth: 64 }}
            >
              状態
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((raw) => {
            const row = enrichRowDerivedDisplays(raw, role);
            const warn = rowHasWarnings(row);
            const showCandidates =
              row.nameStatus === "needs_confirm" &&
              (row.nameCandidates?.length ?? 0) > 0;
            return (
              <tr
                key={row.rowId}
                onClick={() => onSelectRow(row.rowId)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-white/[0.04]",
                  warn && "bg-amber-500/5",
                )}
              >
                <td
                  className="sticky left-0 z-20 border-b border-white/5 bg-[#0a0a0a] px-2 py-2 text-white/40"
                  style={{ minWidth: RANK_COL_W, width: RANK_COL_W }}
                >
                  {row.rowIndex + 1}
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
                          cellNeedsAttention(status) &&
                            "bg-amber-500/15 text-amber-100",
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
                        ) : (
                          <div className="space-y-1 overflow-hidden">
                            <div className="truncate" title={text || undefined}>
                              {text || "—"}
                            </div>
                            {col.key === "playerName" &&
                            row.ocrName &&
                            row.ocrName !== row.playerName ? (
                              <div className="truncate text-[10px] font-normal text-white/35">
                                OCR: {row.ocrName}
                              </div>
                            ) : null}
                            {col.key === "playerName" && showCandidates ? (
                              <select
                                value={row.playerId ?? ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const id = e.target.value;
                                  if (!id) return;
                                  const c = row.nameCandidates?.find(
                                    (x) => x.playerId === id,
                                  );
                                  if (c) applyCandidate(row, c);
                                }}
                                className="mt-0.5 w-full max-w-full rounded border border-amber-400/50 bg-black/90 px-1 py-0.5 text-[10px] text-amber-50"
                              >
                                <option value="">候補を選択…</option>
                                {row.nameCandidates!.map((c) => (
                                  <option key={c.playerId} value={c.playerId}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
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
                  {warn ? (
                    <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] text-amber-100">
                      要確認
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/35">OK</span>
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

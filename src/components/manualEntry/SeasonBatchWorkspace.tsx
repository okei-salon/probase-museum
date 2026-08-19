"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageDropzone } from "@/components/import/ImageDropzone";
import { SeasonBatchTable } from "@/components/manualEntry/SeasonBatchTable";
import { SeasonPlayerDetailEditor } from "@/components/manualEntry/SeasonPlayerDetailEditor";
import {
  getImportDemoMode,
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
  subscribeImportDemoMode,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  getDemoSeasonLine,
  upsertDemoSeasonLine,
} from "@/data/import/demoStore";
import { appendImportHistory } from "@/data/import/store";
import type {
  SeasonBatchPartialRow,
  SeasonBatchPlayerRow,
  SeasonBatchRole,
  SeasonBatchSession,
} from "@/data/import/seasonBatchTypes";
import {
  getSeasonLine,
  seasonLineKey,
  upsertBatterSeasonLine,
  upsertPitcherSeasonLine,
  type SeasonLineScope,
} from "@/data/playerSeasonLines";
import {
  DEMO_SEASON_YEAR,
  FORMAL_SEASON_START_YEAR,
  formatSeasonLineLabel,
  listEntrySeasonIdentities,
  makeSeasonKey,
  parseSeasonKey,
  type SeasonWorld,
} from "@/data/seasons";
import type { TeamId } from "@/data/teams";
import {
  enrichRowDerivedDisplays,
  rowToBatterCounting,
  rowToPitcherCounting,
  validateBatchRow,
} from "@/lib/import/seasonBatchConvert";
import {
  createEmptySession,
  mergePartialRowsIntoSession,
  rowHasWarnings,
  teamIdFromShort,
  teamNameFromShort,
} from "@/lib/import/seasonBatchMerge";
import { processSeasonRankingImage } from "@/lib/import/processSeasonRankingImage";
import {
  PARTNER_APPEND_EXAMPLE,
  PARTNER_PASTE_EXAMPLE,
  PARTNER_PITCHER_EXAMPLE,
  parsePartnerSeasonPaste,
} from "@/lib/import/parsePartnerSeasonPaste";
import { searchPlayerMasterCandidates } from "@/lib/manualEntry/searchPlayers";
import {
  computeBatterDerived,
  computePitcherDerived,
} from "@/lib/manualEntry/computeSeasonStats";
import { cn } from "@/lib/cn";

const ROLE_OPTIONS: Array<{ id: SeasonBatchRole; label: string }> = [
  { id: "batter", label: "野手・年度個人成績" },
  { id: "pitcher", label: "投手・年度個人成績" },
  { id: "catcher", label: "捕手・守備成績" },
];

type InputMode = "image" | "partner";

type SeasonBatchWorkspaceProps = {
  initialRole?: SeasonBatchRole;
  /** 交流戦などスコープ固定 */
  fixedScope?: SeasonLineScope;
  embed?: boolean;
  seasonKey?: string;
  onSeasonKeyChange?: (key: string) => void;
};

/** OCR／相棒から year だけ来たとき、現在の WORLD を保って seasonKey を更新 */
function seasonKeyFromYearHint(
  year: number,
  currentWorld: SeasonWorld | null,
): string {
  if (year >= FORMAL_SEASON_START_YEAR) {
    return makeSeasonKey(currentWorld ?? "BLUE", year);
  }
  return String(year);
}

export function SeasonBatchWorkspace({
  initialRole = "batter",
  fixedScope = "pennant",
  embed = false,
  seasonKey: seasonKeyProp,
  onSeasonKeyChange,
}: SeasonBatchWorkspaceProps) {
  const [demoMode, setDemoMode] = useState(false);
  const [role, setRole] = useState<SeasonBatchRole>(initialRole);
  const [seasonKeyInternal, setSeasonKeyInternal] = useState("BLUE_2026");
  const seasonKey = seasonKeyProp ?? seasonKeyInternal;
  const setSeasonKey = (key: string) => {
    if (seasonKeyProp == null) setSeasonKeyInternal(key);
    onSeasonKeyChange?.(key);
  };
  const scope = fixedScope;
  const [session, setSession] = useState<SeasonBatchSession>(() =>
    createEmptySession(initialRole, 2026),
  );
  const [progress, setProgress] = useState("");
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("image");
  const [partnerText, setPartnerText] = useState("");

  useEffect(() => {
    const sync = () => {
      setDemoMode(getImportDemoMode());
    };
    sync();
    return subscribeImportDemoMode(sync);
  }, []);

  const entrySeasons = useMemo(() => listEntrySeasonIdentities(), []);
  const identity = useMemo(
    () => parseSeasonKey(seasonKey) ?? entrySeasons[0]!,
    [seasonKey, entrySeasons],
  );
  const year = identity.year;
  const world = identity.world;

  useEffect(() => {
    setSession((s) => ({
      ...s,
      year,
      rows: s.rows.map((r) => ({ ...r, year })),
    }));
  }, [year]);

  const editingRow = useMemo(
    () => session.rows.find((r) => r.rowId === editRowId) ?? null,
    [session.rows, editRowId],
  );

  const warnCount = session.rows.filter(rowHasWarnings).length;

  function resetForRole(next: SeasonBatchRole) {
    setRole(next);
    setSession(createEmptySession(next, year));
    setEditRowId(null);
    setConfirmOpen(false);
    setMessage(null);
    setError(null);
    setOverlayUrl(null);
  }

  function applyPartialsToSession(
    base: SeasonBatchSession,
    sourceId: string,
    partials: SeasonBatchPartialRow[],
    y: number,
    matchBy: "rowIndex" | "player",
    meta?: { fileName: string; headers: string[]; confidence: number },
  ): SeasonBatchSession {
    let next = {
      ...mergePartialRowsIntoSession(base, sourceId, partials, y, { matchBy }),
      images: meta
        ? [
            ...base.images,
            {
              id: sourceId,
              fileName: meta.fileName,
              previewUrl: "",
              detectedHeaders: meta.headers,
              confidence: meta.confidence,
            },
          ]
        : base.images,
    };
    next.rows = next.rows.map((r) => enrichRowDerivedDisplays(r, next.role));
    return next;
  }

  function handlePartnerExpand() {
    setError(null);
    setMessage(null);
    try {
      const parsed = parsePartnerSeasonPaste(partnerText, year);
      if (parsed.role !== role) {
        setRole(parsed.role);
      }
      setSeasonKey(seasonKeyFromYearHint(parsed.year, world));

      const sourceId = `partner-${Date.now()}`;
      const base =
        parsed.mode === "append"
          ? { ...session, role: parsed.role, year: parsed.year }
          : createEmptySession(parsed.role, parsed.year);

      const next = applyPartialsToSession(
        base,
        sourceId,
        parsed.rows,
        parsed.year,
        parsed.mode === "append" ? "player" : "rowIndex",
        {
          fileName:
            parsed.mode === "append"
              ? "相棒データ（追加）"
              : "相棒データ貼り付け",
          headers: parsed.headers.map(String),
          confidence: 100,
        },
      );
      setSession(next);
      setOverlayUrl(null);
      setMessage(parsed.message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "相棒データの解析に失敗しました。フォーマットを確認してください",
      );
    }
  }

  async function handleFiles(files: File[]) {
    setError(null);
    setMessage(null);
    let next = { ...session, role, year };

    for (const file of files) {
      const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setProgress(`${file.name}: OCR中…`);
      try {
        const parsed = await processSeasonRankingImage(
          file,
          role,
          year,
          (pct) => setProgress(`${file.name}: ${pct}%`),
        );
        const y = parsed.yearHint ?? year;
        if (parsed.yearHint) {
          setSeasonKey(seasonKeyFromYearHint(parsed.yearHint, world));
        }

        next = {
          ...mergePartialRowsIntoSession(next, imageId, parsed.rows, y),
          images: [
            ...next.images,
            {
              id: imageId,
              fileName: file.name,
              previewUrl: URL.createObjectURL(file),
              detectedHeaders: parsed.headerLabels,
              confidence: parsed.confidence,
            },
          ],
        };
        next.rows = next.rows.map((r) => enrichRowDerivedDisplays(r, role));
        // OCR照合済みを優先。未確定のみ候補を補完（誤自動確定しない）
        // YEAR=2000 は選手マスター所属が無いため照合だけ現行年度へフォールバック
        const affiliationYear = y === DEMO_SEASON_YEAR ? 2026 : y;
        next.rows = next.rows.map((r) => {
          if (r.playerId && r.nameStatus === "ok") return r;
          if ((r.nameCandidates?.length ?? 0) > 0) {
            return {
              ...r,
              nameStatus: "needs_confirm" as const,
              teamStatus: r.teamShort ? r.teamStatus : ("needs_confirm" as const),
            };
          }
          const query = r.ocrName || r.playerName;
          const hits = searchPlayerMasterCandidates(
            query,
            affiliationYear,
            8,
          );
          const team = r.teamShort;
          const teamHits = team
            ? hits.filter((h) => h.teamShort === team)
            : [];
          const candidates = (teamHits.length ? teamHits : hits)
            .slice(0, 6)
            .map((h) => ({
              playerId: h.player.playerId,
              label: `${h.player.fullName}（${h.teamShort}）`,
              teamShort: h.teamShort !== "—" ? h.teamShort : "",
              score: 0.5,
            }));
          // 球団一致がちょうど1件だけ → 自動確定。それ以外は要確認
          if (teamHits.length === 1 && teamHits[0]) {
            const hit = teamHits[0];
            return {
              ...r,
              playerId: hit.player.playerId,
              playerName: hit.player.fullName,
              teamShort:
                hit.teamShort !== "—" ? hit.teamShort : r.teamShort,
              teamId:
                (hit.affiliation?.teamId as TeamId | undefined) ??
                teamIdFromShort(r.teamShort),
              teamName:
                hit.affiliation?.teamName ?? teamNameFromShort(r.teamShort),
              nameStatus: "ok" as const,
              teamStatus: "ok" as const,
              nameCandidates: candidates,
            };
          }
          return {
            ...r,
            nameStatus: "needs_confirm" as const,
            teamStatus: team ? r.teamStatus : ("needs_confirm" as const),
            nameCandidates:
              candidates.length > 0 ? candidates : r.nameCandidates,
          };
        });
        if (parsed.message) {
          setMessage(parsed.message);
        }
        if (parsed.overlayPreviewUrl) {
          // 最後の画像の解析オーバーレイを保持
          setOverlayUrl(parsed.overlayPreviewUrl);
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "画像の読み取りに失敗しました。手修正するか別画像を追加してください",
        );
      }
    }

    setSession(next);
    setProgress("");
        if (next.rows.length) {
      setMessage(
        `${files.length}枚を統合しました（${next.rows.length}人 / 最大10行固定）。黄色・空欄は要確認です。候補から選手を選べます。自動保存はしていません。`,
      );
    } else {
      setError(
        "選手行を抽出できませんでした。画像の向き・解像度を確認するか、手入力へ切り替えてください。",
      );
    }
  }

  function updateRow(updated: SeasonBatchPlayerRow) {
    setSession((s) => ({
      ...s,
      rows: s.rows.map((r) =>
        r.rowId === updated.rowId
          ? enrichRowDerivedDisplays(updated, role)
          : r,
      ),
    }));
    setEditRowId(null);
  }

  function prepareSave(): { ok: boolean; blockers: string[] } {
    const blockers: string[] = [];
    if (session.rows.length === 0) blockers.push("登録する選手がありません");
    for (const row of session.rows) {
      if (!row.playerId) {
        blockers.push(`${row.playerName || "（無名）"}: 選手マスターと照合してください`);
      }
      if (!row.teamId && !teamIdFromShort(row.teamShort)) {
        blockers.push(`${row.playerName}: 球団を確認してください`);
      }
      const v = validateBatchRow(row, role);
      if (v.errors.length) {
        blockers.push(`${row.playerName}: ${v.errors[0]}`);
      }
    }
    return { ok: blockers.length === 0, blockers };
  }

  function saveAll(forceOverwrite: boolean) {
    const { ok, blockers } = prepareSave();
    if (!ok) {
      setError(blockers.slice(0, 5).join(" / "));
      setConfirmOpen(false);
      return;
    }

    const useSandbox = shouldUseIsolatedDemoStore(year);
    const existingNames: string[] = [];
    for (const row of session.rows) {
      if (!row.playerId) continue;
      const lineRole = role === "pitcher" ? "pitcher" : "batter";
      const id = seasonLineKey(row.playerId, year, lineRole, scope, world);
      const existing = useSandbox
        ? getDemoSeasonLine(id)
        : getSeasonLine(row.playerId, year, lineRole, scope, world);
      if (existing) existingNames.push(row.playerName);
    }
    if (existingNames.length && !forceOverwrite) {
      setError(
        `既存データあり: ${existingNames.join("、")}。上書きする場合は「上書きして一括登録」を選んでください。`,
      );
      return;
    }

    const now = new Date().toISOString();
    const recordIds: string[] = [];

    for (const row of session.rows) {
      if (!row.playerId) continue;
      const teamId =
        row.teamId ?? (teamIdFromShort(row.teamShort) as TeamId | undefined);
      const teamName =
        row.teamName ?? teamNameFromShort(row.teamShort) ?? row.teamShort;
      if (!teamId) continue;

      const lineRole = role === "pitcher" ? "pitcher" : "batter";
      const id = seasonLineKey(row.playerId, year, lineRole, scope, world);
      const existing = useSandbox
        ? getDemoSeasonLine(id)
        : getSeasonLine(row.playerId, year, lineRole, scope, world);

      if (lineRole === "pitcher") {
        const counting = rowToPitcherCounting(row);
        if (!counting) continue;
        const derived = computePitcherDerived(counting);
        const line = {
          id,
          playerId: row.playerId,
          playerName: row.playerName,
          year,
          world,
          teamId,
          teamName,
          scope,
          role: "pitcher" as const,
          source: "ocr" as const,
          counting,
          derived,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        if (useSandbox) upsertDemoSeasonLine(line);
        else upsertPitcherSeasonLine(line);
      } else {
        const counting = rowToBatterCounting(row);
        const derived = computeBatterDerived(counting);
        const line = {
          id,
          playerId: row.playerId,
          playerName: row.playerName,
          year,
          world,
          teamId,
          teamName,
          scope,
          role: "batter" as const,
          source: "ocr" as const,
          counting,
          derived,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        if (useSandbox) upsertDemoSeasonLine(line);
        else upsertBatterSeasonLine(line);
      }
      recordIds.push(id);
    }

    const hist = {
      id: `hist-${Date.now()}`,
      at: now,
      year,
      fileName: session.images.map((i) => i.fileName).join(", ") || "season-batch",
      screenType:
        role === "pitcher"
          ? ("player_pitching" as const)
          : ("player_batting" as const),
      summary: `${formatSeasonLineLabel({ year, world })} ${scope === "interleague" ? "交流戦" : ""}${ROLE_OPTIONS.find((r) => r.id === role)?.label ?? ""} ${recordIds.length}人を一括登録`,
      recordIds,
    };
    if (useSandbox) appendDemoImportHistory(hist);
    else appendImportHistory(hist);

    if (!useSandbox) notifyImportStoreChanged();

    setConfirmOpen(false);
    setError(null);
    setMessage(
      useSandbox
        ? `${recordIds.length}人分を分離デモ領域に登録しました（SEASONSには反映されません）。`
        : year === DEMO_SEASON_YEAR
          ? `${recordIds.length}人分を正式ストアへ登録しました。SEASONS → ${DEMO_SEASON_YEAR} → 個人成績で確認できます。`
          : `${recordIds.length}人分を登録しました。同一選手・同一シーズン（WORLD×年度${scope === "interleague" ? "・交流戦" : ""}）は1件に統合済みです。`,
    );
    setSession(createEmptySession(role, year));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50 p-4 md:p-5">
        <h2 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
          {scope === "interleague"
            ? "交流戦個人成績（10人一括）"
            : "年度個人成績（10人一括）"}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55">
          {scope === "interleague"
            ? "通常の年度個人成績と同じ正式項目です。画像OCR／相棒貼り付け後、scope: interleague として保存します。"
            : "画像OCR、または相棒（ChatGPT等）で整理したテキストのどちらからでも、同じ10人一括確認表へ進めます。結果は自動保存せず、確認表で点検してから一括登録します。"}
          {year === DEMO_SEASON_YEAR ? (
            <span className="mt-1 block text-[color:var(--museum-accent,#d4af37)]">
              2000年連携テストモード — 登録データは本番と同じ正式ストアへ保存され、SEASONS / PLAYERS / SOP
              等へ反映されます。
            </span>
          ) : demoMode ? (
            <span className="mt-1 block text-amber-200/90">
              分離デモ領域（OCRサンドボックス）ON — この年度の登録はSEASONSに混ざりません。連携テストは年度2000を選んでください。
            </span>
          ) : null}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] tracking-[0.1em] text-white/55">
              成績の種類
            </span>
            <select
              value={role}
              onChange={(e) => resetForRole(e.target.value as SeasonBatchRole)}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
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
                setSession((s) => ({
                  ...s,
                  year: y,
                  rows: s.rows.map((r) => ({ ...r, year: y })),
                }));
              }}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
            >
              {entrySeasons.map((s) => (
                <option key={s.seasonKey} value={s.seasonKey}>
                  {s.kind === "demo"
                    ? `${s.year} DEMO SEASON（正式ストア）`
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
          <span className="mb-2 block text-[11px] tracking-[0.1em] text-white/55">
            取込方法
          </span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "image" as const, label: "画像から読み込み" },
                { id: "partner" as const, label: "相棒データ貼り付け" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setInputMode(opt.id);
                  setError(null);
                  setMessage(null);
                }}
                className={cn(
                  "rounded-md border px-3 py-2 text-[12px]",
                  inputMode === opt.id
                    ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
                    : "border-white/15 text-white/70 hover:border-white/30",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {inputMode === "image" ? (
        <>
          <ImageDropzone
            onFiles={handleFiles}
            disabled={!!progress}
            maxFiles={12}
            hint="同じ10人を横スクロール撮影した複数枚を追加できます。表構造を検出してセル単位でOCRします。"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!progress}
              onClick={async () => {
                setProgress("テスト画像を読み込み中…");
                try {
                  const res = await fetch(
                    "/import-samples/season-batting-ranking-avg.png",
                  );
                  const blob = await res.blob();
                  const file = new File(
                    [blob],
                    "season-batting-ranking-avg.png",
                    { type: blob.type || "image/png" },
                  );
                  await handleFiles([file]);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "テスト画像の読み込みに失敗しました",
                  );
                  setProgress("");
                }
              }}
              className="rounded-md border border-white/15 px-3 py-1.5 text-[12px] text-white/75 hover:border-white/30"
            >
              打撃ランキング検証画像でテスト（10人）
            </button>
          </div>

          {overlayUrl ? (
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="mb-2 text-[11px] text-white/45">
                表検出オーバーレイ（行×列セル）
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={overlayUrl}
                alt="OCR表検出"
                className="max-h-64 w-full object-contain"
              />
            </div>
          ) : null}
        </>
      ) : (
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
          <div>
            <h3 className="text-[12px] tracking-[0.12em] text-white/70">
              相棒データ貼り付け
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">
              ChatGPT等で整理したテキストを貼り付け、「データを展開」で確認表へ変換します（OCR不使用・自動保存なし）。
              追加項目は TYPE=BATTER_SEASON_APPEND で、年度・選手名・球団を基準に既存行へマージします。
            </p>
          </div>
          <textarea
            value={partnerText}
            onChange={(e) => setPartnerText(e.target.value)}
            spellCheck={false}
            rows={14}
            placeholder={PARTNER_PASTE_EXAMPLE}
            className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-3 font-mono text-[12px] leading-relaxed text-white/90 placeholder:text-white/25"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePartnerExpand}
              disabled={!partnerText.trim()}
              className={cn(
                "rounded-md border px-3 py-2 text-[12px]",
                partnerText.trim()
                  ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
                  : "cursor-not-allowed border-white/10 text-white/30",
              )}
            >
              データを展開
            </button>
            <button
              type="button"
              onClick={() =>
                setPartnerText(
                  role === "pitcher"
                    ? PARTNER_PITCHER_EXAMPLE
                    : PARTNER_PASTE_EXAMPLE,
                )
              }
              className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/65 hover:border-white/30"
            >
              {role === "pitcher" ? "投手フォーマット例" : "基本フォーマット例"}
            </button>
            <button
              type="button"
              onClick={() => setPartnerText(PARTNER_APPEND_EXAMPLE)}
              className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/65 hover:border-white/30"
            >
              追加フォーマット例
            </button>
            <button
              type="button"
              onClick={() => setPartnerText("")}
              className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/55 hover:border-white/30"
            >
              クリア
            </button>
          </div>
        </section>
      )}

      {progress ? (
        <p className="text-[12px] text-[color:var(--museum-accent,#d4af37)]">
          {progress}
        </p>
      ) : null}

      {session.images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {session.images.map((img) => (
            <div
              key={img.id}
              className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white/65"
            >
              {img.fileName}
              {img.detectedHeaders.length ? (
                <span className="ml-1 text-white/40">
                  （{img.detectedHeaders.slice(0, 4).join("・")}
                  {img.detectedHeaders.length > 4 ? "…" : ""}）
                </span>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setSession(createEmptySession(role, year));
              setMessage(null);
              setError(null);
            }}
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/55 hover:border-white/30"
          >
            クリア
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white/70">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-[12px] tracking-[0.12em] text-white/70">
              10人一括確認表
            </h3>
            <p className="mt-0.5 text-[11px] text-white/45">
              画像OCR・相棒データのどちらからでも、ここで確認・修正してから一括登録します。
              選手名が「要確認」のときは候補から選択できます。
              {warnCount > 0 ? (
                <span className="ml-1 text-amber-200">
                  要確認 {warnCount}人
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            disabled={session.rows.length === 0}
            onClick={() => {
              setError(null);
              setConfirmOpen(true);
            }}
            className={cn(
              "rounded-md border px-3 py-2 text-[12px]",
              session.rows.length === 0
                ? "cursor-not-allowed border-white/10 text-white/30"
                : "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]",
            )}
          >
            {session.rows.length}人を一括登録…
          </button>
        </div>

        <SeasonBatchTable
          role={role}
          rows={session.rows}
          onSelectRow={setEditRowId}
          onPatchCell={(rowId, patch) => {
            setSession((s) => ({
              ...s,
              rows: s.rows.map((r) => {
                if (r.rowId !== rowId) return r;
                const next = { ...r, ...patch };
                if (patch.playerName != null && patch.playerId == null) {
                  next.nameStatus =
                    patch.playerName.trim().length >= 2
                      ? "needs_confirm"
                      : "needs_confirm";
                }
                if (patch.teamShort != null) {
                  const id = teamIdFromShort(patch.teamShort);
                  next.teamId = id;
                  next.teamName = teamNameFromShort(patch.teamShort);
                  next.teamStatus = id ? "ok" : "needs_confirm";
                }
                return enrichRowDerivedDisplays(next, role);
              }),
            }));
          }}
        />
      </section>

      {editingRow ? (
        <SeasonPlayerDetailEditor
          role={role}
          year={year}
          row={editingRow}
          onSave={updateRow}
          onClose={() => setEditRowId(null)}
        />
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[#0c0c0c] p-5">
            <h3 className="text-[13px] tracking-[0.1em] text-[color:var(--museum-accent,#d4af37)]">
              一括登録の確認
            </h3>
            <p className="mt-2 text-[12px] leading-relaxed text-white/60">
              確認表の内容をそのまま自動保存しません。以下 {session.rows.length}{" "}
              人を {year} 年の年度成績として登録します。同じ選手・同じ年度は1件に統合（上書き）されます。
            </p>
            {warnCount > 0 ? (
              <p className="mt-2 text-[12px] text-amber-200">
                要確認マークが {warnCount} 人分あります。問題なければ登録を続行できます。
              </p>
            ) : null}
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-[12px] text-white/75">
              {session.rows.map((r) => (
                <li key={r.rowId}>
                  {r.playerName}（{r.teamShort || "球団未設定"}）
                  {rowHasWarnings(r) ? (
                    <span className="ml-1 text-amber-200">要確認</span>
                  ) : null}
                  {!r.playerId ? (
                    <span className="ml-1 text-rose-300">未照合</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => saveAll(true)}
                className="rounded-md border border-white/20 px-3 py-2 text-[12px] text-white/80"
              >
                上書きして一括登録
              </button>
              <button
                type="button"
                onClick={() => saveAll(false)}
                className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/20 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
              >
                一括登録
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LeagueSide } from "@/data/awards";
import type { MonthlyMvpImportDraft } from "@/data/import/types";
import { monthlyMvpRecordKey } from "@/data/import/types";
import {
  appendImportHistory,
  getSavedMonthlyMvpRecord,
  upsertSavedMonthlyMvpRecord,
} from "@/data/import/store";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  listDemoMonthlyMvp,
  upsertDemoMonthlyMvp,
} from "@/data/import/demoStore";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import { UNKNOWN_PLAYER_STATUS } from "@/data/playerMaster/types";
import { resolveImportPlayer } from "@/lib/import/resolveImportPlayer";
import {
  normalizeImportMonth,
  normalizeImportYear,
  normalizeMonthlyMvpDraft,
} from "@/lib/import/parseMonthlyMvp";
import {
  formatSeasonLineLabel,
  FORMAL_SEASON_START_YEAR,
  listEntrySeasonIdentities,
  makeSeasonKey,
  normalizeSeasonWorld,
  parseSeasonKey,
  type SeasonWorld,
} from "@/data/seasons";
import { PlayerIdentityConfirm } from "@/components/playerMaster/PlayerIdentityConfirm";
import { cn } from "@/lib/cn";
import type { FieldCoverage } from "@/lib/import/pipelineDebug";

const MONTH_OPTIONS = [4, 5, 6, 7, 8, 9] as const;

function seasonKeyFromYearHint(
  year: number,
  currentWorld: SeasonWorld | null,
): string {
  if (year >= FORMAL_SEASON_START_YEAR) {
    return makeSeasonKey(currentWorld ?? "BLUE", year);
  }
  return String(year);
}

type MonthlyMvpReviewProps = {
  draft: MonthlyMvpImportDraft;
  fileName: string;
  jobId: string;
  fieldsGot?: FieldCoverage[];
  fieldsMissing?: FieldCoverage[];
  onChange: (next: MonthlyMvpImportDraft) => void;
  onSaved: (href: string) => void;
  onCancel: () => void;
};

export function MonthlyMvpReview({
  draft,
  fileName,
  jobId,
  fieldsGot,
  fieldsMissing,
  onChange,
  onSaved,
  onCancel,
}: MonthlyMvpReviewProps) {
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [playerConfirm, setPlayerConfirm] = useState<"pitcher" | "batter" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const entrySeasons = useMemo(() => listEntrySeasonIdentities(), []);
  const yearValue = normalizeImportYear(draft.year);
  const monthValue = normalizeImportMonth(draft.month);
  const world = normalizeSeasonWorld(draft.world);
  const seasonKey = useMemo(() => {
    if (world) return makeSeasonKey(world, yearValue);
    return String(yearValue);
  }, [world, yearValue]);

  // OCR結果と <select> 内部値がズレている場合はフォーム state を矯正
  useEffect(() => {
    if (draft.year !== yearValue || draft.month !== monthValue) {
      onChange({ ...draft, year: yearValue, month: monthValue });
    }
    // draft 全体は依存に入れず、年・月の不一致時のみ同期
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.year, draft.month, yearValue, monthValue]);

  // 正式年度で world 未設定なら BLUE を既定付与（既存レガシー年は付けない）
  useEffect(() => {
    if (
      yearValue >= FORMAL_SEASON_START_YEAR &&
      normalizeSeasonWorld(draft.world) == null
    ) {
      onChange({ ...draft, world: "BLUE" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearValue, draft.world]);

  const existing = useMemo(
    () =>
      getSavedMonthlyMvpRecord(yearValue, monthValue, draft.league, world),
    [yearValue, monthValue, draft.league, world],
  );

  function patchPitcher(partial: Partial<MonthlyMvpImportDraft["pitcher"]>) {
    const nextPitcher = { ...draft.pitcher, ...partial };
    if (
      partial.gameDisplayName != null ||
      partial.teamName != null
    ) {
      const resolved = resolveImportPlayer({
        gameDisplayName: nextPitcher.gameDisplayName,
        team: nextPitcher.teamName,
        year: draft.year,
        role: "pitcher",
        world,
      });
      nextPitcher.playerRef = resolved.playerRef;
      nextPitcher.resolvedName = resolved.displayName;
    }
    onChange({ ...draft, pitcher: nextPitcher });
  }

  function patchBatter(partial: Partial<MonthlyMvpImportDraft["batter"]>) {
    const nextBatter = { ...draft.batter, ...partial };
    if (partial.gameDisplayName != null || partial.teamName != null) {
      const resolved = resolveImportPlayer({
        gameDisplayName: nextBatter.gameDisplayName,
        team: nextBatter.teamName,
        year: draft.year,
        role: "batter",
        world,
      });
      nextBatter.playerRef = resolved.playerRef;
      nextBatter.resolvedName = resolved.displayName;
    }
    onChange({ ...draft, batter: nextBatter });
  }

  function validate(d: MonthlyMvpImportDraft): string | null {
    const year = normalizeImportYear(d.year);
    const month = normalizeImportMonth(d.month);
    if (!year || month < 4 || month > 9) {
      return "年度と月（4〜9月）を確認してください";
    }
    if (d.pitcher.era == null || d.pitcher.wins == null || d.pitcher.losses == null) {
      return "投手の防御率・勝・敗を入力してください";
    }
    if (
      d.batter.avg == null ||
      d.batter.hr == null ||
      d.batter.rbi == null ||
      d.batter.sb == null
    ) {
      return "野手の打率・本塁打・打点・盗塁を入力してください";
    }
    if (
      d.pitcher.playerRef.status === UNKNOWN_PLAYER_STATUS ||
      d.batter.playerRef.status === UNKNOWN_PLAYER_STATUS
    ) {
      return "未確定の選手があります。候補選択または新規登録で確定してください";
    }
    return null;
  }

  function save(force = false) {
    hydratePlayerMasterFromStorage();
    setError(null);
    const synced = normalizeMonthlyMvpDraft(draft);
    if (synced.year !== draft.year || synced.month !== draft.month) {
      onChange(synced);
    }
    const v = validate(synced);
    if (v) {
      setError(v);
      return;
    }
    const useSandbox = shouldUseIsolatedDemoStore(synced.year);
    const syncedWorld = normalizeSeasonWorld(synced.world);
    const existingNow = useSandbox
      ? listDemoMonthlyMvp().find(
          (r) =>
            r.year === synced.year &&
            r.month === synced.month &&
            r.league === synced.league &&
            normalizeSeasonWorld(r.world) === syncedWorld,
        )
      : getSavedMonthlyMvpRecord(
          synced.year,
          synced.month,
          synced.league,
          syncedWorld,
        );
    if (!force && existingNow) {
      setOverwriteOpen(true);
      return;
    }

    const pitcherId =
      synced.pitcher.playerRef.status === "resolved"
        ? synced.pitcher.playerRef.playerId
        : null;
    const batterId =
      synced.batter.playerRef.status === "resolved"
        ? synced.batter.playerRef.playerId
        : null;

    const payload = {
      id: monthlyMvpRecordKey(
        synced.year,
        synced.month,
        synced.league,
        syncedWorld,
      ),
      year: synced.year,
      world: syncedWorld,
      month: synced.month,
      league: synced.league,
      pitcher: {
        playerId: pitcherId,
        playerName: synced.pitcher.resolvedName || synced.pitcher.gameDisplayName,
        teamName: synced.pitcher.teamName,
        era: synced.pitcher.era!,
        wins: synced.pitcher.wins!,
        losses: synced.pitcher.losses!,
      },
      batter: {
        playerId: batterId,
        playerName: synced.batter.resolvedName || synced.batter.gameDisplayName,
        teamName: synced.batter.teamName,
        avg: synced.batter.avg!,
        hr: synced.batter.hr!,
        rbi: synced.batter.rbi!,
        sb: synced.batter.sb!,
      },
      sourceJobId: jobId,
      updatedAt: new Date().toISOString(),
    };

    const record = useSandbox
      ? upsertDemoMonthlyMvp(payload)
      : upsertSavedMonthlyMvpRecord(payload);

    const destKey =
      syncedWorld != null
        ? makeSeasonKey(syncedWorld, synced.year)
        : String(synced.year);

    const hist = {
      id: `hist-${Date.now()}`,
      at: new Date().toISOString(),
      year: synced.year,
      screenType: "monthly_mvp" as const,
      fileName,
      summary: `${formatSeasonLineLabel({ year: synced.year, world: syncedWorld })} ${synced.month}月 ${synced.league === "central" ? "セ" : "パ"} 月間MVP（投手:${record.pitcher.playerName} / 野手:${record.batter.playerName}）`,
      recordIds: [record.id],
    };
    if (useSandbox) appendDemoImportHistory(hist);
    else appendImportHistory(hist);

    if (!useSandbox) notifyImportStoreChanged();

    setOverwriteOpen(false);
    onSaved(
      useSandbox ? "/import/demo" : `/seasons/${destKey}/awards/monthly`,
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/55 p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
            読取結果確認
          </h2>
          <p className="mt-1 text-[13px] text-white/75">
            {fileName} · 信頼度 {draft.confidence}
          </p>
          {draft.confidence === "low" ? (
            <p className="mt-1 text-[12px] text-amber-200/85">
              自動読取が不完全な可能性があります。年・月・選手名・成績を確認・修正してから登録してください。
            </p>
          ) : null}
        </div>
        {existing ? (
          <p className="text-[12px] text-amber-200/90">
            既存データがあります（
            {formatSeasonLineLabel({ year: yearValue, world })} {monthValue}月 /{" "}
            {draft.league === "central" ? "セ・リーグ" : "パ・リーグ"}）
          </p>
        ) : null}
      </div>

      {(fieldsGot || fieldsMissing) && (
        <div className="grid gap-3 rounded-lg border border-white/10 bg-black/40 p-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] tracking-wide text-emerald-300/90">
              OCRで取得できた項目
            </p>
            <ul className="mt-1 space-y-0.5 text-[12px] text-white/75">
              {(fieldsGot ?? []).length ? (
                (fieldsGot ?? []).map((f) => (
                  <li key={f.key}>
                    {f.label}: {f.value}
                  </li>
                ))
              ) : (
                <li className="text-white/45">なし（手入力してください）</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-[11px] tracking-wide text-amber-200/90">
              取得できなかった項目
            </p>
            <ul className="mt-1 space-y-0.5 text-[12px] text-white/75">
              {(fieldsMissing ?? []).length ? (
                (fieldsMissing ?? []).map((f) => (
                  <li key={f.key}>{f.label}</li>
                ))
              ) : (
                <li className="text-white/45">なし</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="シーズン">
          <select
            className={inputClass}
            value={
              entrySeasons.some((s) => s.seasonKey === seasonKey)
                ? seasonKey
                : seasonKeyFromYearHint(yearValue, world)
            }
            onChange={(e) => {
              const next = parseSeasonKey(e.target.value);
              if (!next) return;
              onChange({
                ...draft,
                year: next.year,
                world: next.world,
              });
            }}
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
        </Field>
        <Field label="月">
          <select
            className={inputClass}
            value={String(monthValue)}
            onChange={(e) =>
              onChange({
                ...draft,
                month: normalizeImportMonth(e.target.value, monthValue),
              })
            }
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={String(m)}>
                {m}月
              </option>
            ))}
          </select>
        </Field>
        <Field label="リーグ">
          <select
            className={inputClass}
            value={draft.league}
            onChange={(e) =>
              onChange({
                ...draft,
                league: e.target.value as LeagueSide,
              })
            }
          >
            <option value="central">セ・リーグ</option>
            <option value="pacific">パ・リーグ</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
          <p className="text-[11px] tracking-[0.12em] text-white/55">投手部門</p>
          <Field label="ゲーム表示名" className="mt-2">
            <input
              className={inputClass}
              value={draft.pitcher.gameDisplayName}
              onChange={(e) => patchPitcher({ gameDisplayName: e.target.value })}
            />
          </Field>
          <Field label="球団" className="mt-2">
            <input
              className={inputClass}
              value={draft.pitcher.teamName}
              onChange={(e) => patchPitcher({ teamName: e.target.value })}
            />
          </Field>
          <p className="mt-2 text-[13px]">
            照合結果:{" "}
            <span className="font-medium text-[color:var(--museum-accent,#d4af37)]">
              {draft.pitcher.resolvedName || "未確定"}
            </span>
            {draft.pitcher.playerRef.status === UNKNOWN_PLAYER_STATUS ? (
              <button
                type="button"
                className="ml-2 text-[12px] underline text-white/70"
                onClick={() => setPlayerConfirm("pitcher")}
              >
                選手を確認
              </button>
            ) : null}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Field label="防御率">
              <input
                className={inputClass}
                value={draft.pitcher.era ?? ""}
                onChange={(e) =>
                  patchPitcher({
                    era: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="勝">
              <input
                className={inputClass}
                value={draft.pitcher.wins ?? ""}
                onChange={(e) =>
                  patchPitcher({
                    wins: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="敗">
              <input
                className={inputClass}
                value={draft.pitcher.losses ?? ""}
                onChange={(e) =>
                  patchPitcher({
                    losses:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
          <p className="text-[11px] tracking-[0.12em] text-white/55">野手部門</p>
          <Field label="ゲーム表示名" className="mt-2">
            <input
              className={inputClass}
              value={draft.batter.gameDisplayName}
              onChange={(e) => patchBatter({ gameDisplayName: e.target.value })}
            />
          </Field>
          <Field label="球団" className="mt-2">
            <input
              className={inputClass}
              value={draft.batter.teamName}
              onChange={(e) => patchBatter({ teamName: e.target.value })}
            />
          </Field>
          <p className="mt-2 text-[13px]">
            照合結果:{" "}
            <span className="font-medium text-[color:var(--museum-accent,#d4af37)]">
              {draft.batter.resolvedName || "未確定"}
            </span>
            {draft.batter.playerRef.status === UNKNOWN_PLAYER_STATUS ? (
              <button
                type="button"
                className="ml-2 text-[12px] underline text-white/70"
                onClick={() => setPlayerConfirm("batter")}
              >
                選手を確認
              </button>
            ) : null}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label="打率">
              <input
                className={inputClass}
                value={draft.batter.avg ?? ""}
                onChange={(e) =>
                  patchBatter({
                    avg: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="本塁打">
              <input
                className={inputClass}
                value={draft.batter.hr ?? ""}
                onChange={(e) =>
                  patchBatter({
                    hr: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="打点">
              <input
                className={inputClass}
                value={draft.batter.rbi ?? ""}
                onChange={(e) =>
                  patchBatter({
                    rbi: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="盗塁">
              <input
                className={inputClass}
                value={draft.batter.sb ?? ""}
                onChange={(e) =>
                  patchBatter({
                    sb: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white/60">
        <summary className="cursor-pointer text-white/75">OCR生テキスト</summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
          {draft.rawText || "（なし）"}
        </pre>
      </details>

      {error ? <p className="text-[12px] text-red-300">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => save(false)}
          className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3.5 py-1.5 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
        >
          この内容で登録
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-white/15 px-3.5 py-1.5 text-[12px] text-white/70"
        >
          キャンセル
        </button>
      </div>

      {overwriteOpen ? (
        <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 text-[13px]">
          <p className="text-amber-100">
            既存データがあります。上書きしますか？
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-md border border-amber-200/50 px-3 py-1 text-[12px] text-amber-50"
              onClick={() => save(true)}
            >
              上書き
            </button>
            <button
              type="button"
              className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/70"
              onClick={() => setOverwriteOpen(false)}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}

      {playerConfirm ? (
        <PlayerIdentityConfirm
          observation={{
            gameDisplayName:
              playerConfirm === "pitcher"
                ? draft.pitcher.gameDisplayName
                : draft.batter.gameDisplayName,
            team:
              playerConfirm === "pitcher"
                ? draft.pitcher.teamName
                : draft.batter.teamName,
            year: draft.year,
            world,
            position: playerConfirm === "pitcher" ? "投手" : "内野手",
          }}
          onCancel={() => setPlayerConfirm(null)}
          onResolved={(player) => {
            if (playerConfirm === "pitcher") {
              onChange({
                ...draft,
                pitcher: {
                  ...draft.pitcher,
                  playerRef: { status: "resolved", playerId: player.playerId },
                  resolvedName: player.fullName,
                },
              });
            } else {
              onChange({
                ...draft,
                batter: {
                  ...draft.batter,
                  playerRef: { status: "resolved", playerId: player.playerId },
                  resolvedName: player.fullName,
                },
              });
            }
            setPlayerConfirm(null);
          }}
        />
      ) : null}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[11px] text-white/55">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-white/15 bg-black/50 px-2.5 py-1.5 text-[13px] text-white outline-none focus:border-[color:var(--museum-accent,#d4af37)]";

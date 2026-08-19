"use client";

import { useEffect, useState } from "react";
import { AwardsImportWorkspace } from "@/components/import/AwardsImportWorkspace";
import { DemoModeToggle } from "@/components/import/DemoModeToggle";
import { ImportCategoryTabs } from "@/components/import/ImportCategoryTabs";
import { InterleagueImportWorkspace } from "@/components/import/InterleagueImportWorkspace";
import { MonthlyMvpImportPanel } from "@/components/import/MonthlyMvpImportPanel";
import { SeasonImportWorkspace } from "@/components/import/SeasonImportWorkspace";
import { SpecialRecordsImportWorkspace } from "@/components/import/SpecialRecordsImportWorkspace";
import { ManualEntryWorkspace } from "@/components/manualEntry";
import { SeasonBatchWorkspace } from "@/components/manualEntry/SeasonBatchWorkspace";
import type { ImportCategoryId } from "@/data/import/categories";
import { listImportHistory } from "@/data/import/store";
import type { ImportHistoryEntry } from "@/data/import/types";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import { cn } from "@/lib/cn";

/**
 * データ取込の統一入口。
 * 分類タブ → 画像OCR / 相棒データ貼り付け / 手入力 → 確認 → 登録。
 */
export function ImportWorkspace() {
  const [category, setCategory] =
    useState<ImportCategoryId>("player_season");
  const [playerMode, setPlayerMode] = useState<"batch" | "hand">("batch");
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);

  useEffect(() => {
    hydratePlayerMasterFromStorage();
    setHistory(listImportHistory());
  }, [category]);

  return (
    <div className="space-y-5">
      <DemoModeToggle />
      <ImportCategoryTabs value={category} onChange={setCategory} />

      {category === "player_season" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "batch" as const, label: "一括取込（画像／相棒）" },
                { id: "hand" as const, label: "手入力（1選手）" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPlayerMode(opt.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[12px]",
                  playerMode === opt.id
                    ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
                    : "border-white/15 text-white/70 hover:border-white/30",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {playerMode === "batch" ? <SeasonBatchWorkspace /> : null}
          {playerMode === "hand" ? <ManualEntryWorkspace /> : null}
        </div>
      ) : null}

      {category === "monthly_mvp" ? <MonthlyMvpImportPanel /> : null}
      {category === "season" ? <SeasonImportWorkspace /> : null}
      {category === "interleague" ? <InterleagueImportWorkspace /> : null}
      {category === "awards" ? <AwardsImportWorkspace /> : null}
      {category === "special" ? <SpecialRecordsImportWorkspace /> : null}

      {history.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-black/40 p-4">
          <h2 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
            取込履歴
          </h2>
          <ul className="mt-3 space-y-2 text-[12px] text-white/75">
            {history.slice(0, 12).map((h) => (
              <li
                key={h.id}
                className="border-b border-white/8 pb-2 last:border-0"
              >
                <p>{h.summary}</p>
                <p className="text-white/45">
                  {new Date(h.at).toLocaleString("ja-JP")} · {h.fileName}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

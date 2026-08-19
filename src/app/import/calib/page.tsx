"use client";

import { useEffect, useState } from "react";
import { processMonthlyMvpByTemplate } from "@/lib/import/processMonthlyMvpTemplate";

type Row = {
  id: string;
  raw: string;
  corrected: string | number | null;
  final: string | number | null;
  conf: number;
  prep?: string;
  candidates: Array<{ label: string; score: number }>;
};

/**
 * 基準画像 IMG_8861 の自動検証ページ（開発用）。
 * ハードコード判定はせず、本番と同じ processMonthlyMvpByTemplate を通す。
 */
export default function ImportCalibPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        const res = await fetch("/fixtures/IMG_8861.jpeg");
        if (!res.ok) throw new Error("fixture missing");
        const blob = await res.blob();
        const file = new File([blob], "IMG_8861.jpeg", { type: "image/jpeg" });
        setStatus("processing");
        const result = await processMonthlyMvpByTemplate(file, (p) => {
          if (!cancelled) setStatus(`processing ${p}%`);
        });
        if (cancelled) return;
        const next: Row[] = result.fieldDebug.map((f) => ({
          id: f.fieldId,
          raw: f.rawText,
          corrected: f.correctedValue,
          final: f.finalValue ?? f.correctedValue,
          conf: f.confidence,
          prep: f.preprocess,
          candidates: f.candidates,
        }));
        setRows(next);
        setDraft({
          year: result.draft.year,
          month: result.draft.month,
          pitcher: result.draft.pitcher,
          batter: result.draft.batter,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__CALIB__ = {
          rows: next,
          draft: result.draft,
          expected: {
            year: 2026,
            month: 4,
            pitcher_name: "村上",
            pitcher_team: "阪神",
            pitcher_era: 1.22,
            pitcher_wins: 5,
            pitcher_losses: 0,
            batter_name: "佐藤 輝",
            batter_team: "阪神",
            batter_avg: 0.51,
            batter_hr: 12,
            batter_rbi: 41,
            batter_sb: 4,
          },
        };
        setStatus("done");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="text-xl font-semibold">Import calib — IMG_8861</h1>
      <p className="mt-1 text-sm text-slate-400">status: {status}</p>
      {error ? <p className="mt-2 text-red-400">{error}</p> : null}
      <pre className="mt-4 overflow-auto rounded bg-slate-900 p-3 text-xs">
        {JSON.stringify({ draft, rows }, null, 2)}
      </pre>
    </main>
  );
}

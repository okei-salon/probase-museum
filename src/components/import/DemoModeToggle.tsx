"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  clearFormalDemoSeasonData,
  countFormalDemoSeasonData,
} from "@/data/import/clearDemoSeasonYear";
import {
  DEMO_IMPORT_YEAR,
  DEMO_SEASON_YEAR,
  getImportDemoMode,
  setImportDemoMode,
  subscribeImportDemoMode,
} from "@/data/import/demoMode";
import { clearAllDemoImportData, countDemoRecords } from "@/data/import/demoStore";
import { cn } from "@/lib/cn";

export function DemoModeToggle() {
  const [on, setOn] = useState(false);
  const [sandboxCount, setSandboxCount] = useState(0);
  const [formalCount, setFormalCount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setOn(getImportDemoMode());
      setSandboxCount(countDemoRecords());
      setFormalCount(countFormalDemoSeasonData(DEMO_SEASON_YEAR));
    };
    sync();
    return subscribeImportDemoMode(sync);
  }, []);

  function handleClearFormal() {
    const result = clearFormalDemoSeasonData(DEMO_SEASON_YEAR);
    setConfirmOpen(false);
    setFormalCount(countFormalDemoSeasonData(DEMO_SEASON_YEAR));
    setMessage(
      result.total === 0
        ? `${DEMO_SEASON_YEAR}年の正式デモデータはありませんでした。`
        : `${DEMO_SEASON_YEAR}年デモデータを ${result.total} 件削除しました（2018〜2026年には影響しません）。`,
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-xl border px-4 py-3",
          "border-white/12 bg-black/40",
        )}
      >
        <p className="text-[13px] font-medium text-white">
          {DEMO_SEASON_YEAR}年 DEMO SEASON（連携テスト）
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/55">
          2000年連携テストモード。相棒データや一括登録で{" "}
          <code className="text-[color:var(--museum-accent,#d4af37)]">
            YEAR={DEMO_SEASON_YEAR}
          </code>{" "}
          を選ぶと、分離デモ領域ではなく本番と同じ正式ストアへ保存されます（サンドボックス
          ON でも YEAR=2000 は正式ストア固定）。SEASONS / PLAYERS / TEAMS /
          RECORDS / SOP / YEARBOOK から通常年度と同様に参照できます。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
          <Link
            href={`/seasons/${DEMO_SEASON_YEAR}`}
            className="text-[color:var(--museum-accent,#d4af37)] underline-offset-2 hover:underline"
          >
            SEASONS → {DEMO_SEASON_YEAR} を開く
          </Link>
          <span className="text-white/45">
            正式ストア件数: {formalCount}
          </span>
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setConfirmOpen(true);
            }}
            className="rounded-md border border-amber-400/40 px-2.5 py-1 text-[11px] text-amber-100 hover:bg-amber-500/10"
          >
            {DEMO_SEASON_YEAR}年デモデータを削除
          </button>
        </div>
        {message ? (
          <p className="mt-2 text-[11px] text-white/70">{message}</p>
        ) : null}
      </div>

      <div
        className={cn(
          "rounded-xl border px-4 py-3",
          on
            ? "border-amber-400/40 bg-amber-500/10"
            : "border-white/12 bg-black/40",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[13px] font-medium",
                on ? "text-amber-100" : "text-white",
              )}
            >
              分離デモ領域（OCRサンドボックス）
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">
              OCRテスト用の分離領域です。ONのとき YEAR≠
              {DEMO_IMPORT_YEAR}{" "}
              の登録のみここへ入り、正式なSEASONS /
              SOP等には混ざりません。Museum全体の連携テストは上の YEAR=
              {DEMO_IMPORT_YEAR}（正式ストア）を使ってください。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => setImportDemoMode(!on)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
              on
                ? "border-amber-300/50 bg-amber-400/40"
                : "border-white/20 bg-white/10",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                on ? "left-6" : "left-0.5",
              )}
            />
          </button>
        </div>
        {on ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
            <span className="text-amber-100/90">
              分離デモ件数: {sandboxCount}
            </span>
            <button
              type="button"
              onClick={() => {
                clearAllDemoImportData();
                setSandboxCount(0);
              }}
              className="text-amber-100/80 underline-offset-2 hover:underline"
            >
              分離デモを空にする
            </button>
            <Link
              href="/import/demo"
              className="text-[color:var(--museum-accent,#d4af37)] underline-offset-2 hover:underline"
            >
              分離デモ確認ページ
            </Link>
          </div>
        ) : (
          <div className="mt-2">
            <Link
              href="/import/demo"
              className="text-[12px] text-white/50 underline-offset-2 hover:text-white/70 hover:underline"
            >
              分離デモデータ確認
            </Link>
          </div>
        )}
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0c0c0c] p-5">
            <h3 className="text-[13px] text-[color:var(--museum-accent,#d4af37)]">
              {DEMO_SEASON_YEAR}年デモデータを削除
            </h3>
            <p className="mt-2 text-[12px] text-white/60">
              正式ストア上の {DEMO_SEASON_YEAR}{" "}
              年データ（個人成績・順位・チーム成績・月間MVP・表彰・タイトル・特別記録・YEARBOOK等）を削除します。
              <br />
              <span className="text-amber-100">
                2018〜2026年の本番データには影響しません。
              </span>
              <br />
              現在の件数: {formalCount}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleClearFormal}
                className="rounded-md border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-[12px] text-amber-100"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

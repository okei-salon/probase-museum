"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildMuseumBackup,
  downloadMuseumBackup,
  formatBytes,
  getMuseumStoragePreview,
  parseMuseumBackupJson,
  restoreMuseumBackup,
  type MuseumBackupFile,
  type MuseumBackupPreview,
} from "@/lib/backup/museumBackup";
import { cn } from "@/lib/cn";

type PendingRestore = {
  backup: MuseumBackupFile;
  fileName: string;
};

export function MuseumBackupPanel() {
  const [preview, setPreview] = useState<MuseumBackupPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [busy, setBusy] = useState(false);
  const [safetyBackupBeforeRestore, setSafetyBackupBeforeRestore] =
    useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshPreview = useCallback(() => {
    try {
      setPreview(getMuseumStoragePreview());
    } catch {
      setPreview({
        keyCount: 0,
        knownKeysPresent: [],
        approxBytes: 0,
        keys: [],
      });
    }
  }, []);

  useEffect(() => {
    // マウント後にプレビュー読込（SSR/ハイドレーション差と lint を避ける）
    const id = window.setTimeout(() => {
      refreshPreview();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshPreview]);

  const onExport = () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const data = downloadMuseumBackup();
      setMessage(
        `バックアップを保存しました（${data.meta.keyCount} キー / ${formatBytes(data.meta.approxBytes)}）。`,
      );
      refreshPreview();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "バックアップの書き出しに失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (file: File | null) => {
    setError(null);
    setMessage(null);
    setPending(null);
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseMuseumBackupJson(text);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setPending({ backup: parsed.backup, fileName: file.name });
    } catch {
      setError("ファイルの読み込みに失敗しました。");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onCancelRestore = () => {
    setPending(null);
    setError(null);
  };

  const onConfirmRestore = () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (safetyBackupBeforeRestore) {
        downloadMuseumBackup(buildMuseumBackup());
      }
      const result = restoreMuseumBackup(pending.backup);
      setPending(null);
      setMessage(
        `復元が完了しました（${result.writtenKeys.length} キーを上書き）。ページを再読み込みすると反映されます。`,
      );
      refreshPreview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "復元に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const onReload = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-museum-ivory-muted">
        この端末の localStorage に保存されている Museum
        データ（個人成績・順位・交流戦・ポストシーズン・表彰・SOP・選手マスタなど）を
        1つの JSON ファイルとして書き出し／復元できます。クラウド同期の前に、必ずバックアップを取ってください。
      </p>

      {preview ? (
        <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2">
            <dt className="text-museum-ivory-soft">保存キー数</dt>
            <dd className="mt-0.5 text-[15px] text-museum-ivory">
              {preview.keyCount}
            </dd>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2">
            <dt className="text-museum-ivory-soft">おおよそ容量</dt>
            <dd className="mt-0.5 text-[15px] text-museum-ivory">
              {formatBytes(preview.approxBytes)}
            </dd>
          </div>
        </dl>
      ) : null}

      {preview && preview.keys.length > 0 ? (
        <details className="rounded-lg border border-white/10 bg-black/35 px-3 py-2">
          <summary className="cursor-pointer text-[12px] text-museum-ivory-soft">
            含まれるキー一覧
          </summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[11px] text-museum-ivory-muted">
            {preview.keys.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-[12px] text-museum-ivory-soft">
          まだ Museum データがありません。データ取込後にバックアップできます。
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={busy}
          className={cn(
            "rounded-[var(--radius-control)] border border-museum-gold/55",
            "bg-museum-gold/20 px-4 py-2 text-[12px] tracking-[0.08em]",
            "text-museum-gold-soft transition-colors hover:bg-museum-gold/30",
            "disabled:cursor-wait disabled:opacity-50",
          )}
        >
          バックアップを書き出す
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || pending != null}
          className={cn(
            "rounded-[var(--radius-control)] border border-white/25",
            "bg-black/55 px-4 py-2 text-[12px] tracking-[0.08em]",
            "text-museum-ivory transition-colors hover:border-museum-gold/50",
            "disabled:opacity-50",
          )}
        >
          バックアップを復元…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {pending ? (
        <div
          role="dialog"
          aria-modal="true"
          className="space-y-4 rounded-xl border border-museum-gold/45 bg-black/80 p-4"
        >
          <h3 className="text-[14px] text-museum-gold">復元の確認</h3>
          <p className="text-[13px] leading-relaxed text-museum-ivory-muted">
            ファイル <span className="text-museum-ivory">{pending.fileName}</span>{" "}
            から{" "}
            <span className="text-museum-ivory">
              {pending.backup.meta.keyCount} キー
            </span>
            （{formatBytes(pending.backup.meta.approxBytes)}）をこの端末へ書き込みます。
          </p>
          <ul className="list-disc space-y-1 pl-5 text-[12px] text-museum-ivory-soft">
            <li>
              バックアップに含まれるキーだけを上書きします（勝手に全削除はしません）。
            </li>
            <li>
              同じキーの現在データは上書きされます。取り消せません。
            </li>
            <li>
              エクスポート日時: {pending.backup.exportedAt}
            </li>
          </ul>
          <label className="flex items-start gap-2 text-[12px] text-museum-ivory-muted">
            <input
              type="checkbox"
              checked={safetyBackupBeforeRestore}
              onChange={(e) => setSafetyBackupBeforeRestore(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              復元の直前に、いまの端末データを安全用バックアップとして書き出す（推奨）
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirmRestore}
              disabled={busy}
              className={cn(
                "rounded-[var(--radius-control)] border border-red-400/50",
                "bg-red-950/50 px-4 py-2 text-[12px] tracking-[0.08em]",
                "text-red-100 transition-colors hover:bg-red-900/50",
                "disabled:opacity-50",
              )}
            >
              確認したので復元する
            </button>
            <button
              type="button"
              onClick={onCancelRestore}
              disabled={busy}
              className="rounded-[var(--radius-control)] border border-white/20 bg-black/50 px-4 py-2 text-[12px] text-museum-ivory-soft hover:border-white/40"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-950/40 px-3 py-2 text-[12px] text-red-200/90"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <div className="space-y-2 rounded-md border border-museum-gold/30 bg-museum-gold/10 px-3 py-2">
          <p className="text-[12px] text-museum-gold-soft">{message}</p>
          {message.includes("再読み込み") ? (
            <button
              type="button"
              onClick={onReload}
              className="text-[12px] text-museum-gold underline-offset-2 hover:underline"
            >
              いま再読み込みする
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

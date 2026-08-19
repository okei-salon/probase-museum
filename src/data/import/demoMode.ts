/**
 * デモ取込モード（OCRサンドボックス用の分離領域）
 *
 * YEAR=2000（DEMO SEASON）は常に正式ストアへ保存する。
 * 分離デモ領域は year !== 2000 かつデモ取込モード ON のときのみ使う。
 */

import { DEMO_SEASON_YEAR } from "@/data/seasons";

/** @deprecated 別名互換 — DEMO_SEASON_YEAR を使用 */
export const DEMO_IMPORT_YEAR = DEMO_SEASON_YEAR;

const MODE_KEY = "probase-museum.import-demo-mode.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getImportDemoMode(): boolean {
  if (!canUseStorage()) return false;
  try {
    return window.localStorage.getItem(MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setImportDemoMode(on: boolean): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(MODE_KEY, on ? "1" : "0");
    notifyImportStoreChanged();
  } catch {
    // ignore
  }
}

/**
 * 分離デモ領域（sandbox）へ書くか。
 * YEAR=2000 は常に false（正式ストア固定）。
 */
export function shouldUseIsolatedDemoStore(year: number): boolean {
  if (year === DEMO_SEASON_YEAR) return false;
  return getImportDemoMode();
}

export function notifyImportStoreChanged(): void {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event("probase-demo-mode"));
  window.dispatchEvent(new Event("probase-formal-store"));
}

export function subscribeImportDemoMode(cb: () => void): () => void {
  if (!canUseStorage()) return () => {};
  const handler = () => cb();
  window.addEventListener("probase-demo-mode", handler);
  window.addEventListener("probase-formal-store", handler);
  window.addEventListener("storage", handler);
  window.addEventListener("probase-demo-season-cleared", handler);
  return () => {
    window.removeEventListener("probase-demo-mode", handler);
    window.removeEventListener("probase-formal-store", handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("probase-demo-season-cleared", handler);
  };
}

export { DEMO_SEASON_YEAR };

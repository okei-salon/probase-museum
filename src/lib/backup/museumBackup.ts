/**
 * ProBase Museum — localStorage バックアップ / 復元（第1段階）
 *
 * 端末ローカルの Museum データを1つの JSON にまとめて書き出し・復元する。
 * クラウド移行前の安全網。認証 Cookie や非 Museum キーは対象外。
 */

export const BACKUP_FORMAT = "probase-museum-backup" as const;
export const BACKUP_VERSION = 1 as const;

/** コード上で把握している Museum 用キー（存在しなくてもエクスポート時にスキャン補完） */
export const KNOWN_MUSEUM_STORAGE_KEYS = [
  "probase-museum.season-lines.v1",
  "probase-museum.team-season-stats.v1",
  "probase-museum.team-standings.v1",
  "probase-museum.standings-history.v1",
  "probase-museum.pennant-matchups.v1",
  "probase-museum.interleague.v1",
  "probase-museum.postseason.v1",
  "probase-museum.yearbook-reviews.v1",
  "probase-museum.season-achievements.v1",
  "probase-museum.sop-feats.v1",
  "probase-museum.sop-awards-registry.v1",
  "probase-museum.title-win-history.v1",
  "probase-museum.player-master.v3",
  "probase-museum.import.monthly-mvp.v1",
  "probase-museum.import.history.v1",
  "probase-museum.import-demo-data.v1",
  "probase-museum.import-demo-mode.v1",
] as const;

export type MuseumBackupFile = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  app: "ProBase Museum";
  /** localStorage の生文字列をそのまま保持（復元時の完全一致を優先） */
  entries: Record<string, string>;
  meta: {
    keyCount: number;
    knownKeysPresent: string[];
    extraKeys: string[];
    approxBytes: number;
  };
};

export type MuseumBackupPreview = {
  keyCount: number;
  knownKeysPresent: string[];
  approxBytes: number;
  keys: string[];
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** `probase-museum.` で始まるキーをすべて列挙（既知キー＋将来追加分） */
export function listMuseumStorageKeys(): string[] {
  if (!canUseStorage()) return [];
  const found = new Set<string>();
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("probase-museum.")) {
      found.add(key);
    }
  }
  for (const known of KNOWN_MUSEUM_STORAGE_KEYS) {
    if (window.localStorage.getItem(known) != null) {
      found.add(known);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

export function getMuseumStoragePreview(): MuseumBackupPreview {
  const keys = listMuseumStorageKeys();
  let approxBytes = 0;
  const knownSet = new Set<string>(KNOWN_MUSEUM_STORAGE_KEYS);
  const knownKeysPresent: string[] = [];
  for (const key of keys) {
    const raw = window.localStorage.getItem(key) ?? "";
    approxBytes += key.length + raw.length;
    if (knownSet.has(key)) knownKeysPresent.push(key);
  }
  return {
    keyCount: keys.length,
    knownKeysPresent,
    approxBytes,
    keys,
  };
}

/** 現在の localStorage からバックアップオブジェクトを構築（破壊的操作なし） */
export function buildMuseumBackup(): MuseumBackupFile {
  if (!canUseStorage()) {
    throw new Error("この環境では localStorage を利用できません。");
  }
  const keys = listMuseumStorageKeys();
  const entries: Record<string, string> = {};
  let approxBytes = 0;
  const knownSet = new Set<string>(KNOWN_MUSEUM_STORAGE_KEYS);
  const knownKeysPresent: string[] = [];
  const extraKeys: string[] = [];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (raw == null) continue;
    entries[key] = raw;
    approxBytes += key.length + raw.length;
    if (knownSet.has(key)) knownKeysPresent.push(key);
    else extraKeys.push(key);
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: "ProBase Museum",
    entries,
    meta: {
      keyCount: Object.keys(entries).length,
      knownKeysPresent: knownKeysPresent.sort(),
      extraKeys: extraKeys.sort(),
      approxBytes,
    },
  };
}

export function museumBackupToJson(backup: MuseumBackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function downloadMuseumBackup(backup?: MuseumBackupFile): MuseumBackupFile {
  const data = backup ?? buildMuseumBackup();
  const json = museumBackupToJson(data);
  const stamp = data.exportedAt.slice(0, 19).replace(/[:T]/g, "-");
  const filename = `probase-museum-backup-${stamp}.json`;
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return data;
}

export type ParseBackupResult =
  | { ok: true; backup: MuseumBackupFile }
  | { ok: false; error: string };

/** バックアップ JSON を検証（この時点では localStorage に書き込まない） */
export function parseMuseumBackupJson(text: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSONとして読み取れませんでした。" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "バックアップの形式が不正です。" };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      error: `対応していない形式です（期待: ${BACKUP_FORMAT}）。`,
    };
  }
  if (obj.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `未対応のバックアップ版です（version=${String(obj.version)}）。`,
    };
  }
  if (!obj.entries || typeof obj.entries !== "object" || Array.isArray(obj.entries)) {
    return { ok: false, error: "entries が見つからないか不正です。" };
  }

  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj.entries as Record<string, unknown>)) {
    if (!key.startsWith("probase-museum.")) {
      return {
        ok: false,
        error: `Museum以外のキーは復元できません: ${key}`,
      };
    }
    if (typeof value !== "string") {
      // 旧・手編集でオブジェクト直書きされていた場合は再シリアライズ
      try {
        entries[key] = JSON.stringify(value);
      } catch {
        return { ok: false, error: `キー ${key} の値が不正です。` };
      }
    } else {
      entries[key] = value;
    }
  }

  const knownSet = new Set<string>(KNOWN_MUSEUM_STORAGE_KEYS);
  const knownKeysPresent = Object.keys(entries)
    .filter((k) => knownSet.has(k))
    .sort();
  const extraKeys = Object.keys(entries)
    .filter((k) => !knownSet.has(k))
    .sort();
  let approxBytes = 0;
  for (const [k, v] of Object.entries(entries)) {
    approxBytes += k.length + v.length;
  }

  const backup: MuseumBackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt:
      typeof obj.exportedAt === "string" ? obj.exportedAt : new Date().toISOString(),
    app: "ProBase Museum",
    entries,
    meta: {
      keyCount: Object.keys(entries).length,
      knownKeysPresent,
      extraKeys,
      approxBytes,
    },
  };

  return { ok: true, backup };
}

export type RestoreOptions = {
  /**
   * true: バックアップに含まれるキーだけ上書き（バックアップに無い既存キーは残す）
   * 既定 true。既存データを勝手に削除しない。
   */
  onlyOverwritePresentKeys?: boolean;
};

export type RestoreResult = {
  writtenKeys: string[];
  skippedEmpty: boolean;
};

/**
 * 確認済みのバックアップを localStorage へ書き込む。
 * 呼び出し前に必ず UI で確認すること。
 */
export function restoreMuseumBackup(
  backup: MuseumBackupFile,
  options: RestoreOptions = {},
): RestoreResult {
  if (!canUseStorage()) {
    throw new Error("この環境では localStorage を利用できません。");
  }
  const onlyOverwrite = options.onlyOverwritePresentKeys !== false;
  if (!onlyOverwrite) {
    // 将来用。現状は安全側のみサポート。
    throw new Error("全削除付き復元は現在サポートしていません。");
  }

  const writtenKeys: string[] = [];
  for (const [key, value] of Object.entries(backup.entries)) {
    if (!key.startsWith("probase-museum.")) continue;
    window.localStorage.setItem(key, value);
    writtenKeys.push(key);
  }

  return {
    writtenKeys: writtenKeys.sort(),
    skippedEmpty: writtenKeys.length === 0,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

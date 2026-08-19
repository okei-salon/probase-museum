/**
 * 旧SOP用 feats ストア（互換）。
 * 新規登録は seasonAchievements を優先。こちらはフォールバック読み取り用。
 */

const STORAGE_KEY = "probase-museum.sop-feats.v1";

export type SopFeatRecord = {
  id: string;
  playerId: string;
  playerName: string;
  year: number;
  role: "batter" | "pitcher";
  cycle?: boolean;
  hitStreak?: number | null;
  onBaseStreak?: number | null;
  hrStreak?: number | null;
  perfectGame?: boolean;
  noHitter?: boolean;
  scorelessIp?: number | null;
  gameSo?: number | null;
  winStreak?: number | null;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function listSopFeats(): SopFeatRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SopFeatRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSopFeat(
  playerId: string,
  year: number,
  role: "batter" | "pitcher",
): SopFeatRecord | null {
  return (
    listSopFeats().find(
      (f) => f.playerId === playerId && f.year === year && f.role === role,
    ) ?? null
  );
}

export function upsertSopFeat(record: SopFeatRecord): SopFeatRecord {
  const list = listSopFeats();
  const idx = list.findIndex((f) => f.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return record;
}

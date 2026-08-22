/**
 * ブラウザ側: museum_documents 汎用 sync ヘルパー。
 * localStorage はキャッシュ。正本は Neon。
 */

import { normalizeSeasonWorld, type SeasonWorld } from "@/data/seasons";

export type CloudRecordBase = {
  id: string;
  /** 数値推奨。postseason 等は string year を payload に持つ場合あり */
  year?: number | string | null;
  world?: SeasonWorld | null;
  updatedAt?: string;
};

function isStrictlyNewer(a: string | undefined, b: string | undefined): boolean {
  const ta = Date.parse(a ?? "");
  const tb = Date.parse(b ?? "");
  if (!Number.isFinite(ta)) return false;
  if (!Number.isFinite(tb)) return true;
  return ta > tb;
}

export async function fetchMuseumCollectionRecords<T extends CloudRecordBase>(
  collection: string,
): Promise<T[] | null> {
  try {
    const res = await fetch(
      `/api/museum/docs/${encodeURIComponent(collection)}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; records?: T[] };
    if (!data.ok || !Array.isArray(data.records)) return null;
    return data.records;
  } catch {
    return null;
  }
}

export async function putMuseumCollectionRecord<T extends CloudRecordBase>(
  collection: string,
  record: T,
): Promise<{ ok: boolean; error?: string; record?: T }> {
  try {
    const res = await fetch(
      `/api/museum/docs/${encodeURIComponent(collection)}/${encodeURIComponent(record.id)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return { ok: false, error: data?.error ?? `http_${res.status}` };
    }
    const data = (await res.json()) as { ok?: boolean; record?: T };
    return { ok: true, record: data.record ?? record };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network_error",
    };
  }
}

/**
 * クラウド一覧 ↔ local 配列を merge。
 * - クラウドに無いローカル行 → アップロード
 * - 同一 id: 新しい updatedAt 優先（同刻はクラウド）
 * - 取得失敗時は local を消さない
 */
export async function hydrateLocalArrayFromCloud<T extends CloudRecordBase>(options: {
  collection: string;
  readRaw: () => T[];
  writeRaw: (list: T[]) => void;
  normalize: (r: T) => T;
  filterPublic?: (list: T[]) => T[];
  mergeOne?: (local: T, cloud: T) => T;
  /** PUT 直前の変換（例: postseason の year を Number にする） */
  serializeForCloud?: (r: T) => CloudRecordBase;
}): Promise<T[]> {
  const {
    collection,
    readRaw,
    writeRaw,
    normalize,
    filterPublic,
    mergeOne,
    serializeForCloud,
  } = options;

  const cloudListRaw = await fetchMuseumCollectionRecords<T>(collection);
  if (!cloudListRaw) {
    const local = readRaw();
    return filterPublic ? filterPublic(local) : local;
  }

  const localList = readRaw().map(normalize);
  const cloudList = cloudListRaw.map(normalize);
  const map = new Map<string, T>();
  const pendingPush: T[] = [];
  const cloudIds = new Set(cloudList.map((r) => r.id));

  for (const local of localList) {
    map.set(local.id, local);
  }

  for (const cloud of cloudList) {
    const local = map.get(cloud.id);
    if (!local) {
      map.set(cloud.id, cloud);
      continue;
    }
    if (isStrictlyNewer(local.updatedAt, cloud.updatedAt)) {
      const merged = mergeOne ? mergeOne(local, cloud) : local;
      map.set(cloud.id, merged);
      pendingPush.push(merged);
    } else {
      const merged = mergeOne ? mergeOne(cloud, local) : cloud;
      // mergeOne(primary=cloud, secondary=local): prefer cloud fields, fill nulls from local
      map.set(cloud.id, merged);
    }
  }

  for (const local of localList) {
    if (!cloudIds.has(local.id)) pendingPush.push(local);
  }

  const mergedList = [...map.values()];
  writeRaw(mergedList);

  if (pendingPush.length > 0) {
    await Promise.all(
      pendingPush.map((r) =>
        putMuseumCollectionRecord(
          collection,
          serializeForCloud ? serializeForCloud(r) : r,
        ),
      ),
    );
  }

  return filterPublic ? filterPublic(mergedList) : mergedList;
}

export function yearWorldFromRecord(record: {
  year?: number | null;
  world?: SeasonWorld | null;
}): { year: number | null; world: SeasonWorld | null } {
  const year =
    record.year != null && Number.isFinite(Number(record.year))
      ? Number(record.year)
      : null;
  return { year, world: normalizeSeasonWorld(record.world) };
}

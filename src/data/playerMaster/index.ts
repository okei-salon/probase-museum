import { getTeam, npbTeams, type TeamId } from "@/data/teams";
import {
  normalizeSeasonWorld,
  type SeasonWorld,
} from "@/data/seasons";
import { buildInitialPlayerMasterSeed } from "./seed";
import type {
  PlayerMaster,
  PlayerMasterImportRow,
  PlayerSeasonAffiliation,
} from "./types";

export type {
  OcrPlayerObservation,
  PlayerIdentityConfirmRequest,
  PlayerMaster,
  PlayerMasterImportRow,
  PlayerMatchCandidate,
  PlayerMatchConfidence,
  PlayerMatchQuery,
  PlayerMatchResult,
  PlayerRef,
  PlayerSeasonAffiliation,
} from "./types";
export { UNKNOWN_PLAYER_STATUS } from "./types";

/** v3: 2026 NPB初期辞書を含む。学習分はシードへマージして復元する。 */
const STORAGE_KEY = "probase-museum.player-master.v3";

type PersistedBundle = {
  masters: PlayerMaster[];
  affiliations: PlayerSeasonAffiliation[];
};

/** 所属の照合キー。world 無しはレガシー互換（既存キー形式を維持）。 */
export function affiliationSlotKey(
  playerId: string,
  year: number,
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  return w ? `${playerId}:${year}:${w}` : `${playerId}:${year}`;
}

const initialSeed = buildInitialPlayerMasterSeed();
const masterStore: PlayerMaster[] = [...initialSeed.masters];
const affiliationStore: PlayerSeasonAffiliation[] = [
  ...initialSeed.affiliations,
];

let hydrated = false;

export function listPlayerMasters(): readonly PlayerMaster[] {
  return masterStore;
}

export function listPlayerAffiliations(): readonly PlayerSeasonAffiliation[] {
  return affiliationStore;
}

export function getPlayerMaster(playerId: string): PlayerMaster | null {
  return masterStore.find((p) => p.playerId === playerId) ?? null;
}

export function getPlayerAffiliation(
  playerId: string,
  year: number,
  world?: SeasonWorld | null,
): PlayerSeasonAffiliation | null {
  const w = normalizeSeasonWorld(world);
  if (w) {
    return (
      affiliationStore.find(
        (a) =>
          a.playerId === playerId &&
          a.year === year &&
          normalizeSeasonWorld(a.world) === w,
      ) ?? null
    );
  }
  // world 未指定: レガシー（world 無し）を優先。無ければいずれか1件。
  return (
    affiliationStore.find(
      (a) =>
        a.playerId === playerId &&
        a.year === year &&
        normalizeSeasonWorld(a.world) == null,
    ) ??
    affiliationStore.find((a) => a.playerId === playerId && a.year === year) ??
    null
  );
}

export function getPlayerAffiliationsByPlayer(
  playerId: string,
): PlayerSeasonAffiliation[] {
  return affiliationStore
    .filter((a) => a.playerId === playerId)
    .sort((a, b) => a.year - b.year);
}

export function getPlayerFullName(playerId: string): string | null {
  return getPlayerMaster(playerId)?.fullName ?? null;
}

export function normalizeTeamId(input: string | null | undefined): TeamId | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const alias: Record<string, TeamId> = {
    hanshin: "tigers",
    tigers: "tigers",
    阪神: "tigers",
    阪神タイガース: "tigers",
    yomiuri: "giants",
    giants: "giants",
    巨人: "giants",
    読売: "giants",
    読売ジャイアンツ: "giants",
    hiroshima: "carp",
    carp: "carp",
    広島: "carp",
    広島東洋カープ: "carp",
    dena: "baystars",
    baystars: "baystars",
    yokohama: "baystars",
    DeNA: "baystars",
    横浜: "baystars",
    横浜DeNAベイスターズ: "baystars",
    yakult: "swallows",
    swallows: "swallows",
    ヤクルト: "swallows",
    東京ヤクルトスワローズ: "swallows",
    chunichi: "dragons",
    dragons: "dragons",
    中日: "dragons",
    中日ドラゴンズ: "dragons",
    orix: "buffaloes",
    buffaloes: "buffaloes",
    オリックス: "buffaloes",
    "オリックス・バファローズ": "buffaloes",
    softbank: "hawks",
    hawks: "hawks",
    ソフトバンク: "hawks",
    福岡ソフトバンクホークス: "hawks",
    lotte: "marines",
    marines: "marines",
    ロッテ: "marines",
    千葉ロッテマリーンズ: "marines",
    nipponham: "fighters",
    fighters: "fighters",
    日本ハム: "fighters",
    北海道日本ハムファイターズ: "fighters",
    seibu: "lions",
    lions: "lions",
    西武: "lions",
    埼玉西武ライオンズ: "lions",
    rakuten: "eagles",
    eagles: "eagles",
    楽天: "eagles",
    東北楽天ゴールデンイーグルス: "eagles",
  };

  if (alias[raw] || alias[lower]) {
    return alias[raw] ?? alias[lower]!;
  }

  const byId = getTeam(lower) ?? getTeam(raw);
  if (byId) return byId.id;

  const byName = npbTeams.find(
    (t) => t.name === raw || t.short === raw || t.id === lower,
  );
  return byName?.id ?? null;
}

export function resolveTeamName(teamId: TeamId): string {
  return getTeam(teamId)?.name ?? teamId;
}

export function upsertPlayerMasterRecord(master: PlayerMaster): PlayerMaster {
  const idx = masterStore.findIndex((p) => p.playerId === master.playerId);
  if (idx >= 0) masterStore[idx] = master;
  else masterStore.push(master);
  persistPlayerMasterStore();
  return master;
}

export function upsertPlayerAffiliation(
  affiliation: PlayerSeasonAffiliation,
): PlayerSeasonAffiliation {
  const world = normalizeSeasonWorld(affiliation.world);
  const next = { ...affiliation, world };
  const key = affiliationSlotKey(next.playerId, next.year, world);
  const aIdx = affiliationStore.findIndex(
    (a) => affiliationSlotKey(a.playerId, a.year, a.world) === key,
  );
  if (aIdx >= 0) affiliationStore[aIdx] = next;
  else affiliationStore.push(next);
  persistPlayerMasterStore();
  return next;
}

export function addPlayerAlias(playerId: string, alias: string): PlayerMaster | null {
  const player = getPlayerMaster(playerId);
  if (!player) return null;
  const normalized = alias.trim().replace(/\s+/g, "");
  if (!normalized) return player;
  if (
    player.gameDisplayName === normalized ||
    player.aliases.includes(normalized)
  ) {
    return player;
  }
  const updated: PlayerMaster = {
    ...player,
    aliases: [...player.aliases, normalized],
    updatedAt: new Date().toISOString(),
  };
  return upsertPlayerMasterRecord(updated);
}

/**
 * インポート行をストアへ反映（任意の一括投入用）。
 * 通常運用は OCR → ユーザー確認 → 学習登録。
 */
export function upsertPlayerMasterFromImport(
  row: PlayerMasterImportRow,
  defaultYear?: number,
): { master: PlayerMaster; affiliation: PlayerSeasonAffiliation | null } {
  const nowIso = new Date().toISOString();
  const teamId =
    normalizeTeamId(String(row.teamId)) ?? normalizeTeamId(row.teamName);
  if (!teamId) {
    throw new Error(`Unknown team: ${row.teamId} / ${row.teamName}`);
  }

  const uniform =
    row.uniformNumber == null || row.uniformNumber === ""
      ? null
      : Number(row.uniformNumber);

  const aliases = normalizeAliasList(row.aliases);
  const existing = getPlayerMaster(row.playerId);
  const master: PlayerMaster = {
    playerId: row.playerId,
    fullName: row.fullName,
    gameDisplayName: row.gameDisplayName,
    aliases: Array.from(
      new Set([...(existing?.aliases ?? []), ...aliases]),
    ),
    position: row.position,
    uniformNumber: Number.isFinite(uniform as number)
      ? (uniform as number)
      : null,
    isRealPlayer: parseBool(row.isRealPlayer, true),
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  upsertPlayerMasterRecord(master);

  const year =
    row.year != null && row.year !== ""
      ? Number(row.year)
      : defaultYear != null
        ? defaultYear
        : null;

  let affiliation: PlayerSeasonAffiliation | null = null;
  if (year != null && Number.isFinite(year)) {
    affiliation = upsertPlayerAffiliation({
      playerId: master.playerId,
      year,
      teamId,
      teamName: row.teamName || resolveTeamName(teamId),
      position: row.position,
      uniformNumber: master.uniformNumber,
    });
  }

  return { master, affiliation };
}

function normalizeAliasList(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => v.trim().replace(/\s+/g, "")).filter(Boolean);
  }
  return value
    .split(/[|,]/)
    .map((v) => v.trim().replace(/\s+/g, ""))
    .filter(Boolean);
}

function parseBool(value: boolean | string | undefined, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return fallback;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(v)) return true;
  if (["0", "false", "no", "n"].includes(v)) return false;
  return fallback;
}

/** ブラウザで育てた辞書を復元（クライアントでのみ有効） */
export function hydratePlayerMasterFromStorage(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedBundle;
    if (!Array.isArray(parsed.masters) || !Array.isArray(parsed.affiliations)) {
      return;
    }
    // 初期辞書（2026 NPB等）＋学習分をマージ（同一IDは学習側を優先）
    const seed = buildInitialPlayerMasterSeed();
    const byId = new Map(seed.masters.map((p) => [p.playerId, p]));
    for (const p of parsed.masters) byId.set(p.playerId, p);
    masterStore.splice(0, masterStore.length, ...byId.values());

    const affKey = (a: PlayerSeasonAffiliation) =>
      affiliationSlotKey(a.playerId, a.year, a.world);
    const affMap = new Map(seed.affiliations.map((a) => [affKey(a), a]));
    for (const a of parsed.affiliations) affMap.set(affKey(a), a);
    affiliationStore.splice(0, affiliationStore.length, ...affMap.values());
  } catch {
    // ignore corrupt storage
  }
}

export function persistPlayerMasterStore(): void {
  if (typeof window === "undefined") return;
  try {
    const bundle: PersistedBundle = {
      masters: [...masterStore],
      affiliations: [...affiliationStore],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    // quota / private mode
  }
}

export function __resetPlayerMasterStoreForTests() {
  const seed = buildInitialPlayerMasterSeed();
  masterStore.splice(0, masterStore.length, ...seed.masters);
  affiliationStore.splice(0, affiliationStore.length, ...seed.affiliations);
  hydrated = false;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

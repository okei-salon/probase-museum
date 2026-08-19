/**
 * 相棒データ展開結果の一括登録（確認後）
 */

import { ACHIEVEMENT_CATALOG } from "@/data/seasonAchievements/catalog";
import {
  listStoredAchievements,
  seasonAchievementId,
  upsertStoredAchievement,
} from "@/data/seasonAchievements/store";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  listDemoAchievements,
  listDemoAwards,
  upsertDemoAchievement,
  upsertDemoAward,
  upsertDemoTitleWin,
} from "@/data/import/demoStore";
import { appendImportHistory } from "@/data/import/store";
import {
  listRegisteredAwardsForYear,
  registeredAwardId,
  replaceRegisteredAwardsForLeague,
  upsertRegisteredAward,
} from "@/data/sop/awardsRegistry";
import {
  upsertTitleBoard,
  type TitleWinRecord,
} from "@/data/titleRankings/history";
import {
  roleForRecordType,
  sopPointsForRecordType,
} from "@/lib/import/achievementSopPoints";
import type {
  PartnerAwardResult,
  PartnerPositionAwardResult,
  PartnerSpecialResult,
  PartnerTitleResult,
} from "@/lib/import/partnerPaste";
import {
  normalizeSeasonWorld,
  type SeasonWorld,
} from "@/data/seasons";

export function savePartnerTitleResult(
  result: PartnerTitleResult,
  force: boolean,
  world?: SeasonWorld | null,
): { ok: true; summary: string } | { ok: false; needsConfirm: boolean; message: string } {
  const useSandbox = shouldUseIsolatedDemoStore(result.year);
  const w = normalizeSeasonWorld(world);
  const byLeague = new Map<"central" | "pacific", typeof result.entries>();
  for (const e of result.entries) {
    const list = byLeague.get(e.league) ?? [];
    list.push(e);
    byLeague.set(e.league, list);
  }

  void force;

  const missing = result.entries.filter((e) => !e.playerId);
  if (missing.length > 0) {
    return {
      ok: false,
      needsConfirm: false,
      message: `選手未確定が${missing.length}件あります。確認表で修正してください`,
    };
  }

  for (const [league, entries] of byLeague) {
    const board: TitleWinRecord[] = entries.map((e) => ({
      titleId: result.titleId,
      year: result.year,
      world: w,
      league,
      playerId: e.playerId!,
      rank: e.rank,
      playerName: e.displayName || e.name,
      teamShort: e.teamShort,
      valueText: e.valueText,
    }));
    if (useSandbox) {
      for (const r of board) upsertDemoTitleWin(r);
    } else {
      upsertTitleBoard(board);
    }
  }

  const hist = {
    id: `hist-${Date.now()}`,
    at: new Date().toISOString(),
    year: result.year,
    fileName: "partner-title",
    screenType: "mvp" as const,
    summary: `${result.year}年 ${result.titleLabel} TOP（相棒） ${result.entries.length}件`,
    recordIds: result.entries.map(
      (e) =>
        w
          ? `${w}:${result.titleId}:${result.year}:${e.league}:${e.rank}`
          : `${result.titleId}:${result.year}:${e.league}:${e.rank}`,
    ),
  };
  if (useSandbox) appendDemoImportHistory(hist);
  else {
    appendImportHistory(hist);
    notifyImportStoreChanged();
  }

  return {
    ok: true,
    summary: useSandbox
      ? `${result.titleLabel}を分離デモ領域に登録しました`
      : `${result.titleLabel} ${result.entries.length}件を登録しました`,
  };
}

export function savePartnerAwardResult(
  result: PartnerAwardResult,
  force: boolean,
  world?: SeasonWorld | null,
): { ok: true; summary: string } | { ok: false; needsConfirm: boolean; message: string } {
  const useSandbox = shouldUseIsolatedDemoStore(result.year);
  const w = normalizeSeasonWorld(world);
  const unresolved = result.slots.filter((s) => !s.playerId);
  if (unresolved.length) {
    return {
      ok: false,
      needsConfirm: false,
      message: `選手未確定: ${unresolved.map((s) => s.key).join(", ")}`,
    };
  }

  if (!force) {
    const conflicts: string[] = [];
    for (const s of result.slots) {
      const id = registeredAwardId({
        kind: s.kind,
        year: result.year,
        world: w,
        league: s.league,
        playerId: s.playerId!,
      });
      const existing = useSandbox
        ? listDemoAwards().find((a) => a.id === id)
        : listRegisteredAwardsForYear(result.year).find((a) => a.id === id);
      const sameSlot = useSandbox
        ? listDemoAwards().find(
            (a) =>
              a.year === result.year &&
              normalizeSeasonWorld(a.world) === w &&
              a.kind === s.kind &&
              (s.kind === "sawamura" || a.league === s.league),
          )
        : listRegisteredAwardsForYear(result.year).find(
            (a) =>
              normalizeSeasonWorld(a.world) === w &&
              a.kind === s.kind &&
              (s.kind === "sawamura" || a.league === s.league),
          );
      if (existing || sameSlot) conflicts.push(s.key);
    }
    if (conflicts.length) {
      return {
        ok: false,
        needsConfirm: true,
        message: `既存データあり: ${conflicts.join(", ")}。上書きしますか？`,
      };
    }
  }

  const ids: string[] = [];
  for (const s of result.slots) {
    const id = registeredAwardId({
      kind: s.kind,
      year: result.year,
      world: w,
      league: s.league,
      playerId: s.playerId!,
    });
    const payload = {
      id,
      year: result.year,
      world: w,
      kind: s.kind,
      playerId: s.playerId!,
      playerName: s.displayName || s.name,
      teamShort: s.teamShort,
      league: s.league,
    };
    if (useSandbox) upsertDemoAward(payload);
    else upsertRegisteredAward(payload);
    ids.push(id);
  }

  const hist = {
    id: `hist-${Date.now()}`,
    at: new Date().toISOString(),
    year: result.year,
    fileName: "partner-award",
    screenType: "mvp" as const,
    summary: `${result.year}年 年間表彰（相棒） ${ids.length}件`,
    recordIds: ids,
  };
  if (useSandbox) appendDemoImportHistory(hist);
  else {
    appendImportHistory(hist);
    notifyImportStoreChanged();
  }

  return {
    ok: true,
    summary: useSandbox
      ? `${ids.length}件を分離デモ領域に登録しました`
      : `${ids.length}件の表彰を登録しました`,
  };
}

export function savePartnerPositionAwardResult(
  result: PartnerPositionAwardResult,
  force: boolean,
  world?: SeasonWorld | null,
): { ok: true; summary: string } | { ok: false; needsConfirm: boolean; message: string } {
  const useSandbox = shouldUseIsolatedDemoStore(result.year);
  const w = normalizeSeasonWorld(world);
  const kind = result.type === "BEST_NINE" ? "bestNine" : "goldenGlove";
  const unresolved = result.entries.filter((e) => !e.playerId);
  if (unresolved.length) {
    return {
      ok: false,
      needsConfirm: false,
      message: `選手未確定が${unresolved.length}件あります`,
    };
  }

  if (!force) {
    const existing = useSandbox
      ? listDemoAwards().filter(
          (a) =>
            a.year === result.year &&
            normalizeSeasonWorld(a.world) === w &&
            a.kind === kind &&
            a.league === result.league,
        )
      : listRegisteredAwardsForYear(result.year).filter(
          (a) =>
            normalizeSeasonWorld(a.world) === w &&
            a.kind === kind &&
            a.league === result.league,
        );
    if (existing.length) {
      return {
        ok: false,
        needsConfirm: true,
        message: `既存の${result.type === "BEST_NINE" ? "ベストナイン" : "ゴールデングラブ"}データがあります。上書きしますか？`,
      };
    }
  }

  const ids: string[] = [];
  if (useSandbox) {
    result.entries.forEach((e, i) => {
      const id = registeredAwardId({
        kind,
        year: result.year,
        world: w,
        league: result.league,
        position: e.position,
        playerId: e.playerId!,
      });
      // demo: keep index suffix for legacy uniqueness when world null
      const demoId = w
        ? id
        : `${kind}:${result.year}:${result.league}:${e.position}:${e.playerId}:${i}`;
      upsertDemoAward({
        id: demoId,
        year: result.year,
        world: w,
        kind,
        playerId: e.playerId!,
        playerName: e.displayName || e.name,
        teamShort: e.teamShort,
        league: result.league,
        position: e.position,
      });
      ids.push(demoId);
    });
  } else {
    const inserted = replaceRegisteredAwardsForLeague({
      year: result.year,
      world: w,
      kind,
      league: result.league,
      awards: result.entries.map((e) => ({
        playerId: e.playerId!,
        playerName: e.displayName || e.name,
        teamShort: e.teamShort,
        position: e.position,
      })),
    });
    ids.push(...inserted.map((a) => a.id));
  }

  const hist = {
    id: `hist-${Date.now()}`,
    at: new Date().toISOString(),
    year: result.year,
    fileName: "partner-position-award",
    screenType: result.type === "BEST_NINE" ? ("best9" as const) : ("gg" as const),
    summary: `${result.year}年 ${result.type === "BEST_NINE" ? "B9" : "GG"}（相棒） ${ids.length}件`,
    recordIds: ids,
  };
  if (useSandbox) appendDemoImportHistory(hist);
  else {
    appendImportHistory(hist);
    notifyImportStoreChanged();
  }

  return {
    ok: true,
    summary: useSandbox
      ? `${ids.length}件を分離デモ領域に登録しました`
      : `${ids.length}件を登録しました`,
  };
}

export function savePartnerSpecialResult(
  result: PartnerSpecialResult,
  force: boolean,
  world?: SeasonWorld | null,
): { ok: true; summary: string } | { ok: false; needsConfirm: boolean; message: string } {
  const useSandbox = shouldUseIsolatedDemoStore(result.year);
  const w = normalizeSeasonWorld(world);
  const unresolved = result.entries.filter((e) => !e.playerId);
  if (unresolved.length) {
    return {
      ok: false,
      needsConfirm: false,
      message: `選手未確定が${unresolved.length}件あります`,
    };
  }

  if (!force) {
    const conflicts: string[] = [];
    for (const e of result.entries) {
      const id = seasonAchievementId({
        season: result.year,
        world: w,
        playerId: e.playerId!,
        recordType: e.recordType,
      });
      const existing = useSandbox
        ? listDemoAchievements().find((a) => a.id === id)
        : listStoredAchievements().find((a) => a.id === id);
      if (existing) conflicts.push(e.recordName);
    }
    if (conflicts.length) {
      return {
        ok: false,
        needsConfirm: true,
        message: `既存記録あり: ${conflicts.join(", ")}。上書きしますか？`,
      };
    }
  }

  const now = new Date().toISOString();
  const ids: string[] = [];
  for (const e of result.entries) {
    const catalog = ACHIEVEMENT_CATALOG.find(
      (c) => c.recordType === e.recordType,
    );
    if (!catalog) continue;
    const id = seasonAchievementId({
      season: result.year,
      world: w,
      playerId: e.playerId!,
      recordType: e.recordType,
    });
    const role = roleForRecordType(e.recordType);
    const sopPoints = sopPointsForRecordType(e.recordType, e.value);
    const payload = {
      id,
      season: result.year,
      world: w,
      playerId: e.playerId!,
      playerName: e.displayName || e.name,
      teamShort: e.teamShort || "—",
      role,
      category: catalog.category,
      recordType: e.recordType,
      recordName: catalog.recordName,
      value: e.value,
      unit: catalog.unit ?? null,
      valueLabel:
        e.value != null
          ? `${e.value}${catalog.unit ?? ""}`
          : catalog.recordName,
      sopPoints,
      source: "manual" as const,
      createdAt: now,
      updatedAt: now,
    };
    if (useSandbox) upsertDemoAchievement(payload);
    else upsertStoredAchievement(payload);
    ids.push(id);
  }

  const hist = {
    id: `hist-${Date.now()}`,
    at: now,
    year: result.year,
    fileName: "partner-special",
    screenType: "unknown" as const,
    summary: `${result.year}年 特別記録（相棒） ${ids.length}件`,
    recordIds: ids,
  };
  if (useSandbox) appendDemoImportHistory(hist);
  else {
    appendImportHistory(hist);
    notifyImportStoreChanged();
  }

  return {
    ok: true,
    summary: useSandbox
      ? `${ids.length}件を分離デモ領域に登録しました`
      : `${ids.length}件の特別記録を登録しました`,
  };
}

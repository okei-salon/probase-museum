/**
 * 特殊記録の id 単位修正・削除（同種同値の他件に影響しない）
 * npx tsx src/data/seasonAchievements/manageAchievements.smoke.ts
 */

import assert from "node:assert/strict";
import { identityFromWorldYear } from "@/data/seasons";
import {
  ensureAchievementRecordId,
  getStoredAchievementById,
  listStoredAchievementsForSeasonIdentity,
  removeStoredAchievementAsync,
  seasonAchievementId,
  upsertStoredAchievement,
  upsertStoredAchievementAsync,
  type SeasonAchievement,
} from "@/data/seasonAchievements";

const STORAGE_KEY = "probase-museum.season-achievements.v1";

const map = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    },
    removeItem(k: string) {
      map.delete(k);
    },
  },
};

let putOk = true;
let deleteOk = true;
let lastDeletedId: string | null = null;

(globalThis as { fetch?: typeof fetch }).fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const url = String(input);
  const method = (init?.method ?? "GET").toUpperCase();
  if (method === "PUT") {
    if (!putOk) {
      return new Response(JSON.stringify({ ok: false, error: "put_failed" }), {
        status: 500,
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (method === "DELETE") {
    const id = decodeURIComponent(url.split("/").pop() ?? "");
    lastDeletedId = id;
    if (!deleteOk) {
      return new Response(
        JSON.stringify({ ok: false, error: "delete_failed" }),
        { status: 500 },
      );
    }
    return new Response(JSON.stringify({ ok: true, deleted: true, id }), {
      status: 200,
    });
  }
  return new Response(JSON.stringify({ ok: true, records: [] }), {
    status: 200,
  });
}) as typeof fetch;

const now = new Date().toISOString();
const identity = identityFromWorldYear(2027, "BLUE");

function make(
  partial: Partial<SeasonAchievement> &
    Pick<SeasonAchievement, "playerId" | "playerName">,
): SeasonAchievement {
  const recordType = partial.recordType ?? "game_so";
  const id =
    partial.id ??
    seasonAchievementId({
      season: 2027,
      world: "BLUE",
      playerId: partial.playerId,
      recordType,
    });
  return {
    id,
    season: 2027,
    world: "BLUE",
    playerId: partial.playerId,
    playerName: partial.playerName,
    teamShort: partial.teamShort ?? "広島",
    role: "pitcher",
    category: "single_game",
    recordType,
    recordName: "1試合奪三振",
    value: partial.value ?? 12,
    unit: "奪三振",
    valueLabel: `${partial.value ?? 12}奪三振`,
    sopPoints: 0,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  // id 欠落の互換付与
  const noId = make({
    playerId: "legacy_no_id",
    playerName: "旧データ",
    id: "",
  }) as SeasonAchievement;
  (noId as { id?: string }).id = "";
  const ensured = ensureAchievementRecordId(noId);
  assert.ok(ensured.length > 0);
  assert.notEqual(ensured, "");

  upsertStoredAchievement(
    make({
      playerId: "hiroshima_01005134_34",
      playerName: "高橋昂也",
      value: 12,
    }),
  );
  upsertStoredAchievement(
    make({
      playerId: "seibu_takahashi_mitsuna",
      playerName: "高橋光成",
      value: 12,
    }),
  );
  upsertStoredAchievement(
    make({
      playerId: "hiroshima_yamano",
      playerName: "山野太一",
      value: 12,
    }),
  );

  const before = listStoredAchievementsForSeasonIdentity(identity);
  assert.equal(before.length, 3);

  const wrong = before.find(
    (a) =>
      a.recordType === "game_so" &&
      (a.playerName === "高橋昂也" || a.playerName === "高橋昴也") &&
      a.value === 12,
  );
  assert.ok(wrong, "誤登録が見つからない");
  const keepMitsuna = before.find((a) => a.playerName === "高橋光成");
  const keepYamano = before.find((a) => a.playerName.includes("山野"));
  assert.ok(keepMitsuna);
  assert.ok(keepYamano);

  // 失敗時は残る
  deleteOk = false;
  const fail = await removeStoredAchievementAsync(wrong!.id);
  assert.equal(fail.ok, false);
  assert.equal(listStoredAchievementsForSeasonIdentity(identity).length, 3);
  assert.ok(getStoredAchievementById(wrong!.id));

  // 成功時は選択1件のみ削除
  deleteOk = true;
  lastDeletedId = null;
  const ok = await removeStoredAchievementAsync(wrong!.id);
  assert.equal(ok.ok, true);
  assert.equal(lastDeletedId, wrong!.id);

  const after = listStoredAchievementsForSeasonIdentity(identity);
  assert.equal(after.length, 2);
  assert.ok(after.every((a) => a.id !== wrong!.id));
  assert.ok(after.some((a) => a.playerName === "高橋光成"));
  assert.ok(after.some((a) => a.playerName.includes("山野")));
  assert.equal(
    after.filter((a) => a.value === 12 && a.recordType === "game_so").length,
    2,
  );

  // 修正は id 固定
  const mitsuna = after.find((a) => a.playerName === "高橋光成")!;
  putOk = false;
  const editFail = await upsertStoredAchievementAsync({
    ...mitsuna,
    playerName: "高橋光成（失敗）",
  });
  assert.equal(editFail.ok, false);
  assert.equal(getStoredAchievementById(mitsuna.id)?.playerName, "高橋光成");

  putOk = true;
  const editOk = await upsertStoredAchievementAsync({
    ...mitsuna,
    teamShort: "西武",
    value: 13,
    valueLabel: "13奪三振",
  });
  assert.equal(editOk.ok, true);
  assert.equal(getStoredAchievementById(mitsuna.id)?.teamShort, "西武");
  assert.equal(getStoredAchievementById(mitsuna.id)?.value, 13);
  assert.equal(getStoredAchievementById(mitsuna.id)?.id, mitsuna.id);

  // 再読み込み相当（localStorage から）
  const reloaded = JSON.parse(map.get(STORAGE_KEY)!) as SeasonAchievement[];
  assert.equal(
    reloaded.filter((a) => a.world === "BLUE" && a.season === 2027).length,
    2,
  );
  assert.ok(!reloaded.some((a) => a.id === wrong!.id));
  assert.ok(
    reloaded.some((a) => a.playerName === "高橋光成" && a.value === 13),
  );

  console.log("manageAchievements.smoke OK", {
    deletedId: wrong!.id,
    remaining: after.map((a) => a.playerName),
  });
}

void main();

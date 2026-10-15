/**
 * Museum ボード共通 loading / ready / empty / error の回帰。
 * 実行: npx tsx src/data/museumBoardDataStatus.smoke.ts
 */
import assert from "node:assert/strict";
import {
  MUSEUM_BOARD_LOADING_MESSAGE,
  resolveMuseumBoardDataStatus,
} from "./museumBoardDataStatus";

assert.equal(
  MUSEUM_BOARD_LOADING_MESSAGE,
  "ただいまデータを読み込み中です…",
);

assert.equal(
  resolveMuseumBoardDataStatus({
    mounted: false,
    cloudReady: false,
    hasRows: false,
  }),
  "loading",
  "未マウントは読み込み中",
);

assert.equal(
  resolveMuseumBoardDataStatus({
    mounted: true,
    cloudReady: false,
    hasRows: false,
  }),
  "loading",
  "hydrate前の空は読み込み中（本当の空ではない）",
);

assert.equal(
  resolveMuseumBoardDataStatus({
    mounted: true,
    cloudReady: true,
    hasRows: false,
  }),
  "empty",
  "hydrate後も行なし → 本当にデータなし",
);

assert.equal(
  resolveMuseumBoardDataStatus({
    mounted: true,
    cloudReady: false,
    hasRows: true,
  }),
  "ready",
  "ローカル行があれば hydrate 前でも ready",
);

assert.equal(
  resolveMuseumBoardDataStatus({
    mounted: true,
    cloudReady: true,
    hasRows: true,
  }),
  "ready",
);

assert.equal(
  resolveMuseumBoardDataStatus({
    mounted: true,
    cloudReady: false,
    hasRows: false,
    cloudLoadError: true,
  }),
  "error",
  "読み込み失敗は error",
);

console.log("museumBoardDataStatus.smoke: ok");

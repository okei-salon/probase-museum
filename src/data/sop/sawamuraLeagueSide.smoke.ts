/**
 * 沢村賞の表示先リーグ判定スモーク
 * node --import tsx src/data/sop/sawamuraLeagueSide.smoke.ts
 */
import { resolveSawamuraLeagueSideForDisplay } from "./seasonAwardsView";
import type { SeasonIdentity } from "@/data/seasons";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const blue2027: SeasonIdentity = {
  seasonKey: "2027-BLUE",
  year: 2027,
  world: "BLUE",
  kind: "formal",
};

const red2027: SeasonIdentity = {
  seasonKey: "2027-RED",
  year: 2027,
  world: "RED",
  kind: "formal",
};

// パ所属（日本ハム）→ パ側
assert(
  resolveSawamuraLeagueSideForDisplay(
    {
      teamShort: "日本ハム",
      playerId: "darvish",
      league: "central", // 誤った固定 league があっても球団優先
    },
    blue2027,
  ) === "pacific",
  "Darvish / Nippon-Ham → pacific (ignores wrong league)",
);

// セ所属（阪神）→ セ側
assert(
  resolveSawamuraLeagueSideForDisplay(
    { teamShort: "阪神", playerId: "murakami", league: "pacific" },
    blue2027,
  ) === "central",
  "Hanshin → central (ignores wrong league)",
);

assert(
  resolveSawamuraLeagueSideForDisplay(
    { teamShort: "ヤクルト", playerId: "x" },
    blue2027,
  ) === "central",
  "Yakult → central",
);

assert(
  resolveSawamuraLeagueSideForDisplay(
    { teamShort: "ソフトバンク", playerId: "x" },
    red2027,
  ) === "pacific",
  "SoftBank → pacific",
);

// 別名でも正規化
assert(
  resolveSawamuraLeagueSideForDisplay(
    { teamShort: "北海道日本ハムファイターズ", playerId: "x" },
    blue2027,
  ) === "pacific",
  "full Nippon-Ham name → pacific",
);

// 球団不明時のみ登録 league を使う
assert(
  resolveSawamuraLeagueSideForDisplay(
    { teamShort: "", playerId: "unknown-player", league: "pacific" },
    blue2027,
  ) === "pacific",
  "no team → fall back to registered league",
);

console.log("sawamuraLeagueSide.smoke: ok");

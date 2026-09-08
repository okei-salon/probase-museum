/**
 * AWARD「該当なし」「未定」パースのスモーク
 * node --import tsx src/lib/import/partnerPaste/awardOutcome.smoke.ts
 */
import { parseAwardPartner } from "./parsers";
import { AWARD_NONE_PLAYER_ID } from "./awardOutcome";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const nonePaste = `YEAR=2026
TYPE=AWARD

MVP_CL=佐藤輝明|阪神
MVP_PL=万波中正|日本ハム
ROOKIE_CL=該当なし
ROOKIE_PL=該当なし
SAWAMURA=該当なし`;

const noneResult = parseAwardPartner(nonePaste, 2026);
assert(noneResult.slots.length === 5, "5 slots");
const rookCl = noneResult.slots.find((s) => s.key === "ROOKIE_CL");
assert(rookCl?.outcome === "none", "rookie none");
assert(rookCl?.status === "matched", "rookie matched");
assert(rookCl?.playerId === AWARD_NONE_PLAYER_ID, "rookie sentinel");
assert(rookCl?.teamShort === "", "no team required");
const saw = noneResult.slots.find((s) => s.key === "SAWAMURA");
assert(saw?.outcome === "none" && saw.status === "matched", "sawamura none");

const pendingPaste = `YEAR=2026
TYPE=AWARD
ROOKIE_CL=未定
SAWAMURA=未定`;
const pending = parseAwardPartner(pendingPaste, 2026);
assert(
  pending.slots.every((s) => s.outcome === "pending" && s.status === "matched"),
  "pending matched",
);
assert(
  pending.slots.every((s) => s.playerId == null),
  "pending no playerId",
);

const winnerPaste = `YEAR=2026
TYPE=AWARD
SAWAMURA=村上頌樹|阪神`;
const winner = parseAwardPartner(winnerPaste, 2026);
assert(winner.slots[0]?.outcome === "winner", "winner outcome");
assert(winner.slots[0]?.name.includes("村上") || winner.slots[0]?.name === "村上頌樹", "winner name");

console.log("awardOutcome.smoke: ok");

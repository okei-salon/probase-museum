/**
 * 打率系表示は先頭0を落とす（.424）
 * npx tsx src/data/playerStats.format.smoke.ts
 */

import assert from "node:assert/strict";
import { formatPlayerStatValue } from "./playerStats";
import { formatAvgDot } from "./seasonAchievements/detectSeason";

assert.equal(formatPlayerStatValue("rispAvg", 0.424), ".424");
assert.equal(formatPlayerStatValue("avg", 0.312), ".312");
assert.equal(formatPlayerStatValue("obp", 0.4), ".400");
assert.equal(formatPlayerStatValue("ops", 1.024), "1.024");
assert.equal(formatPlayerStatValue("winPct", 0.616), ".616");
assert.equal(formatAvgDot(0.424), ".424");
assert.equal(formatAvgDot(0.4), ".400");

console.log("playerStats.format.smoke.ts: ok");

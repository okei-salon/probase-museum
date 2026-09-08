/**
 * BATTER / CATCHER 共存マージのスモーク（推測復元なし）
 * npx tsx src/data/playerSeasonLines/batterCatcherMerge.smoke.ts
 */

import {
  applyCatcherCsToCounting,
  mergeBatterCountingPreserveCatcherCs,
  isZeroedBatterOffense,
} from "./batterCatcherMerge";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const existing = {
  ab: 400,
  h: 120,
  doubles: 20,
  triples: 2,
  hr: 15,
  rbi: 60,
  bb: 40,
  pa: 450,
  sb: 5,
  csAttempted: 80,
  csAllowed: 50,
  csCaught: 30,
};

const afterCatcher = applyCatcherCsToCounting(existing, {
  csAttempted: 90,
  csAllowed: 55,
  csCaught: 35,
});
assert(afterCatcher.ab === 400, "catcher must keep ab");
assert(afterCatcher.h === 120, "catcher must keep h");
assert(afterCatcher.hr === 15, "catcher must keep hr");
assert(afterCatcher.rbi === 60, "catcher must keep rbi");
assert(afterCatcher.csAttempted === 90, "catcher updates csAttempted");
assert(afterCatcher.csCaught === 35, "catcher updates csCaught");

const catcherMissingCs = applyCatcherCsToCounting(existing, {
  csAttempted: null,
  csAllowed: null,
  csCaught: 40,
});
assert(catcherMissingCs.csAttempted === 80, "null cs must not wipe existing");
assert(catcherMissingCs.csCaught === 40, "provided csCaught updates");
assert(catcherMissingCs.ab === 400, "offense intact");

const shell = applyCatcherCsToCounting(null, {
  csAttempted: 10,
  csAllowed: 6,
  csCaught: 4,
});
assert(shell.ab === 0 && shell.h === 0, "new shell may start empty");
assert(shell.csAttempted === 10, "shell has cs");

const batterIncoming = {
  ab: 410,
  h: 125,
  doubles: 21,
  triples: 2,
  hr: 16,
  rbi: 62,
  bb: 41,
  pa: 460,
  csAttempted: null as number | null,
  csAllowed: null as number | null,
  csCaught: null as number | null,
};
const afterBatter = mergeBatterCountingPreserveCatcherCs(
  batterIncoming,
  afterCatcher,
);
assert(afterBatter.ab === 410, "batter updates ab");
assert(afterBatter.csAttempted === 90, "batter keeps catcher cs");
assert(afterBatter.csCaught === 35, "batter keeps catcher csCaught");

assert(isZeroedBatterOffense({ ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, pa: 0 }), "zeroed");
assert(!isZeroedBatterOffense(existing), "not zeroed");

console.log("batterCatcherMerge.smoke: ok");

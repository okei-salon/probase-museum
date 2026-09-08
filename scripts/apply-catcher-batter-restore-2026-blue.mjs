#!/usr/bin/env node
/**
 * Apply verified 2026 BLUE catcher batting restore via existing Museum docs API.
 * Preserves CS fields on existing rows. Does not touch other years/worlds.
 *
 * Usage:
 *   PBM_BASE_URL=https://probase-museum.vercel.app node scripts/apply-catcher-batter-restore-2026-blue.mjs
 *
 * Reads access code from PBM_ACCESS_CODE or .env.local
 * Requires src/data/playerSeasonLines/restores/catcherBatterRestorePlans2026Blue.json (generated from user paste)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadAccessCode() {
  if (process.env.PBM_ACCESS_CODE) return process.env.PBM_ACCESS_CODE;
  try {
    const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const m = env.match(/^PBM_ACCESS_CODE=(.*)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

function computeDerived(c) {
  const ab = c.ab ?? 0;
  const h = c.h ?? 0;
  const doubles = c.doubles ?? 0;
  const triples = c.triples ?? 0;
  const hr = c.hr ?? 0;
  const bb = c.bb ?? 0;
  const hbp = c.hbp ?? 0;
  const sf = c.sf ?? 0;
  const singles = c.singles ?? Math.max(0, h - doubles - triples - hr);
  const tb = c.tb ?? singles + 2 * doubles + 3 * triples + 4 * hr;
  const pa = c.pa ?? ab + bb + hbp + (c.sac ?? 0) + sf;
  const avg = ab > 0 ? h / ab : null;
  const slg = ab > 0 ? tb / ab : null;
  const obpDen = ab + bb + hbp + sf;
  const obp = obpDen > 0 ? (h + bb + hbp) / obpDen : null;
  const ops = avg != null && slg != null && obp != null ? obp + slg : null;
  const csAtt = c.csAttempted ?? null;
  const csCaught = c.csCaught ?? null;
  const csRate =
    csAtt != null && csAtt > 0 && csCaught != null ? csCaught / csAtt : null;
  return {
    avg,
    obp,
    slg,
    ops,
    tb,
    singles,
    hrRate: ab > 0 && hr > 0 ? ab / hr : null,
    soRate: pa > 0 && c.so != null ? c.so / pa : null,
    sbRate: null,
    rispAvg:
      c.rispAb > 0 && c.rispH != null ? c.rispH / c.rispAb : null,
    csRate,
    pa,
  };
}

const base = (process.env.PBM_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const code = loadAccessCode();
if (!code) {
  console.error("PBM_ACCESS_CODE missing");
  process.exit(1);
}

const plans = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "src/data/playerSeasonLines/restores/catcherBatterRestorePlans2026Blue.json"),
    "utf8",
  ),
);

const jar = new Map();
function storeCookies(res) {
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

const loginRes = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ accessCode: code }),
});
storeCookies(loginRes);
const loginJson = await loginRes.json().catch(() => ({}));
if (!loginRes.ok || !loginJson.ok) {
  console.error("login failed", loginRes.status, loginJson);
  process.exit(1);
}

const results = [];
for (const plan of plans) {
  const id = `${plan.playerId}:BLUE:2026:batter:pennant`;
  const getRes = await fetch(
    `${base}/api/museum/docs/season_lines/${encodeURIComponent(id)}`,
    { headers: { cookie: cookieHeader() } },
  );
  let existing = null;
  if (getRes.ok) {
    const g = await getRes.json();
    existing = g.record || null;
    if (typeof existing === "string") {
      try {
        existing = JSON.parse(existing);
      } catch {
        existing = null;
      }
    }
  } else if (getRes.status !== 404) {
    results.push({ id, status: "get_error", code: getRes.status });
    continue;
  }

  const prev = existing?.counting || {};
  const counting = {
    ...plan.counting,
    csAttempted: plan.counting.csAttempted ?? prev.csAttempted ?? null,
    csAllowed: plan.counting.csAllowed ?? prev.csAllowed ?? null,
    csCaught: plan.counting.csCaught ?? prev.csCaught ?? null,
  };
  const now = new Date().toISOString();
  const line = {
    id,
    playerId: plan.playerId,
    playerName: plan.fullName,
    year: 2026,
    world: "BLUE",
    teamId: existing?.teamId || plan.teamId,
    teamName: existing?.teamName || plan.teamName,
    scope: "pennant",
    role: "batter",
    source: existing?.source || "ocr",
    counting,
    derived: computeDerived(counting),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const putRes = await fetch(
    `${base}/api/museum/docs/season_lines/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(),
      },
      body: JSON.stringify(line),
    },
  );
  const putJson = await putRes.json().catch(() => ({}));
  results.push({
    name: plan.fullName,
    id,
    status: putRes.ok && putJson.ok ? "ok" : "fail",
    http: putRes.status,
    ab: counting.ab,
    h: counting.h,
    hr: counting.hr,
    preservedCs:
      prev.csAttempted != null ||
      prev.csAllowed != null ||
      prev.csCaught != null,
    error: putJson.error,
  });
}

const ok = results.filter((r) => r.status === "ok");
const fail = results.filter((r) => r.status !== "ok");
console.log(
  JSON.stringify(
    { base, restored: ok.length, failed: fail.length, ok, fail },
    null,
    2,
  ),
);
if (fail.length) process.exit(1);

/**
 * OCRが崩れた氏名向け: 切り出しから推定した文字数でロスターを絞り候補提示。
 */

import {
  getPlayerAffiliationsByPlayer,
  listPlayerMasters,
  normalizeTeamId,
} from "@/data/playerMaster";
import { splitDarkGlyphs, trimNameCanvas } from "@/lib/import/fieldPreprocess";

export type ImageNameMatch = {
  label: string;
  playerId: string;
  score: number;
};

function estimateGlyphCount(
  crop: HTMLCanvasElement,
  role: "pitcher" | "batter",
): number {
  const trimmed = trimNameCanvas(crop);
  const glyphs = splitDarkGlyphs(trimmed);
  if (glyphs.length >= 2) {
    const areas = glyphs.map((g) => g.width * g.height);
    const median =
      [...areas].sort((a, b) => a - b)[Math.floor(areas.length / 2)] || 0;
    const filtered = glyphs.filter((g) => g.width * g.height >= median * 0.5);
    if (filtered.length === 2 || filtered.length === 3) return filtered.length;
    if (filtered.length > 3) {
      // 大きいもの上位2〜3
      return role === "pitcher" ? 2 : 3;
    }
  }
  // 役割の典型: 投手は名字2文字、野手は「姓+名1字」の3文字表示が多い
  return role === "pitcher" ? 2 : 3;
}

export function matchNameByRosterImage(input: {
  crop: HTMLCanvasElement;
  team: string;
  year: number;
  role: "pitcher" | "batter";
  ocrHint?: string;
}): ImageNameMatch[] {
  const teamId = normalizeTeamId(input.team);
  if (!teamId) return [];

  // 月間MVP表の投手名は名字2文字が基本
  const glyphCount =
    input.role === "pitcher" ? 2 : estimateGlyphCount(input.crop, input.role);
  const ocrKanji = (input.ocrHint || "").match(/[\u3400-\u9fff]/g) || [];

  const pool = listPlayerMasters().filter((p) => {
    const affOk = getPlayerAffiliationsByPlayer(p.playerId).some(
      (a) => a.year === input.year && a.teamId === teamId,
    );
    if (!affOk) return false;
    if (input.role === "pitcher") return p.position === "投手";
    return p.position !== "投手";
  });

  const scored: ImageNameMatch[] = pool.map((p) => {
    const full = p.fullName.replace(/\s/g, "");
    const display = p.gameDisplayName.replace(/\s/g, "");
    let score = 0.15;
    if (glyphCount === 2 && display.length === 2) score += 0.5;
    if (glyphCount === 3 && full.length >= 3 && full.length <= 4) score += 0.45;
    if (glyphCount === 3 && display.length === 2) score += 0.12;
    if (input.role === "pitcher" && display.length === 2) score += 0.15;
    const hint = ocrKanji.join("");
    if (hint.length >= 2) {
      if (full.startsWith(hint) || display === hint) score += 0.5;
      else if (full.includes(hint.slice(0, 2))) score += 0.2;
    }
    return { label: p.fullName, playerId: p.playerId, score };
  });

  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "ja"));

  // 投手: 名字2文字を五十音順で広めに提示（確認UIで村上などを選択可能）
  if (input.role === "pitcher") {
    const twoChar = scored
      .filter((c) => {
        const p = pool.find((x) => x.playerId === c.playerId);
        return (p?.gameDisplayName.replace(/\s/g, "").length ?? 0) === 2;
      })
      .sort((a, b) => {
        const da =
          pool.find((x) => x.playerId === a.playerId)?.gameDisplayName ?? "";
        const db =
          pool.find((x) => x.playerId === b.playerId)?.gameDisplayName ?? "";
        return da.localeCompare(db, "ja");
      });
    console.info(
      "[name-roster]",
      input.role,
      input.team,
      "glyphs",
      glyphCount,
      twoChar.map((c) => c.label).join(","),
    );
    return twoChar; // 阪神投手名字は数十名規模。確認UIで選択できるよう全件返す
  }

  const merged: ImageNameMatch[] = [];
  const seen = new Set<string>();
  for (const c of scored) {
    if (seen.has(c.playerId)) continue;
    seen.add(c.playerId);
    merged.push(c);
    if (merged.length >= 10) break;
  }

  console.info(
    "[name-roster]",
    input.role,
    input.team,
    "glyphs",
    glyphCount,
    merged.slice(0, 5).map((c) => c.label).join(","),
  );
  return merged;
}

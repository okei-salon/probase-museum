import type {
  FieldCellStatus,
  SeasonBatchFieldKey,
  SeasonBatchParseResult,
  SeasonBatchPartialRow,
  SeasonBatchRole,
} from "@/data/import/seasonBatchTypes";
import { DEMO_IMPORT_YEAR } from "@/data/import/demoMode";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import { normalizeOcrText } from "@/lib/import/ocr";
import { resolveRankingPlayer } from "@/lib/import/resolveRankingPlayer";
import { fieldKind } from "@/lib/import/layouts/seasonBattingRanking";
import {
  normalizeAvgInput,
  normalizeEraInput,
  normalizeIntegerInput,
  normalizeIpInput,
} from "@/lib/manualEntry/normalizeInput";

/** 画面ヘッダ文言 → フィールドキー */
const HEADER_ALIASES: Array<{ keys: string[]; field: SeasonBatchFieldKey; kind: "int" | "avg" | "era" | "ip" | "rate" }> = [
  { keys: ["打率"], field: "avg", kind: "avg" },
  { keys: ["試合", "試合数"], field: "g", kind: "int" },
  { keys: ["打席"], field: "pa", kind: "int" },
  { keys: ["打数"], field: "ab", kind: "int" },
  { keys: ["安打"], field: "h", kind: "int" },
  { keys: ["単打"], field: "singles", kind: "int" },
  { keys: ["二塁打", "２塁打", "2塁打"], field: "doubles", kind: "int" },
  { keys: ["三塁打", "３塁打", "3塁打"], field: "triples", kind: "int" },
  { keys: ["本塁打", "本塁"], field: "hr", kind: "int" },
  { keys: ["本打率"], field: "hrRate", kind: "avg" },
  { keys: ["塁打"], field: "tb", kind: "int" },
  { keys: ["長打率"], field: "slg", kind: "avg" },
  { keys: ["打点"], field: "rbi", kind: "int" },
  { keys: ["出塁率"], field: "obp", kind: "avg" },
  { keys: ["OPS", "ＯＰＳ"], field: "ops", kind: "rate" },
  { keys: ["得点"], field: "r", kind: "int" },
  { keys: ["盗塁"], field: "sb", kind: "int" },
  { keys: ["盗塁企図", "盗塁企"], field: "sba", kind: "int" },
  { keys: ["犠打"], field: "sac", kind: "int" },
  { keys: ["犠飛"], field: "sf", kind: "int" },
  { keys: ["四球"], field: "bb", kind: "int" },
  { keys: ["死球"], field: "hbp", kind: "int" },
  { keys: ["三振"], field: "so", kind: "int" },
  { keys: ["圏打", "得点圏打数"], field: "rispAb", kind: "int" },
  { keys: ["圏安", "得点圏安打"], field: "rispH", kind: "int" },
  { keys: ["満塁打席", "満打席"], field: "basesLoadedPa", kind: "int" },
  { keys: ["満塁安打", "満安"], field: "basesLoadedH", kind: "int" },
  { keys: ["連続安", "連安"], field: "hitStreak", kind: "int" },
  { keys: ["連試出"], field: "onBaseStreak", kind: "int" },
  { keys: ["猛打賞"], field: "multiHit", kind: "int" },
  { keys: ["被盗企", "被盗塁企図", "盗塁企図数"], field: "csAttempted", kind: "int" },
  { keys: ["許盗", "許盗塁", "許盗数"], field: "csAllowed", kind: "int" },
  { keys: ["盗塁刺", "刺"], field: "csCaught", kind: "int" },
  { keys: ["阻止率", "盗塁阻止率"], field: "csRate", kind: "avg" },
  { keys: ["防御率"], field: "era", kind: "era" },
  { keys: ["勝", "勝利"], field: "w", kind: "int" },
  { keys: ["敗", "敗戦"], field: "l", kind: "int" },
  { keys: ["セーブ", "ＳＶ", "SV"], field: "sv", kind: "int" },
  { keys: ["HP", "ＨＰ"], field: "hp", kind: "int" },
  { keys: ["ホールド", "ＨＬＤ", "HLD"], field: "hld", kind: "int" },
  { keys: ["完投"], field: "cg", kind: "int" },
  { keys: ["完封"], field: "sho", kind: "int" },
  { keys: ["投球回", "回"], field: "ip", kind: "ip" },
  { keys: ["自責点", "自責"], field: "er", kind: "int" },
  { keys: ["失点"], field: "r", kind: "int" },
  { keys: ["奪三振率"], field: "soRate", kind: "rate" },
  { keys: ["奪三振"], field: "so", kind: "int" },
  { keys: ["被安打"], field: "h", kind: "int" },
  { keys: ["被本塁打率"], field: "hrRate", kind: "rate" },
  { keys: ["被本塁打", "被本"], field: "hr", kind: "int" },
  { keys: ["与四球"], field: "bb", kind: "int" },
  { keys: ["四球率"], field: "bbRate", kind: "rate" },
  { keys: ["与死球"], field: "hbp", kind: "int" },
  { keys: ["QS率", "ＱＳ率"], field: "qsRate", kind: "rate" },
  { keys: ["QS", "ＱＳ"], field: "qs", kind: "int" },
  { keys: ["HQS率", "ＨＱＳ率"], field: "hqsRate", kind: "rate" },
  { keys: ["HQS", "ＨＱＳ"], field: "hqs", kind: "int" },
  { keys: ["先発"], field: "gs", kind: "int" },
  { keys: ["登板"], field: "g", kind: "int" },
  { keys: ["勝率"], field: "winPct", kind: "avg" },
  { keys: ["K/BB", "Ｋ/ＢＢ"], field: "kbb", kind: "rate" },
  { keys: ["WHIP", "ＷＨＩＰ"], field: "whip", kind: "rate" },
  { keys: ["被盗企", "被盗塁企図"], field: "sbAtt", kind: "int" },
  { keys: ["許盗数", "許盗"], field: "sbAllowed", kind: "int" },
  { keys: ["許盗率"], field: "sbAllowedRate", kind: "avg" },
  { keys: ["暴投"], field: "wp", kind: "int" },
];

const TEAM_SHORTS = [
  "阪神",
  "巨人",
  "広島",
  "DeNA",
  "ヤクルト",
  "中日",
  "オリックス",
  "ソフトバンク",
  "ロッテ",
  "日本ハム",
  "西武",
  "楽天",
];

function detectHeaders(line: string): {
  fields: SeasonBatchFieldKey[];
  labels: string[];
} {
  const compact = line.replace(/\s+/g, "");
  const found: Array<{ field: SeasonBatchFieldKey; label: string; at: number }> =
    [];
  for (const alias of HEADER_ALIASES) {
    for (const key of alias.keys) {
      const at = compact.indexOf(key);
      if (at >= 0 && !found.some((f) => f.field === alias.field)) {
        found.push({ field: alias.field, label: key, at });
      }
    }
  }
  found.sort((a, b) => a.at - b.at);
  return {
    fields: found.map((f) => f.field),
    labels: found.map((f) => f.label),
  };
}

function kindForField(field: SeasonBatchFieldKey): "int" | "avg" | "era" | "ip" | "rate" {
  return fieldKind(field);
}

/**
 * OCRで小数点が落ちた率・投球回を要確認にする。
 * 例: .875→875, 1.000→1000, 54⅔→543
 */
export function parseStatToken(
  raw: string,
  field: SeasonBatchFieldKey,
): {
  value: number | string | null;
  display: string;
  status: FieldCellStatus;
  note?: string;
} {
  const cleaned = raw.trim();
  if (!cleaned || cleaned === "-" || cleaned === "—") {
    return { value: null, display: "", status: "empty" };
  }

  const kind = kindForField(field);

  // ⅔ 記号などが数字に潰れた投球回: 543 → 54.1 の疑い
  if (kind === "ip") {
    if (/^\d{3,4}$/.test(cleaned) && !cleaned.includes(".")) {
      const asInt = Number(cleaned);
      // 末尾が 1 or 2 なら .1/.2 解釈を提案
      const last = cleaned.slice(-1);
      if (last === "1" || last === "2") {
        const whole = cleaned.slice(0, -1);
        const guess = `${whole}.${last}`;
        const n = normalizeIpInput(guess);
        return {
          value: n.value,
          display: n.text || guess,
          status: "needs_confirm",
          note: `${cleaned} を投球回 ${guess} と解釈しました（⅔誤認識の可能性）`,
        };
      }
      return {
        value: asInt,
        display: cleaned,
        status: "needs_confirm",
        note: "投球回の小数点が欠落している可能性があります",
      };
    }
    const n = normalizeIpInput(cleaned);
    return {
      value: n.value,
      display: n.text || cleaned,
      status: n.confidence === "high" ? "ok" : n.confidence === "needs_confirm" ? "needs_confirm" : "invalid",
      note: n.note,
    };
  }

  if (kind === "avg" || kind === "rate") {
    // 小数点欠落: 875 → .875 / 1000 → 1.000 / 1397 → 1.397
    if (/^\d{3,4}$/.test(cleaned) && !cleaned.includes(".")) {
      if (cleaned.length === 3) {
        const n = normalizeAvgInput(cleaned);
        return {
          value: n.value,
          display: n.text || cleaned,
          status: "needs_confirm",
          note: `${cleaned} を ${n.text} と解釈（小数点欠落の可能性）`,
        };
      }
      if (cleaned.length === 4) {
        const n = Number(cleaned) / 1000;
        if (n >= 0 && n <= 2) {
          const display = n >= 1 ? n.toFixed(3) : `.${cleaned.slice(1)}`;
          return {
            value: n,
            display: n >= 1 ? n.toFixed(3) : display.startsWith(".") ? display : `.${cleaned}`,
            status: "needs_confirm",
            note: `${cleaned} を ${n.toFixed(3)} と解釈（小数点欠落の可能性）`,
          };
        }
      }
    }
    if (kind === "avg") {
      const n = normalizeAvgInput(cleaned);
      return {
        value: n.value,
        display: n.text || cleaned,
        status:
          n.confidence === "high"
            ? "ok"
            : n.confidence === "needs_confirm"
              ? "needs_confirm"
              : "invalid",
        note: n.note,
      };
    }
    // OPS / WHIP
    const d = cleaned.replace(/[^\d.]/g, "");
    const n = Number(d.startsWith(".") ? `0${d}` : d);
    if (!Number.isFinite(n)) {
      return { value: null, display: cleaned, status: "invalid", note: "数値として読めません" };
    }
    if (!cleaned.includes(".") && /^\d{3,4}$/.test(cleaned)) {
      return {
        value: n / 1000,
        display: (n / 1000).toFixed(3),
        status: "needs_confirm",
        note: "小数点欠落の可能性",
      };
    }
    return { value: n, display: cleaned, status: n > 3 && field === "ops" ? "needs_confirm" : "ok" };
  }

  if (kind === "era") {
    if (/^\d{3}$/.test(cleaned) && !cleaned.includes(".")) {
      const n = normalizeEraInput(cleaned);
      return {
        value: n.value,
        display: n.text || cleaned,
        status: "needs_confirm",
        note: `${cleaned} を ${n.text} と解釈（小数点欠落の可能性）`,
      };
    }
    const n = normalizeEraInput(cleaned);
    return {
      value: n.value,
      display: n.text || cleaned,
      status:
        n.confidence === "high"
          ? "ok"
          : n.confidence === "needs_confirm"
            ? "needs_confirm"
            : "invalid",
      note: n.note,
    };
  }

  const n = normalizeIntegerInput(cleaned);
  // 率が整数に見えたケース（875 を試合数扱いなど）は呼び出し側ヘッダ依存
  if (n.confidence === "high" && n.value != null && n.value >= 100 && (field === "avg" || field === "obp" || field === "slg")) {
    return {
      value: n.value / 1000,
      display: `.${String(n.value).padStart(3, "0")}`,
      status: "needs_confirm",
      note: "率の小数点欠落の可能性",
    };
  }
  return {
    value: n.value,
    display: n.text || cleaned,
    status:
      n.confidence === "high"
        ? "ok"
        : n.confidence === "needs_confirm"
          ? "needs_confirm"
          : "invalid",
    note: n.note,
  };
}

function extractTeamAndName(line: string): { name: string; team: string; rest: string } {
  const compact = line.trim();
  for (const team of TEAM_SHORTS) {
    const idx = compact.indexOf(team);
    if (idx >= 0) {
      const before = compact.slice(0, idx).replace(/^[\d.\s順位位]+/, "").trim();
      const after = compact.slice(idx + team.length).trim();
      // 名前が前にあるパターンが主
      if (before.length >= 1) {
        return {
          name: before.replace(/\s+/g, ""),
          team: normalizeTeamShort(team),
          rest: after,
        };
      }
      // 球団が先
      const m = after.match(/^([^\d.\s]{1,8})\s*(.*)$/);
      if (m) {
        return {
          name: m[1]!.replace(/\s+/g, ""),
          team: normalizeTeamShort(team),
          rest: m[2] ?? "",
        };
      }
    }
  }
  // フォールバック: 先頭の漢字かたまりを名前に
  const m = compact.match(/^[\d.\s順位位]*([一-龥ぁ-んァ-ヶー]{1,8})\s*(.*)$/);
  if (m) {
    return { name: m[1]!, team: "", rest: m[2] ?? "" };
  }
  return { name: "", team: "", rest: compact };
}

function tokenizeNumbers(rest: string): string[] {
  return (rest.match(/(\d+\.\d+|\.\d+|\d+)/g) ?? []).slice(0, 20);
}

/**
 * プロスピ個人成績ランキング画面のOCRテキストをベストエフォートで行分解する。
 * ヘッダ行から項目順を推定し、各行の数値を割り当てる。
 */
export function parseSeasonRankingOcrText(
  rawText: string,
  role: SeasonBatchRole,
  fallbackYear: number,
): SeasonBatchParseResult {
  const text = normalizeOcrText(rawText);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let yearHint: number | null = null;
  const yearM = text.match(/(20\d{2})\s*年?/);
  if (yearM) yearHint = Number(yearM[1]);

  let headers: SeasonBatchFieldKey[] = [];
  let headerLabels: string[] = [];
  for (const line of lines) {
    const det = detectHeaders(line);
    if (det.fields.length >= 3) {
      headers = det.fields;
      headerLabels = det.labels;
      break;
    }
  }

  // ロール別デフォルト列（ヘッダ未検出時）
  if (headers.length === 0) {
    if (role === "pitcher") {
      headers = ["era", "g", "w", "l", "sv", "ip", "er", "so", "h", "bb"];
      headerLabels = ["防御率", "登板", "勝", "敗", "セーブ", "投球回", "自責", "奪三振", "被安打", "与四球"];
    } else if (role === "catcher") {
      headers = ["csAttempted", "csAllowed", "csCaught", "csRate", "g"];
      headerLabels = ["被盗企", "許盗", "盗塁刺", "阻止率", "試合"];
    } else {
      headers = ["avg", "g", "pa", "ab", "h", "doubles", "triples", "hr", "rbi", "r", "sb", "obp", "ops"];
      headerLabels = ["打率", "試合", "打席", "打数", "安打", "二塁打", "三塁打", "本塁打", "打点", "得点", "盗塁", "出塁率", "OPS"];
    }
  }

  const rows: SeasonBatchPartialRow[] = [];
  let rowIndex = 0;

  for (const line of lines) {
    if (detectHeaders(line).fields.length >= 3) continue;
    if (/月間|MVP|部門|ランキング|順位表/.test(line) && !TEAM_SHORTS.some((t) => line.includes(t))) {
      continue;
    }

    const { name, team, rest } = extractTeamAndName(line);
    if (!name && !team) continue;
    // ヘッダっぽい行を除外
    if (/打率|防御率|打席|投球回/.test(name) && name.length <= 4) continue;

    const nums = tokenizeNumbers(rest);
    if (nums.length === 0 && !name) continue;
    if (!name && nums.length < 2) continue;

    const fields: SeasonBatchPartialRow["fields"] = {};
    const useHeaders = headers.slice(0, Math.max(nums.length, headers.length));
    for (let i = 0; i < Math.min(nums.length, useHeaders.length); i += 1) {
      const field = useHeaders[i]!;
      const token = nums[i]!;
      const parsed = parseStatToken(token, field);
      fields[field] = {
        raw: parsed.display || token,
        value: parsed.value,
        status: parsed.status,
        note: parsed.note,
      };
    }

    if (!name && Object.keys(fields).length === 0) continue;

    const matchYear = yearHint ?? fallbackYear;
    const affiliationYear =
      matchYear === DEMO_IMPORT_YEAR ? 2026 : matchYear;
    const resolved = resolveRankingPlayer({
      ocrName: name,
      teamShort: team,
      year: affiliationYear,
      role,
    });

    rows.push({
      rowIndex,
      playerName:
        resolved.displayName || name || `選手${rowIndex + 1}`,
      ocrName: name || resolved.ocrName,
      teamShort: resolved.teamShort || team,
      playerId: resolved.playerId,
      nameStatus: resolved.status === "matched" ? "ok" : "needs_confirm",
      teamStatus:
        resolved.teamShort || team ? "ok" : "needs_confirm",
      nameCandidates: resolved.candidates.map((c) => ({
        playerId: c.playerId,
        label: c.label,
        teamShort: c.teamShort,
        score: c.score,
      })),
      fields,
    });
    rowIndex += 1;
    if (rows.length >= 10) break;
  }

  return {
    yearHint: yearHint ?? fallbackYear,
    headers,
    headerLabels,
    rows,
    rawText: text,
    confidence: rows.length >= 5 ? 70 : rows.length >= 1 ? 45 : 20,
  };
}

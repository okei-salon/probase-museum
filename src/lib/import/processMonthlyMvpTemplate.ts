import type { LeagueSide } from "@/data/awards";
import type { MonthlyMvpImportDraft } from "@/data/import/types";
import {
  getPlayerAffiliationsByPlayer,
  getPlayerMaster,
  resolveTeamName,
} from "@/data/playerMaster";
import type { PlayerRef } from "@/data/playerMaster/types";
import { UNKNOWN_PLAYER_STATUS } from "@/data/playerMaster/types";
import { createUnknownPlayerRef } from "@/lib/playerMaster/match";
import { npbTeams } from "@/data/teams";
import { correctFieldByMode } from "@/lib/import/correctField";
import { recognizeLayoutFields } from "@/lib/import/fieldOcr";
import { MonthlyMvpLayoutTemplate } from "@/lib/import/layouts/monthlyMvp";
import type { FieldOcrDebug } from "@/lib/import/layouts/types";
import {
  canvasToPngBlob,
  cropNormalizedField,
  drawLayoutOverlay,
  normalizeGameScreen,
} from "@/lib/import/normalizeGameScreen";
import {
  checkMonthlyKeywords,
  emptyPipelineDebug,
  type FieldCoverage,
  type ImportPipelineDebug,
} from "@/lib/import/pipelineDebug";
import { resolvePlayerWithCandidates } from "@/lib/import/resolvePlayerCandidates";
import { matchNameByRosterImage } from "@/lib/import/matchNameByImage";
import {
  reconcileTeamPair,
  reconcileTeamWithMaster,
  recognizeTeamLogo,
  type TeamLogoMatch,
} from "@/lib/import/teamLogo";

export type TemplateProcessResult = {
  draft: MonthlyMvpImportDraft;
  debug: ImportPipelineDebug;
  fieldDebug: FieldOcrDebug[];
  normalizedPreviewUrl: string;
  message?: string;
};

function asNumber(v: string | number | null): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asString(v: string | number | null): string {
  if (v == null) return "";
  return String(v);
}

function buildCoverage(draft: MonthlyMvpImportDraft): {
  got: FieldCoverage[];
  missing: FieldCoverage[];
} {
  const rows: FieldCoverage[] = [
    { key: "year", label: "年", got: !!draft.year, value: String(draft.year || "") },
    { key: "month", label: "月", got: draft.month >= 4, value: draft.month ? `${draft.month}月` : "" },
    {
      key: "pitcher_name",
      label: "投手名",
      got: !!draft.pitcher.gameDisplayName,
      value: draft.pitcher.gameDisplayName,
    },
    {
      key: "pitcher_team",
      label: "投手球団",
      got: !!draft.pitcher.teamName,
      value: draft.pitcher.teamName,
    },
    {
      key: "pitcher_era",
      label: "防御率",
      got: draft.pitcher.era != null,
      value: draft.pitcher.era != null ? String(draft.pitcher.era) : "",
    },
    {
      key: "pitcher_wl",
      label: "勝敗",
      got: draft.pitcher.wins != null && draft.pitcher.losses != null,
      value:
        draft.pitcher.wins != null && draft.pitcher.losses != null
          ? `${draft.pitcher.wins}勝${draft.pitcher.losses}敗`
          : "",
    },
    {
      key: "pitcher_match",
      label: "投手照合",
      got: draft.pitcher.playerRef.status !== UNKNOWN_PLAYER_STATUS,
      value: draft.pitcher.resolvedName,
    },
    {
      key: "batter_name",
      label: "野手名",
      got: !!draft.batter.gameDisplayName,
      value: draft.batter.gameDisplayName,
    },
    {
      key: "batter_team",
      label: "野手球団",
      got: !!draft.batter.teamName,
      value: draft.batter.teamName,
    },
    {
      key: "batter_avg",
      label: "打率",
      got: draft.batter.avg != null,
      value: draft.batter.avg != null ? String(draft.batter.avg) : "",
    },
    {
      key: "batter_hr",
      label: "本塁打",
      got: draft.batter.hr != null,
      value: draft.batter.hr != null ? String(draft.batter.hr) : "",
    },
    {
      key: "batter_rbi",
      label: "打点",
      got: draft.batter.rbi != null,
      value: draft.batter.rbi != null ? String(draft.batter.rbi) : "",
    },
    {
      key: "batter_sb",
      label: "盗塁",
      got: draft.batter.sb != null,
      value: draft.batter.sb != null ? String(draft.batter.sb) : "",
    },
    {
      key: "batter_match",
      label: "野手照合",
      got: draft.batter.playerRef.status !== UNKNOWN_PLAYER_STATUS,
      value: draft.batter.resolvedName,
    },
  ];
  return {
    got: rows.filter((r) => r.got && r.value !== ""),
    missing: rows.filter((r) => !r.got || r.value === ""),
  };
}

/**
 * 月間MVP: 正規化キャンバス + 固定レイアウト項目別OCR。
 * 画面全体OCRは主処理にしない。
 */
export async function processMonthlyMvpByTemplate(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<TemplateProcessResult> {
  const debug = emptyPipelineDebug();
  const template = MonthlyMvpLayoutTemplate;

  onProgress?.(3);
  let normalized;
  try {
    normalized = await normalizeGameScreen(file, {
      width: template.canvasWidth,
      height: template.canvasHeight,
    });
    debug.stages.push({
      id: "load_image",
      label: "① 画像ファイルの読み込み",
      status: "ok",
      detail: `${file.name} / ${(file.size / 1024).toFixed(0)}KB`,
    });
    debug.stages.push({
      id: "detect_tv",
      label: "② TV画面領域の検出",
      status: normalized.tvDetected ? "ok" : "warn",
      detail: normalized.tvDetected
        ? `検出 ${normalized.sourceRect.w}×${normalized.sourceRect.h}`
        : "未検出のため中央クロップで正規化",
      data: { ...normalized.sourceRect },
    });
    debug.stages.push({
      id: "deskew",
      label: "③ 台形・傾き補正〜正規化",
      status: "ok",
      detail: `${template.canvasWidth}×${template.canvasHeight} 基準キャンバスへ変換`,
    });
  } catch (e) {
    debug.stages.push({
      id: "load_image",
      label: "① 画像ファイルの読み込み",
      status: "fail",
      detail: e instanceof Error ? e.message : "失敗",
    });
    debug.firstFailureId = "load_image";
    const draft = emptyDraft();
    return {
      draft,
      debug,
      fieldDebug: [],
      normalizedPreviewUrl: "",
      message: "画像正規化に失敗しました。確認画面で手入力できます。",
    };
  }

  onProgress?.(12);
  debug.stages.push({
    id: "detect_table",
    label: "④ 月間MVP固定レイアウト適用",
    status: "ok",
    detail: `テンプレート ${template.id} / 項目数 ${template.fields.length}`,
  });

  const results = await recognizeLayoutFields(
    normalized.canvas,
    template.fields,
    (canvas, field) =>
      cropNormalizedField(canvas, field.rect, field.scale ?? 2, {
        // 球団ロゴは色情報が必要。氏名はグレースケール、数字もコントラスト重視
        grayscale: field.mode !== "japanese_team",
        contrast:
          field.mode === "japanese_team"
            ? 1.15
            : field.mode.startsWith("digits") ||
                field.mode === "year" ||
                field.mode === "month"
              ? 1.75
              : 1.45,
      }),
    (done, total) => {
      onProgress?.(12 + Math.round((done / total) * 70));
    },
  );

  debug.stages.push({
    id: "ocr",
    label: "⑤ 項目別OCR実行",
    status: "ok",
    detail: `${results.length} 項目を個別OCR`,
  });

  const fieldDebug: FieldOcrDebug[] = [];
  const values: Record<string, string | number | null> = {};
  const rawJoined: string[] = [];
  const logoByField = new Map<string, TeamLogoMatch>();
  const cropByField = new Map<string, HTMLCanvasElement>();

  for (const { field, crop, raw } of results) {
    let corrected = correctFieldByMode(field.mode, raw.text, field.id);

    // 球団ロゴ: 切り出しを再特徴量評価（rawのタグと併記）
    if (field.mode === "japanese_team") {
      const logo = recognizeTeamLogo(crop);
      logoByField.set(field.id, logo);
      corrected = correctFieldByMode(
        "japanese_team",
        logo.teamShort ? `[logo:${logo.teamShort}]` : raw.text,
        field.id,
      );
      if (!corrected.candidates.length && logo.candidates.length) {
        corrected = {
          ...corrected,
          candidates: logo.candidates,
        };
      }
    }

    values[field.id] = corrected.value;
    rawJoined.push(`${field.id}:${raw.text}`);
    cropByField.set(field.id, crop);

    const blob = await canvasToPngBlob(crop);
    const cropPreviewUrl = URL.createObjectURL(blob);

    fieldDebug.push({
      fieldId: field.id,
      label: field.label,
      cropPreviewUrl,
      rawText: raw.text,
      correctedText: corrected.text,
      correctedValue: corrected.value,
      finalValue: corrected.value,
      confidence: raw.confidence,
      candidates: corrected.candidates,
      mode: field.mode,
      preprocess: raw.preprocess,
    });
  }

  // 0 や範囲外月が残ると <select> 表示と内部値がズレて登録バリデーションが落ちる
  const yearRaw = asNumber(values.year);
  const monthRaw = asNumber(values.month);
  const year =
    yearRaw != null && yearRaw >= 2000 && yearRaw <= 2099 ? yearRaw : 2026;
  const month =
    monthRaw != null && monthRaw >= 4 && monthRaw <= 9 ? monthRaw : 4;

  // 投手・野手ロゴのペア整合（同一画面で DeNA/阪神 分裂を防ぐ）
  const pitcherLogo =
    logoByField.get("pitcher_team") ??
    ({
      teamShort: asString(values.pitcher_team),
      score: 0.4,
      method: "unmatched",
      candidates: [],
    } satisfies TeamLogoMatch);
  const batterLogo =
    logoByField.get("batter_team") ??
    ({
      teamShort: asString(values.batter_team),
      score: 0.4,
      method: "unmatched",
      candidates: [],
    } satisfies TeamLogoMatch);
  const reconciled = reconcileTeamPair(pitcherLogo, batterLogo);
  let pitcherTeam = reconciled.pitcher;
  let batterTeam = reconciled.batter;

  const pitcherName = asString(values.pitcher_name);
  const batterName = asString(values.batter_name);

  let pitcherMatch = resolvePlayerWithCandidates({
    gameDisplayName: pitcherName,
    team: pitcherTeam,
    year,
    role: "pitcher",
  });
  let batterMatch = resolvePlayerWithCandidates({
    gameDisplayName: batterName,
    team: batterTeam,
    year,
    role: "batter",
  });

  // マスター所属は整合チェック（無条件上書きしない）
  const pitcherMasterTeam = teamShortFromPlayer(
    pitcherMatch.status === "matched" ? pitcherMatch.playerRef : null,
    year,
  );
  const batterMasterTeam = teamShortFromPlayer(
    batterMatch.status === "matched" ? batterMatch.playerRef : null,
    year,
  );
  pitcherTeam = reconcileTeamWithMaster(
    pitcherTeam,
    pitcherMasterTeam,
    pitcherLogo.score,
  ).team;
  batterTeam = reconcileTeamWithMaster(
    batterTeam,
    batterMasterTeam,
    batterLogo.score,
  ).team;

  // 球団が補完/修正されたら再照合
  pitcherMatch = resolvePlayerWithCandidates({
    gameDisplayName: pitcherName,
    team: pitcherTeam,
    year,
    role: "pitcher",
  });
  batterMatch = resolvePlayerWithCandidates({
    gameDisplayName: batterName,
    team: batterTeam,
    year,
    role: "batter",
  });

  // OCR氏名が崩れている場合: 球団ロスターの描画照合で候補を補強（再照合の後）
  const pitcherCrop = cropByField.get("pitcher_name");
  const batterCrop = cropByField.get("batter_name");
  if (pitcherCrop && pitcherTeam) {
    const imgHits = matchNameByRosterImage({
      crop: pitcherCrop,
      team: pitcherTeam,
      year,
      role: "pitcher",
      ocrHint: pitcherName,
    });
    pitcherMatch = mergeImageNameCandidates(pitcherMatch, imgHits, pitcherName);
  }
  if (batterCrop && batterTeam) {
    const imgHits = matchNameByRosterImage({
      crop: batterCrop,
      team: batterTeam,
      year,
      role: "batter",
      ocrHint: batterName,
    });
    batterMatch = mergeImageNameCandidates(batterMatch, imgHits, batterName);
  }

  // 名前候補が強いのに球団だけ空ならマスター所属で埋める
  if (!pitcherTeam && pitcherMatch.status === "matched") {
    pitcherTeam = teamShortFromPlayer(pitcherMatch.playerRef, year);
  }
  if (!batterTeam && batterMatch.status === "matched") {
    batterTeam = teamShortFromPlayer(batterMatch.playerRef, year);
  }

  values.pitcher_team = pitcherTeam || null;
  values.batter_team = batterTeam || null;

  // デバッグへ最終採用値・候補を反映
  for (const fd of fieldDebug) {
    if (fd.fieldId === "pitcher_name") {
      fd.candidates = pitcherMatch.candidates.map((c) => ({
        label: c.label,
        score: c.score,
      }));
      if (pitcherMatch.status === "matched") {
        const display = preferDisplayName(pitcherName, pitcherMatch.playerRef);
        fd.correctedText = pitcherMatch.displayName;
        fd.correctedValue = display;
        fd.finalValue = display;
        values.pitcher_name = display;
      } else {
        const ocrKanji = (pitcherName.match(/[\u3400-\u9fff]/g) || []).join("");
        const broken = ocrKanji.length < 2 || pitcherMatch.candidates.length > 0 && pitcherMatch.status === "ambiguous";
        // OCR崩れ時はゴミ文字列を最終値にせず、候補選択を促す
        if (broken && pitcherMatch.candidates.length) {
          fd.finalValue = null;
          values.pitcher_name = "";
          fd.correctedText = "(候補から選択)";
        } else {
          fd.finalValue = pitcherName || null;
        }
      }
    }
    if (fd.fieldId === "batter_name") {
      fd.candidates = batterMatch.candidates.map((c) => ({
        label: c.label,
        score: c.score,
      }));
      if (batterMatch.status === "matched") {
        const display = preferDisplayName(batterName, batterMatch.playerRef);
        fd.correctedText = batterMatch.displayName;
        fd.correctedValue = display;
        fd.finalValue = display;
        values.batter_name = display;
      } else {
        const ocrKanji = (batterName.match(/[\u3400-\u9fff]/g) || []).join("");
        if (
          (ocrKanji.length < 2 || batterMatch.status === "ambiguous") &&
          batterMatch.candidates.length
        ) {
          fd.finalValue = null;
          values.batter_name = "";
          fd.correctedText = "(候補から選択)";
        } else {
          fd.finalValue = batterName || null;
        }
      }
    }
    if (fd.fieldId === "pitcher_team") {
      fd.finalValue = pitcherTeam || null;
      fd.correctedText = pitcherTeam || fd.correctedText;
      fd.correctedValue = pitcherTeam || null;
      fd.preprocess = `${fd.preprocess || ""}|reconcile:${reconciled.note}`;
      if (pitcherTeam) {
        fd.candidates = [
          { label: pitcherTeam, score: Math.max(0.5, pitcherLogo.score) },
          ...pitcherLogo.candidates.filter((c) => c.label !== pitcherTeam),
        ].slice(0, 3);
      }
    }
    if (fd.fieldId === "batter_team") {
      fd.finalValue = batterTeam || null;
      fd.correctedText = batterTeam || fd.correctedText;
      fd.correctedValue = batterTeam || null;
      fd.preprocess = `${fd.preprocess || ""}|reconcile:${reconciled.note}`;
      if (batterTeam) {
        fd.candidates = [
          { label: batterTeam, score: Math.max(0.5, batterLogo.score) },
          ...batterLogo.candidates.filter((c) => c.label !== batterTeam),
        ].slice(0, 3);
      }
    }
    if (
      ![
        "pitcher_name",
        "batter_name",
        "pitcher_team",
        "batter_team",
      ].includes(fd.fieldId)
    ) {
      fd.finalValue = values[fd.fieldId] ?? fd.correctedValue;
    }
  }

  const league: LeagueSide = "central";
  const draft: MonthlyMvpImportDraft = {
    screenType: "monthly_mvp",
    year,
    month,
    league,
    pitcher: {
      gameDisplayName: asString(values.pitcher_name),
      teamName: pitcherTeam,
      era: asNumber(values.pitcher_era),
      wins: asNumber(values.pitcher_wins),
      losses: asNumber(values.pitcher_losses),
      playerRef: pitcherMatch.playerRef,
      resolvedName: pitcherMatch.displayName,
    },
    batter: {
      gameDisplayName: asString(values.batter_name),
      teamName: batterTeam,
      avg: asNumber(values.batter_avg),
      hr: asNumber(values.batter_hr),
      rbi: asNumber(values.batter_rbi),
      sb: asNumber(values.batter_sb),
      playerRef: batterMatch.playerRef,
      resolvedName: batterMatch.displayName,
    },
    rawText: rawJoined.join("\n"),
    confidence:
      pitcherMatch.status === "matched" &&
      batterMatch.status === "matched" &&
      values.pitcher_era != null &&
      values.batter_avg != null
        ? "high"
        : pitcherName || batterName
          ? "medium"
          : "low",
  };

  const coverage = buildCoverage(draft);
  debug.fieldsGot = coverage.got;
  debug.fieldsMissing = coverage.missing;
  debug.rawText = draft.rawText;
  debug.bestVariantId = template.id;
  const kw = checkMonthlyKeywords(
    fieldDebug.map((f) => `${f.rawText} ${f.correctedText}`).join(" "),
  );
  debug.keywordsFound = kw.found;
  debug.keywordsMissing = kw.missing;

  debug.stages.push({
    id: "ocr_text",
    label: "⑥ 項目別OCR生テキスト",
    status: fieldDebug.some((f) => f.rawText.trim()) ? "ok" : "warn",
    detail: `非空項目 ${fieldDebug.filter((f) => f.rawText.trim()).length}/${fieldDebug.length}`,
  });
  debug.stages.push({
    id: "keyword_check",
    label: "⑦ 補正後キーワード",
    status: kw.found.length >= 3 ? "ok" : "warn",
    detail: `ヒット: ${kw.found.join(", ") || "なし"}`,
  });
  debug.stages.push({
    id: "parse_monthly_mvp",
    label: "⑧ 月間MVP構造化",
    status: coverage.got.length >= 4 ? "ok" : "warn",
    detail: `取得 ${coverage.got.length} / 未取得 ${coverage.missing.length}`,
  });
  debug.stages.push({
    id: "player_match",
    label: "⑨ 2026選手マスター照合",
    status:
      pitcherMatch.status === "matched" && batterMatch.status === "matched"
        ? "ok"
        : "warn",
    detail: `投手=${pitcherMatch.displayName || "未確定"}(${pitcherMatch.status}) / 野手=${batterMatch.displayName || "未確定"}(${batterMatch.status})`,
  });

  if (coverage.got.length < 3) debug.firstFailureId = "parse_monthly_mvp";
  else if (
    pitcherMatch.status !== "matched" &&
    batterMatch.status !== "matched"
  ) {
    debug.firstFailureId = "player_match";
  }

  onProgress?.(100);
  console.info("[import-template]", {
    values,
    pitcher: pitcherMatch,
    batter: batterMatch,
    fields: fieldDebug.map((f) => ({
      id: f.fieldId,
      raw: f.rawText,
      corr: f.correctedText,
      conf: f.confidence,
    })),
  });

  const overlay = drawLayoutOverlay(
    normalized.canvas,
    template.fields.map((f) => ({ id: f.id, label: f.label, rect: f.rect })),
  );
  const overlayBlob = await canvasToPngBlob(overlay);
  const normalizedPreviewUrl = URL.createObjectURL(overlayBlob);
  return {
    draft,
    debug,
    fieldDebug,
    normalizedPreviewUrl,
    message:
      coverage.missing.length > 0
        ? "項目別OCRの結果です。未取得・低確信の項目は確認画面で修正してください。"
        : undefined,
  };
}

function emptyDraft(): MonthlyMvpImportDraft {
  const year = 2026;
  return {
    screenType: "monthly_mvp",
    year,
    month: 4,
    league: "central",
    pitcher: {
      gameDisplayName: "",
      teamName: "",
      era: null,
      wins: null,
      losses: null,
      playerRef: createUnknownPlayerRef({
        gameDisplayName: "",
        team: "",
        year,
        position: "投手",
      }),
      resolvedName: "",
    },
    batter: {
      gameDisplayName: "",
      teamName: "",
      avg: null,
      hr: null,
      rbi: null,
      sb: null,
      playerRef: createUnknownPlayerRef({
        gameDisplayName: "",
        team: "",
        year,
        position: "内野手",
      }),
      resolvedName: "",
    },
    rawText: "",
    confidence: "low",
  };
}

function getMasterGameDisplay(ref: PlayerRef): string {
  if (ref.status === UNKNOWN_PLAYER_STATUS) return "";
  return getPlayerMaster(ref.playerId)?.gameDisplayName ?? "";
}

function teamShortFromPlayer(ref: PlayerRef | null, year: number): string {
  if (!ref || ref.status === UNKNOWN_PLAYER_STATUS) return "";
  const aff = getPlayerAffiliationsByPlayer(ref.playerId).find(
    (a) => a.year === year,
  );
  if (!aff) return "";
  return (
    npbTeams.find((t) => t.id === aff.teamId)?.short ??
    resolveTeamName(aff.teamId)
  );
}

/** 表示名: OCRがより具体的（佐藤輝等）なら優先。否则マスター gameDisplayName */
function preferDisplayName(ocrName: string, ref: PlayerRef): string {
  if (ref.status === UNKNOWN_PLAYER_STATUS) return ocrName;
  const master = getPlayerMaster(ref.playerId);
  const game = master?.gameDisplayName ?? "";
  const full = (master?.fullName ?? "").replace(/\s/g, "");
  const ocrKanji = (ocrName.match(/[\u3400-\u9fff]/g) || []).join("");
  const gameKanji = (game.match(/[\u3400-\u9fff]/g) || []).join("");
  if (
    ocrKanji.length > gameKanji.length &&
    full &&
    (full.includes(ocrKanji) || full.startsWith(ocrKanji.slice(0, 2)))
  ) {
    if (ocrKanji.length >= 3) {
      return `${ocrKanji.slice(0, 2)} ${ocrKanji.slice(2)}`.trim();
    }
    return ocrKanji;
  }
  // マスターフルネームが「佐藤輝明」で表示名が「佐藤」なら「佐藤 輝」形式
  if (gameKanji && full.startsWith(gameKanji) && full.length > gameKanji.length) {
    const next = full.slice(gameKanji.length, gameKanji.length + 1);
    if (next) return `${gameKanji} ${next}`.trim();
  }
  return game || ocrName;
}

function mergeImageNameCandidates(
  match: ReturnType<typeof resolvePlayerWithCandidates>,
  imgHits: Array<{ label: string; playerId: string; score: number }>,
  ocrName: string,
): ReturnType<typeof resolvePlayerWithCandidates> {
  if (!imgHits.length) return match;
  const merged = new Map<string, { label: string; playerId: string; score: number }>();
  for (const c of match.candidates) {
    merged.set(c.playerId, { ...c });
  }
  for (const h of imgHits) {
    const prev = merged.get(h.playerId);
    // 画像類似は 0.18〜0.5 程度なので OCR スコアと合成
    const score = Math.min(0.98, h.score * 1.6 + (prev?.score ?? 0) * 0.25);
    if (!prev || score > prev.score) {
      merged.set(h.playerId, { label: h.label, playerId: h.playerId, score });
    }
  }
  const candidates = [...merged.values()]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "ja"))
    .slice(0, 30);

  const top = candidates[0];
  // OCR崩れ時は自動確定せず、ロスター候補を確認UIへ
  if (top && match.status !== "matched") {
    return {
      playerRef: match.playerRef,
      displayName: match.displayName || ocrName,
      status: "ambiguous",
      confidence: top.score,
      candidates,
    };
  }
  return { ...match, candidates };
}

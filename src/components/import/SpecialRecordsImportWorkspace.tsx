"use client";

import { useMemo, useState } from "react";
import { ImageDropzone } from "@/components/import/ImageDropzone";
import {
  ImportModeTabs,
  type ImportInputMode,
} from "@/components/import/ImportModeTabs";
import { ImportSubTabs } from "@/components/import/ImportSubTabs";
import { PartnerPastePanel } from "@/components/import/PartnerPastePanel";
import { PlayerNameAutocomplete } from "@/components/manualEntry/PlayerNameAutocomplete";
import { appendImportHistory } from "@/data/import/store";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  listDemoAchievements,
  upsertDemoAchievement,
} from "@/data/import/demoStore";
import { ACHIEVEMENT_CATALOG } from "@/data/seasonAchievements/catalog";
import {
  listStoredAchievementsForSeasonIdentity,
  seasonAchievementId,
  upsertStoredAchievement,
} from "@/data/seasonAchievements/store";
import {
  listEntrySeasonIdentities,
  makeSeasonKey,
  normalizeSeasonWorld,
  parseSeasonKey,
} from "@/data/seasons";
import {
  recordNeedsValue,
  roleForRecordType,
  sopPointsForRecordType,
} from "@/lib/import/achievementSopPoints";
import { normalizeOcrText, runImageOcr } from "@/lib/import/ocr";
import {
  parseNonSeasonPartnerPaste,
  savePartnerSpecialResult,
  type PartnerSpecialResult,
} from "@/lib/import/partnerPaste";
import {
  searchPlayerMasterCandidates,
  type PlayerSearchHit,
} from "@/lib/manualEntry/searchPlayers";
import { normalizeIntegerInput } from "@/lib/manualEntry/normalizeInput";
import { cn } from "@/lib/cn";

const IMPORTABLE = ACHIEVEMENT_CATALOG.filter((c) => c.needsManual);

export function SpecialRecordsImportWorkspace() {
  const entrySeasons = useMemo(() => listEntrySeasonIdentities(), []);
  const [recordType, setRecordType] = useState(
    IMPORTABLE[0]?.recordType ?? "perfect_game",
  );
  const [inputMode, setInputMode] = useState<ImportInputMode>("manual");
  const [partnerText, setPartnerText] = useState("");
  const [partnerDraft, setPartnerDraft] = useState<PartnerSpecialResult | null>(
    null,
  );
  const [seasonKey, setSeasonKey] = useState(
    () => entrySeasons[0]?.seasonKey ?? makeSeasonKey("BLUE", 2026),
  );
  const identity = useMemo(
    () => parseSeasonKey(seasonKey) ?? entrySeasons[0]!,
    [seasonKey, entrySeasons],
  );
  const year = identity.year;
  const world = normalizeSeasonWorld(identity.world);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlayerSearchHit | null>(null);
  const [teamShort, setTeamShort] = useState("");
  const [valueStr, setValueStr] = useState("");
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [partnerOverwrite, setPartnerOverwrite] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  const catalog = useMemo(
    () => IMPORTABLE.find((c) => c.recordType === recordType),
    [recordType],
  );
  const needsValue = recordNeedsValue(recordType);
  const role = roleForRecordType(recordType);

  const subOptions = IMPORTABLE.map((c) => ({
    id: c.recordType,
    label: c.recordName,
  }));

  function expandPartner() {
    setError(null);
    setMessage(null);
    setPartnerDraft(null);
    try {
      const parsed = parseNonSeasonPartnerPaste(partnerText, year);
      if (parsed.kind === "unsupported") {
        setError(parsed.message);
        return;
      }
      if (parsed.kind !== "special_record") {
        setError("特別記録は TYPE=SPECIAL_RECORD を指定してください");
        return;
      }
      setYearFromPartner(parsed.year);
      setPartnerDraft(parsed);
      setMessage(parsed.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析に失敗しました");
    }
  }

  function setYearFromPartner(nextYear: number) {
    const preferred =
      entrySeasons.find(
        (s) =>
          s.year === nextYear &&
          (world != null ? s.world === world : s.world == null),
      ) ??
      entrySeasons.find((s) => s.year === nextYear && s.world === "BLUE") ??
      entrySeasons.find((s) => s.year === nextYear);
    if (preferred) setSeasonKey(preferred.seasonKey);
  }

  function savePartner(force: boolean) {
    if (!partnerDraft) return;
    const result = savePartnerSpecialResult(partnerDraft, force, world);
    if (!result.ok) {
      if (result.needsConfirm) {
        setError(result.message);
        setPartnerOverwrite(true);
        return;
      }
      setError(result.message);
      return;
    }
    setPartnerOverwrite(false);
    setMessage(result.summary);
    setPartnerDraft(null);
  }

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setProgress(`${file.name}: OCR中…`);
    setError(null);
    try {
      const ocr = await runImageOcr(file);
      const text = normalizeOcrText(ocr.text);
      setOcrHint(text.slice(0, 400));
      const nameM = text.match(/([一-龥]{2,4})/);
      if (nameM) {
        const hits = searchPlayerMasterCandidates(nameM[1]!, year, 8);
        if (hits[0]) {
          setSelected(hits[0]);
          setQuery(hits[0].player.fullName);
          if (hits[0].teamShort !== "—") setTeamShort(hits[0].teamShort);
        } else setQuery(nameM[1]!);
      }
      const numM = text.match(/(\d{1,3})\s*(試合|回|奪三振|連勝)?/);
      if (numM && needsValue) setValueStr(numM[1]!);
      setMessage("OCR候補を反映しました。確認後に登録してください。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCRに失敗しました");
    }
    setProgress("");
  }

  function achievementId(): string {
    const pid = selected?.player.playerId ?? "unknown";
    return seasonAchievementId({
      season: year,
      world,
      playerId: pid,
      recordType,
    });
  }

  function save(force: boolean) {
    if (!selected || !catalog) {
      setError("選手と記録種類を確認してください");
      return;
    }
    let value: number | null = null;
    if (needsValue) {
      const n = normalizeIntegerInput(valueStr);
      if (n.value == null) {
        setError("記録数値を入力してください");
        return;
      }
      value = n.value;
    }

    const useSandbox = shouldUseIsolatedDemoStore(year);
    const id = achievementId();
    const existing = useSandbox
      ? listDemoAchievements().find((a) => a.id === id)
      : listStoredAchievementsForSeasonIdentity(identity).find(
          (a) => a.id === id,
        );
    if (existing && !force) {
      setConfirmOpen(true);
      return;
    }

    const now = new Date().toISOString();
    const sopPoints = sopPointsForRecordType(recordType, value);
    const payload = {
      id,
      season: year,
      world,
      playerId: selected.player.playerId,
      playerName: selected.player.fullName,
      teamShort: teamShort || selected.teamShort || "—",
      role,
      category: catalog.category,
      recordType,
      recordName: catalog.recordName,
      value,
      unit: catalog.unit ?? null,
      valueLabel: needsValue
        ? `${value}${catalog.unit ?? ""}`
        : catalog.recordName,
      sopPoints,
      source: "manual" as const,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (useSandbox) upsertDemoAchievement(payload);
    else upsertStoredAchievement(payload);

    const hist = {
      id: `hist-${Date.now()}`,
      at: now,
      year,
      fileName: "special-record",
      screenType: "unknown" as const,
      summary: `${year}年 ${catalog.recordName} — ${selected.player.fullName}`,
      recordIds: [id],
    };
    if (useSandbox) appendDemoImportHistory(hist);
    else appendImportHistory(hist);

    if (!useSandbox) notifyImportStoreChanged();

    setConfirmOpen(false);
    setMessage(
      useSandbox
        ? `${catalog.recordName}を分離デモ領域に登録しました。`
        : `${catalog.recordName}を登録しました。RECORDS・SOP判定に利用されます。`,
    );
  }

  return (
    <div className="space-y-5">
      <ImportSubTabs
        options={subOptions}
        value={recordType}
        onChange={(id) => {
          setRecordType(id);
          setValueStr("");
          setMessage(null);
          setError(null);
        }}
      />

      <p className="text-[12px] text-white/55">
        画像・相棒データ・手入力から確認後に記録・偉業へ登録します（自動保存なし）。
      </p>

      <ImportModeTabs
        value={inputMode}
        onChange={(m) => {
          setInputMode(m);
          setPartnerDraft(null);
        }}
        modes={["image", "partner", "manual"]}
      />

      {inputMode === "image" ? (
        <ImageDropzone
          onFiles={handleFiles}
          disabled={!!progress}
          maxFiles={2}
          hint="記録画面の画像（任意）"
        />
      ) : null}

      {inputMode === "partner" ? (
        <PartnerPastePanel
          value={partnerText}
          onChange={setPartnerText}
          onExpand={expandPartner}
          exampleKey="SPECIAL_RECORD"
        />
      ) : null}

      {ocrHint ? (
        <details className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white/45">
          <summary className="cursor-pointer text-white/60">OCRテキスト抜粋</summary>
          <pre className="mt-2 whitespace-pre-wrap">{ocrHint}</pre>
        </details>
      ) : null}

      {partnerDraft ? (
        <section className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
          <h3 className="text-[12px] text-[color:var(--museum-accent,#d4af37)]">
            確認: {partnerDraft.year}年 特別記録
          </h3>
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="text-white/45">
                <th className="py-1">記録</th>
                <th>選手</th>
                <th>球団</th>
                <th>値</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {partnerDraft.entries.map((e, i) => (
                <tr key={`${e.recordType}-${i}`} className="border-t border-white/8">
                  <td className="py-1">{e.recordName}</td>
                  <td>{e.displayName || e.name}</td>
                  <td>{e.teamShort}</td>
                  <td>{e.value ?? "—"}</td>
                  <td
                    className={
                      e.status === "matched" ? "text-emerald-300" : "text-amber-200"
                    }
                  >
                    {e.status === "matched" ? "OK" : "要確認"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => savePartner(false)}
            className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
          >
            確認して一括登録
          </button>
        </section>
      ) : null}

      {inputMode !== "partner" || !partnerDraft ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-white/55">シーズン</span>
              <select
                value={seasonKey}
                onChange={(e) => setSeasonKey(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
              >
                {entrySeasons.map((s) => (
                  <option key={s.seasonKey} value={s.seasonKey}>
                    {s.kind === "demo"
                      ? `${s.year} DEMO SEASON`
                      : s.world
                        ? `${s.year} ${s.world}`
                        : `${s.year}年`}
                  </option>
                ))}
              </select>
            </label>

            {needsValue ? (
              <label className="block">
                <span className="mb-1 block text-[11px] text-white/55">
                  記録数値{catalog?.unit ? `（${catalog.unit}）` : ""}
                </span>
                <input
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
                  placeholder="例: 30"
                />
              </label>
            ) : (
              <p className="self-end text-[12px] text-white/45">
                この記録は達成の有無のみ登録します（数値不要）。
              </p>
            )}
          </div>

          <PlayerNameAutocomplete
            year={year}
            value={query}
            selected={selected}
            onQueryChange={(q) => {
              setQuery(q);
              setSelected(null);
            }}
            onSelect={(hit) => {
              setSelected(hit);
              setQuery(hit.player.fullName);
              if (hit.teamShort !== "—") setTeamShort(hit.teamShort);
            }}
            onClear={() => {
              setSelected(null);
              setQuery("");
            }}
          />

          <label className="block max-w-xs">
            <span className="mb-1 block text-[11px] text-white/55">球団（略称）</span>
            <input
              value={teamShort}
              onChange={(e) => setTeamShort(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
            />
          </label>

          {catalog ? (
            <p className="text-[11px] text-white/40">
              SOP目安: {sopPointsForRecordType(recordType, Number(valueStr) || 0)} pt
              ／ 役割: {role === "batter" ? "野手" : "投手"}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => save(false)}
            className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
          >
            確認して登録
          </button>
        </>
      ) : null}

      {progress ? (
        <p className="text-[12px] text-[color:var(--museum-accent,#d4af37)]">{progress}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white/70">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          {error}
        </p>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0c0c0c] p-5">
            <h3 className="text-[13px] text-[color:var(--museum-accent,#d4af37)]">
              上書き確認
            </h3>
            <p className="mt-2 text-[12px] text-white/60">
              同じ選手・年度・記録種類が既にあります。更新しますか？
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => save(true)}
                className={cn(
                  "rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/20 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]",
                )}
              >
                上書き登録
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {partnerOverwrite ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0c0c0c] p-5">
            <h3 className="text-[13px] text-[color:var(--museum-accent,#d4af37)]">
              上書き確認
            </h3>
            <p className="mt-2 text-[12px] text-white/60">{error}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPartnerOverwrite(false)}
                className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => savePartner(true)}
                className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/20 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
              >
                上書き登録
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
import {
  AWARD_IMPORT_SUBS,
  type AwardImportSubId,
} from "@/data/import/categories";
import { appendImportHistory } from "@/data/import/store";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  listDemoAwards,
  listDemoTitleWins,
  upsertDemoAward,
  upsertDemoTitleWin,
} from "@/data/import/demoStore";
import {
  formatSeasonLineLabel,
  listEntrySeasonIdentities,
  makeSeasonKey,
  normalizeSeasonWorld,
  parseSeasonKey,
} from "@/data/seasons";
import {
  listRegisteredAwardsForSeason,
  registeredAwardId,
  upsertRegisteredAward,
} from "@/data/sop/awardsRegistry";
import {
  BATTER_TITLES,
  PITCHER_TITLES,
} from "@/data/titleRankings/defs";
import {
  listTitleWinsForSeason,
  upsertTitleWinner,
} from "@/data/titleRankings/history";
import type { AnnualAwardKind } from "@/lib/sop/rules";
import { runImageOcr } from "@/lib/import/ocr";
import { normalizeOcrText } from "@/lib/import/ocr";
import {
  parseNonSeasonPartnerPaste,
  savePartnerAwardResult,
  savePartnerPositionAwardResult,
  savePartnerTitleResult,
  type PartnerAwardResult,
  type PartnerPositionAwardResult,
  type PartnerTitleResult,
} from "@/lib/import/partnerPaste";
import {
  searchPlayerMasterCandidates,
  type PlayerSearchHit,
} from "@/lib/manualEntry/searchPlayers";

const TITLE_OPTIONS = [
  ...BATTER_TITLES.map((t) => ({ id: t.id, label: `野手・${t.label}` })),
  ...PITCHER_TITLES.map((t) => ({ id: t.id, label: `投手・${t.label}` })),
];

function awardKindFromSub(sub: AwardImportSubId): AnnualAwardKind | null {
  switch (sub) {
    case "bestNine":
      return "bestNine";
    case "goldenGlove":
      return "goldenGlove";
    case "mvp":
      return "mvp";
    case "rookie":
      return "rookie";
    case "sawamura":
      return "sawamura";
    default:
      return null;
  }
}

type PartnerDraft =
  | { kind: "title"; data: PartnerTitleResult }
  | { kind: "award"; data: PartnerAwardResult }
  | { kind: "position"; data: PartnerPositionAwardResult };

export function AwardsImportWorkspace() {
  const entrySeasons = useMemo(() => listEntrySeasonIdentities(), []);
  const [sub, setSub] = useState<AwardImportSubId>("mvp");
  const [inputMode, setInputMode] = useState<ImportInputMode>("manual");
  const [partnerText, setPartnerText] = useState("");
  const [partnerDraft, setPartnerDraft] = useState<PartnerDraft | null>(null);
  const [seasonKey, setSeasonKey] = useState(
    () => entrySeasons[0]?.seasonKey ?? makeSeasonKey("BLUE", 2026),
  );
  const identity = useMemo(
    () => parseSeasonKey(seasonKey) ?? entrySeasons[0]!,
    [seasonKey, entrySeasons],
  );
  const year = identity.year;
  const world = normalizeSeasonWorld(identity.world);
  const [league, setLeague] = useState<"central" | "pacific">("central");
  const [titleId, setTitleId] = useState<string>("avg");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlayerSearchHit | null>(null);
  const [teamShort, setTeamShort] = useState("");
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [partnerOverwrite, setPartnerOverwrite] = useState(false);

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
      if (parsed.kind === "title") {
        setSub("title");
        applyPartnerYear(parsed.year);
        setTitleId(parsed.titleId);
        setPartnerDraft({ kind: "title", data: parsed });
        setMessage(parsed.message);
        return;
      }
      if (parsed.kind === "award") {
        setSub("mvp");
        applyPartnerYear(parsed.year);
        setPartnerDraft({ kind: "award", data: parsed });
        setMessage(parsed.message);
        return;
      }
      if (parsed.kind === "best_nine" || parsed.kind === "gold_glove") {
        setSub(parsed.kind === "best_nine" ? "bestNine" : "goldenGlove");
        applyPartnerYear(parsed.year);
        setLeague(parsed.league);
        setPartnerDraft({ kind: "position", data: parsed });
        setMessage(parsed.message);
        return;
      }
      setError(
        `TYPE=${parsed.type} は表彰タブでは扱えません（TITLE / AWARD / BEST_NINE / GOLD_GLOVE）`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析に失敗しました");
    }
  }

  function applyPartnerYear(nextYear: number) {
    // 相棒の年度へ切替。正式年は現在の WORLD を維持、無ければ BLUE
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
    const result =
      partnerDraft.kind === "title"
        ? savePartnerTitleResult(partnerDraft.data, force, world)
        : partnerDraft.kind === "award"
          ? savePartnerAwardResult(partnerDraft.data, force, world)
          : savePartnerPositionAwardResult(partnerDraft.data, force, world);
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
    setError(null);
    const file = files[0];
    if (!file) return;
    setProgress(`${file.name}: OCR中…`);
    try {
      const ocr = await runImageOcr(file);
      const text = normalizeOcrText(ocr.text);
      setOcrHint(text.slice(0, 400));
      const teams = [
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
      for (const t of teams) {
        if (text.includes(t)) {
          setTeamShort(t);
          break;
        }
      }
      const nameM = text.match(/([一-龥]{2,4})/);
      if (nameM) {
        const hits = searchPlayerMasterCandidates(nameM[1]!, year, 8);
        if (hits[0]) {
          setSelected(hits[0]);
          setQuery(hits[0].player.fullName);
          if (hits[0].teamShort !== "—") setTeamShort(hits[0].teamShort);
        } else {
          setQuery(nameM[1]!);
        }
      }
      setMessage("OCR候補を反映しました。内容を確認してから登録してください。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCRに失敗しました");
    }
    setProgress("");
  }

  function buildAwardId(): string {
    const kind = awardKindFromSub(sub);
    const playerId = selected?.player.playerId ?? "unknown";
    if (sub === "title") {
      return world
        ? `title:${world}:${titleId}:${year}:${league}:${playerId}`
        : `title:${titleId}:${year}:${league}:${playerId}`;
    }
    if (!kind) return `unknown:${year}`;
    return registeredAwardId({
      kind,
      year,
      world,
      league: sub === "sawamura" ? undefined : league,
      playerId,
    });
  }

  function save(force: boolean) {
    if (!selected) {
      setError("選手を選択してください");
      return;
    }
    const useSandbox = shouldUseIsolatedDemoStore(year);
    const id = buildAwardId();
    if (sub === "title") {
      const titleExisting = useSandbox
        ? listDemoTitleWins().find(
            (r) =>
              r.titleId === titleId &&
              r.year === year &&
              r.league === league &&
              normalizeSeasonWorld(r.world) === world &&
              (r.rank ?? 1) === 1,
          )
        : listTitleWinsForSeason(identity).find(
            (r) =>
              r.titleId === titleId &&
              r.league === league &&
              (r.rank ?? 1) === 1,
          );
      if (titleExisting && !force) {
        setConfirmOpen(true);
        return;
      }
      const titlePayload = {
        titleId,
        year,
        world,
        league,
        playerId: selected.player.playerId,
        playerName: selected.player.fullName,
        teamShort: teamShort || selected.teamShort,
        rank: 1 as const,
      };
      if (useSandbox) upsertDemoTitleWin(titlePayload);
      else upsertTitleWinner(titlePayload);
    } else {
      const kind = awardKindFromSub(sub);
      if (!kind) return;
      const existing = useSandbox
        ? listDemoAwards().find((a) => a.id === id)
        : listRegisteredAwardsForSeason(identity).find((a) => a.id === id);
      const sameSlot = useSandbox
        ? listDemoAwards().find(
            (a) =>
              a.year === year &&
              normalizeSeasonWorld(a.world) === world &&
              a.kind === kind &&
              (kind === "sawamura" || a.league === league),
          )
        : listRegisteredAwardsForSeason(identity).find(
            (a) =>
              a.kind === kind &&
              (kind === "sawamura" || a.league === league),
          );
      if ((existing || sameSlot) && !force) {
        setConfirmOpen(true);
        return;
      }
      const awardPayload = {
        id,
        year,
        world,
        kind,
        playerId: selected.player.playerId,
        playerName: selected.player.fullName,
        teamShort: teamShort || selected.teamShort,
        league: sub === "sawamura" ? undefined : league,
      };
      if (useSandbox) upsertDemoAward(awardPayload);
      else upsertRegisteredAward(awardPayload);
    }

    const hist = {
      id: `hist-${Date.now()}`,
      at: new Date().toISOString(),
      year,
      fileName: "awards-import",
      screenType: "mvp" as const,
      summary: `${formatSeasonLineLabel({ year, world })} ${AWARD_IMPORT_SUBS.find((s) => s.id === sub)?.label} — ${selected.player.fullName}`,
      recordIds: [id],
    };
    if (useSandbox) appendDemoImportHistory(hist);
    else appendImportHistory(hist);

    if (!useSandbox) notifyImportStoreChanged();

    setConfirmOpen(false);
    setMessage(
      useSandbox
        ? `${selected.player.fullName} を分離デモ領域に登録しました。`
        : `${selected.player.fullName} の${AWARD_IMPORT_SUBS.find((s) => s.id === sub)?.label}を登録しました。SOP・表彰ページへ反映されます。`,
    );
  }

  const partnerExample =
    sub === "title"
      ? "TITLE"
      : sub === "bestNine"
        ? "BEST_NINE"
        : sub === "goldenGlove"
          ? "GOLD_GLOVE"
          : "AWARD";

  return (
    <div className="space-y-5">
      <ImportSubTabs
        options={AWARD_IMPORT_SUBS}
        value={sub}
        onChange={(id) => {
          setSub(id as AwardImportSubId);
          setMessage(null);
          setError(null);
          setPartnerDraft(null);
        }}
      />

      <p className="text-[12px] text-white/55">
        画像・相棒データ・手入力のいずれかから確認後に共通表彰データへ登録します（自動保存なし）。
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
          maxFiles={3}
          hint="表彰画面の画像（任意）。手入力のみでも登録できます"
        />
      ) : null}

      {inputMode === "partner" ? (
        <PartnerPastePanel
          value={partnerText}
          onChange={setPartnerText}
          onExpand={expandPartner}
          exampleKey={partnerExample}
        />
      ) : null}

      {ocrHint ? (
        <details className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white/45">
          <summary className="cursor-pointer text-white/60">OCRテキスト抜粋</summary>
          <pre className="mt-2 whitespace-pre-wrap">{ocrHint}</pre>
        </details>
      ) : null}

      {partnerDraft?.kind === "title" ? (
        <PartnerTitleConfirm
          data={partnerDraft.data}
          onSave={() => savePartner(false)}
        />
      ) : null}
      {partnerDraft?.kind === "award" ? (
        <PartnerAwardConfirm
          data={partnerDraft.data}
          onSave={() => savePartner(false)}
        />
      ) : null}
      {partnerDraft?.kind === "position" ? (
        <PartnerPositionConfirm
          data={partnerDraft.data}
          onSave={() => savePartner(false)}
        />
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

            {sub !== "sawamura" ? (
              <label className="block">
                <span className="mb-1 block text-[11px] text-white/55">リーグ</span>
                <select
                  value={league}
                  onChange={(e) =>
                    setLeague(e.target.value as "central" | "pacific")
                  }
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
                >
                  <option value="central">セ・リーグ</option>
                  <option value="pacific">パ・リーグ</option>
                </select>
              </label>
            ) : null}

            {sub === "title" ? (
              <label className="block md:col-span-2">
                <span className="mb-1 block text-[11px] text-white/55">タイトル種</span>
                <select
                  value={titleId}
                  onChange={(e) => setTitleId(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
                >
                  {TITLE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
              placeholder="阪神"
            />
          </label>

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
        <p className="text-[12px] text-[color:var(--museum-accent,#d4af37)]">
          {progress}
        </p>
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
        <OverwriteModal
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => save(true)}
        />
      ) : null}
      {partnerOverwrite ? (
        <OverwriteModal
          onCancel={() => setPartnerOverwrite(false)}
          onConfirm={() => savePartner(true)}
        />
      ) : null}
    </div>
  );
}

function OverwriteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0c0c0c] p-5">
        <h3 className="text-[13px] text-[color:var(--museum-accent,#d4af37)]">
          上書き確認
        </h3>
        <p className="mt-2 text-[12px] text-white/60">
          同じ表彰データが既にあります。更新しますか？
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/20 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
          >
            上書き登録
          </button>
        </div>
      </div>
    </div>
  );
}

function PartnerTitleConfirm({
  data,
  onSave,
}: {
  data: PartnerTitleResult;
  onSave: () => void;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
      <h3 className="text-[12px] text-[color:var(--museum-accent,#d4af37)]">
        確認: {data.year}年 {data.titleLabel}
      </h3>
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="text-white/45">
            <th className="py-1">リーグ</th>
            <th>順位</th>
            <th>選手</th>
            <th>球団</th>
            <th>値</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((e) => (
            <tr key={`${e.league}-${e.rank}`} className="border-t border-white/8">
              <td className="py-1">{e.league === "central" ? "セ" : "パ"}</td>
              <td>{e.rank}</td>
              <td>{e.displayName || e.name}</td>
              <td>{e.teamShort}</td>
              <td>{e.valueText}</td>
              <td className={e.status === "matched" ? "text-emerald-300" : "text-amber-200"}>
                {e.status === "matched" ? "OK" : "要確認"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onSave}
        className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
      >
        確認して一括登録
      </button>
    </section>
  );
}

function PartnerAwardConfirm({
  data,
  onSave,
}: {
  data: PartnerAwardResult;
  onSave: () => void;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
      <h3 className="text-[12px] text-[color:var(--museum-accent,#d4af37)]">
        確認: {data.year}年 年間表彰
      </h3>
      <ul className="space-y-1 text-[12px] text-white/75">
        {data.slots.map((s) => (
          <li key={s.key} className="flex flex-wrap gap-2 border-b border-white/8 py-1">
            <span className="text-white/45">{s.key}</span>
            <span>{s.displayName || s.name}</span>
            <span>{s.teamShort}</span>
            <span className={s.status === "matched" ? "text-emerald-300" : "text-amber-200"}>
              {s.status === "matched" ? "OK" : "要確認"}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSave}
        className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
      >
        確認して一括登録
      </button>
    </section>
  );
}

function PartnerPositionConfirm({
  data,
  onSave,
}: {
  data: PartnerPositionAwardResult;
  onSave: () => void;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
      <h3 className="text-[12px] text-[color:var(--museum-accent,#d4af37)]">
        確認: {data.year}年 {data.type === "BEST_NINE" ? "ベストナイン" : "ゴールデングラブ"}（
        {data.league === "central" ? "セ" : "パ"}）
      </h3>
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="text-white/45">
            <th className="py-1">守備位置</th>
            <th>選手</th>
            <th>球団</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((e, i) => (
            <tr key={`${e.position}-${i}`} className="border-t border-white/8">
              <td className="py-1">{e.position}</td>
              <td>{e.displayName || e.name}</td>
              <td>{e.teamShort}</td>
              <td className={e.status === "matched" ? "text-emerald-300" : "text-amber-200"}>
                {e.status === "matched" ? "OK" : "要確認"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onSave}
        className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
      >
        確認して一括登録
      </button>
    </section>
  );
}

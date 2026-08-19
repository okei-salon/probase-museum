"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  clearAllDemoImportData,
  getDemoImportStore,
  type DemoImportStore,
  type DemoSeasonLine,
} from "@/data/import/demoStore";
import { DEMO_IMPORT_YEAR } from "@/data/import/demoMode";
import { outsToIpDisplay } from "@/lib/manualEntry/normalizeInput";
import { formatAvgDisplay } from "@/lib/manualEntry/normalizeInput";
import { cn } from "@/lib/cn";

type DemoSectionId =
  | "batter"
  | "pitcher"
  | "catcher"
  | "standings"
  | "team_batting"
  | "team_pitching"
  | "monthly_mvp"
  | "awards"
  | "special";

const SECTIONS: Array<{ id: DemoSectionId; label: string }> = [
  { id: "batter", label: "年度個人成績（野手）" },
  { id: "pitcher", label: "年度個人成績（投手）" },
  { id: "catcher", label: "捕手守備成績" },
  { id: "standings", label: "チーム順位" },
  { id: "team_batting", label: "チーム打撃成績" },
  { id: "team_pitching", label: "チーム投手成績" },
  { id: "monthly_mvp", label: "月間MVP" },
  { id: "awards", label: "タイトル／表彰" },
  { id: "special", label: "特別記録" },
];

function isCatcherFocused(line: DemoSeasonLine): boolean {
  if (line.role !== "batter") return false;
  const c = line.counting;
  return (
    (c.csAttempted != null && c.csAttempted > 0) ||
    (c.csAllowed != null && c.csAllowed > 0) ||
    (c.csCaught != null && c.csCaught > 0)
  );
}

export function DemoConfirmBoard() {
  const [store, setStore] = useState<DemoImportStore | null>(null);
  const [section, setSection] = useState<DemoSectionId>("batter");
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(() => {
    setStore(getDemoImportStore());
  }, []);

  useEffect(() => {
    reload();
    const onData = () => reload();
    window.addEventListener("probase-demo-data", onData);
    return () => window.removeEventListener("probase-demo-data", onData);
  }, [reload]);

  function handleClear() {
    if (
      !window.confirm(
        "デモデータ（isDemo / dataMode: demo）をすべて削除します。正式データは削除されません。よろしいですか？",
      )
    ) {
      return;
    }
    const { removed } = clearAllDemoImportData();
    reload();
    setMessage(`デモデータを削除しました（${removed}件）。正式データには影響ありません。`);
  }

  if (!store) {
    return <p className="text-[12px] text-white/50">読み込み中…</p>;
  }

  const batters = store.seasonLines.filter(
    (l) => l.role === "batter" && !isCatcherFocused(l),
  );
  const catchers = store.seasonLines.filter(
    (l) => l.role === "batter" && isCatcherFocused(l),
  );
  const pitchers = store.seasonLines.filter((l) => l.role === "pitcher");

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
        <p className="text-[13px] text-amber-100">デモデータ確認</p>
        <p className="mt-1 text-[12px] text-white/60">
          分離デモ領域（OCRサンドボックス）で登録したデータのみ表示します。YEAR=
          {DEMO_IMPORT_YEAR}{" "}
          の正式ストア連携テストデータはここには出ません（SEASONS →{" "}
          {DEMO_IMPORT_YEAR} を見てください）。正式ランキング・通算・SOP・YEARBOOKには混ざりません。
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/import"
            className="text-[12px] text-[color:var(--museum-accent,#d4af37)] underline-offset-2 hover:underline"
          >
            ← データ取込へ戻る
          </Link>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-[12px] text-rose-100 hover:border-rose-300/60"
          >
            デモデータをすべて削除
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white/70">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-[12px]",
              section === s.id
                ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 text-white/70",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "batter" ? (
        <BatterTable rows={batters} emptyHint="野手のデモ成績はまだありません" />
      ) : null}
      {section === "pitcher" ? (
        <PitcherTable rows={pitchers} />
      ) : null}
      {section === "catcher" ? (
        <CatcherTable rows={catchers} />
      ) : null}
      {section === "standings" ? (
        <StandingsView standings={store.standings} />
      ) : null}
      {section === "team_batting" ? (
        <TeamBattingView rows={store.teamStats.filter((t) => t.batting)} />
      ) : null}
      {section === "team_pitching" ? (
        <TeamPitchingView rows={store.teamStats.filter((t) => t.pitching)} />
      ) : null}
      {section === "monthly_mvp" ? (
        <MonthlyMvpView rows={store.monthlyMvp} />
      ) : null}
      {section === "awards" ? (
        <AwardsView awards={store.awards} titles={store.titleWins} />
      ) : null}
      {section === "special" ? (
        <SpecialView rows={store.achievements} />
      ) : null}

      {store.history.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-black/40 p-4">
          <h2 className="text-[12px] tracking-[0.12em] text-white/60">
            デモ取込履歴
          </h2>
          <ul className="mt-2 space-y-1 text-[12px] text-white/55">
            {store.history.slice(0, 15).map((h) => (
              <li key={h.id}>{h.summary}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-white/10 bg-black/40 px-4 py-8 text-center text-[12px] text-white/45">
      {text}
    </p>
  );
}

function BatterTable({
  rows,
  emptyHint,
}: {
  rows: DemoSeasonLine[];
  emptyHint: string;
}) {
  if (rows.length === 0) return <Empty text={emptyHint} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <table className="min-w-max text-left text-[12px]">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            {[
              "選手名",
              "球団",
              "年度",
              "打率",
              "試合",
              "打席",
              "打数",
              "安打",
              "本塁打",
              "打点",
              "OPS",
              "盗塁",
              "出塁率",
            ].map((h) => (
              <th key={h} className="px-2 py-2 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            if (r.role !== "batter") return null;
            const d = r.derived;
            const c = r.counting;
            return (
              <tr key={r.id} className="border-t border-white/5 text-white/85">
                <td className="px-2 py-1.5">{r.playerName}</td>
                <td className="px-2 py-1.5">{r.teamName}</td>
                <td className="px-2 py-1.5">{r.year}</td>
                <td className="px-2 py-1.5 tabular-nums">
                  {d.avg != null ? formatAvgDisplay(d.avg) : "—"}
                </td>
                <td className="px-2 py-1.5 tabular-nums">{c.g ?? "—"}</td>
                <td className="px-2 py-1.5 tabular-nums">{c.pa ?? "—"}</td>
                <td className="px-2 py-1.5 tabular-nums">{c.ab}</td>
                <td className="px-2 py-1.5 tabular-nums">{c.h}</td>
                <td className="px-2 py-1.5 tabular-nums">{c.hr}</td>
                <td className="px-2 py-1.5 tabular-nums">{c.rbi}</td>
                <td className="px-2 py-1.5 tabular-nums">
                  {d.ops != null ? d.ops.toFixed(3) : "—"}
                </td>
                <td className="px-2 py-1.5 tabular-nums">{c.sb ?? "—"}</td>
                <td className="px-2 py-1.5 tabular-nums">
                  {d.obp != null ? formatAvgDisplay(d.obp) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-white/5 px-3 py-2 text-[10px] text-amber-200/70">
        dataMode: demo / isDemo: true　{rows.length}人
      </p>
    </div>
  );
}

function PitcherTable({ rows }: { rows: DemoSeasonLine[] }) {
  if (rows.length === 0) {
    return <Empty text="投手のデモ成績はまだありません" />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <table className="min-w-max text-left text-[12px]">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            {[
              "選手名",
              "球団",
              "年度",
              "防御率",
              "登板",
              "勝",
              "敗",
              "投球回",
              "自責",
              "奪三振",
              "WHIP",
            ].map((h) => (
              <th key={h} className="px-2 py-2 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            if (r.role !== "pitcher") return null;
            const d = r.derived;
            const c = r.counting;
            return (
              <tr key={r.id} className="border-t border-white/5 text-white/85">
                <td className="px-2 py-1.5">{r.playerName}</td>
                <td className="px-2 py-1.5">{r.teamName}</td>
                <td className="px-2 py-1.5">{r.year}</td>
                <td className="px-2 py-1.5 tabular-nums">
                  {d.era != null ? d.era.toFixed(2) : "—"}
                </td>
                <td className="px-2 py-1.5 tabular-nums">{c.g}</td>
                <td className="px-2 py-1.5 tabular-nums">{c.w}</td>
                <td className="px-2 py-1.5 tabular-nums">{c.l}</td>
                <td className="px-2 py-1.5 tabular-nums">
                  {outsToIpDisplay(c.ipOuts)}
                </td>
                <td className="px-2 py-1.5 tabular-nums">{c.er}</td>
                <td className="px-2 py-1.5 tabular-nums">{c.so}</td>
                <td className="px-2 py-1.5 tabular-nums">
                  {d.whip != null ? d.whip.toFixed(2) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CatcherTable({ rows }: { rows: DemoSeasonLine[] }) {
  if (rows.length === 0) {
    return <Empty text="捕手守備のデモ成績はまだありません" />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <table className="min-w-max text-left text-[12px]">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            {["選手名", "球団", "年度", "試合", "被盗企", "許盗", "盗塁刺", "阻止率"].map(
              (h) => (
                <th key={h} className="px-2 py-2">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            if (r.role !== "batter") return null;
            return (
              <tr key={r.id} className="border-t border-white/5 text-white/85">
                <td className="px-2 py-1.5">{r.playerName}</td>
                <td className="px-2 py-1.5">{r.teamName}</td>
                <td className="px-2 py-1.5">{r.year}</td>
                <td className="px-2 py-1.5">{r.counting.g ?? "—"}</td>
                <td className="px-2 py-1.5">{r.counting.csAttempted ?? "—"}</td>
                <td className="px-2 py-1.5">{r.counting.csAllowed ?? "—"}</td>
                <td className="px-2 py-1.5">{r.counting.csCaught ?? "—"}</td>
                <td className="px-2 py-1.5">
                  {r.derived.csRate != null
                    ? formatAvgDisplay(r.derived.csRate)
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StandingsView({
  standings,
}: {
  standings: DemoImportStore["standings"];
}) {
  if (!standings) return <Empty text="チーム順位のデモデータはありません" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(
        [
          { title: "セ・リーグ", rows: standings.central },
          { title: "パ・リーグ", rows: standings.pacific },
        ] as const
      ).map((block) => (
        <div
          key={block.title}
          className="overflow-x-auto rounded-xl border border-white/10 bg-black/40"
        >
          <p className="border-b border-white/10 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]">
            {block.title}（{standings.year}）
          </p>
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="text-white/50">
                {["順位", "球団", "勝", "敗", "分", "勝率", "差"].map((h) => (
                  <th key={h} className="px-2 py-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r) => (
                <tr key={r.team} className="border-t border-white/5 text-white/85">
                  <td className="px-2 py-1">{r.rank}</td>
                  <td className="px-2 py-1">{r.team}</td>
                  <td className="px-2 py-1">{r.w}</td>
                  <td className="px-2 py-1">{r.l}</td>
                  <td className="px-2 py-1">{r.d}</td>
                  <td className="px-2 py-1">{r.pct}</td>
                  <td className="px-2 py-1">{r.gb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function TeamBattingView({
  rows,
}: {
  rows: DemoImportStore["teamStats"];
}) {
  if (rows.length === 0) return <Empty text="チーム打撃のデモデータはありません" />;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <table className="min-w-max text-left text-[12px]">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            {["球団", "年度", "試合", "打数", "安打", "本塁打", "打点", "打率", "OPS"].map(
              (h) => (
                <th key={h} className="px-2 py-2">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/5 text-white/85">
              <td className="px-2 py-1.5">{r.teamName}</td>
              <td className="px-2 py-1.5">{r.year}</td>
              <td className="px-2 py-1.5">{r.batting?.counting.g ?? "—"}</td>
              <td className="px-2 py-1.5">{r.batting?.counting.ab ?? "—"}</td>
              <td className="px-2 py-1.5">{r.batting?.counting.h ?? "—"}</td>
              <td className="px-2 py-1.5">{r.batting?.counting.hr ?? "—"}</td>
              <td className="px-2 py-1.5">{r.batting?.counting.rbi ?? "—"}</td>
              <td className="px-2 py-1.5">
                {r.batting?.derived.avg != null
                  ? formatAvgDisplay(r.batting.derived.avg)
                  : "—"}
              </td>
              <td className="px-2 py-1.5">
                {r.batting?.derived.ops != null
                  ? r.batting.derived.ops.toFixed(3)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamPitchingView({
  rows,
}: {
  rows: DemoImportStore["teamStats"];
}) {
  if (rows.length === 0) return <Empty text="チーム投手のデモデータはありません" />;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <table className="min-w-max text-left text-[12px]">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            {["球団", "年度", "登板", "勝", "敗", "投球回", "防御率", "奪三振"].map(
              (h) => (
                <th key={h} className="px-2 py-2">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/5 text-white/85">
              <td className="px-2 py-1.5">{r.teamName}</td>
              <td className="px-2 py-1.5">{r.year}</td>
              <td className="px-2 py-1.5">{r.pitching?.counting.g ?? "—"}</td>
              <td className="px-2 py-1.5">{r.pitching?.counting.w ?? "—"}</td>
              <td className="px-2 py-1.5">{r.pitching?.counting.l ?? "—"}</td>
              <td className="px-2 py-1.5">
                {r.pitching
                  ? outsToIpDisplay(r.pitching.counting.ipOuts)
                  : "—"}
              </td>
              <td className="px-2 py-1.5">
                {r.pitching?.derived.era != null
                  ? r.pitching.derived.era.toFixed(2)
                  : "—"}
              </td>
              <td className="px-2 py-1.5">{r.pitching?.counting.so ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyMvpView({
  rows,
}: {
  rows: DemoImportStore["monthlyMvp"];
}) {
  if (rows.length === 0) return <Empty text="月間MVPのデモデータはありません" />;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[12px] text-white/80"
        >
          <p className="text-[color:var(--museum-accent,#d4af37)]">
            {r.year}年{r.month}月 {r.league === "central" ? "セ" : "パ"}
          </p>
          <p className="mt-1">
            投手: {r.pitcher.playerName}（{r.pitcher.teamName}） ERA{" "}
            {r.pitcher.era} {r.pitcher.wins}勝{r.pitcher.losses}敗
          </p>
          <p>
            野手: {r.batter.playerName}（{r.batter.teamName}）{" "}
            {formatAvgDisplay(r.batter.avg)} {r.batter.hr}本 {r.batter.rbi}点
          </p>
        </li>
      ))}
    </ul>
  );
}

function AwardsView({
  awards,
  titles,
}: {
  awards: DemoImportStore["awards"];
  titles: DemoImportStore["titleWins"];
}) {
  if (awards.length === 0 && titles.length === 0) {
    return <Empty text="表彰のデモデータはありません" />;
  }
  return (
    <div className="space-y-3 text-[12px] text-white/80">
      {awards.map((a) => (
        <p key={a.id} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2">
          {a.year} {a.kind} — {a.playerName}
          {a.teamShort ? `（${a.teamShort}）` : ""}
        </p>
      ))}
      {titles.map((t) => (
        <p
          key={`${t.titleId}-${t.year}-${t.league}-${t.playerId}`}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"
        >
          {t.year} タイトル {t.titleId}（{t.league}） — {t.playerId}
        </p>
      ))}
    </div>
  );
}

function SpecialView({
  rows,
}: {
  rows: DemoImportStore["achievements"];
}) {
  if (rows.length === 0) return <Empty text="特別記録のデモデータはありません" />;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[12px] text-white/80"
        >
          {r.season} {r.recordName} — {r.playerName}（{r.teamShort}）
          {r.valueLabel ? ` / ${r.valueLabel}` : ""}
          <span className="ml-2 text-white/40">{r.sopPoints}pt</span>
        </li>
      ))}
    </ul>
  );
}

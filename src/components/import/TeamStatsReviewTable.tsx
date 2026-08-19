"use client";

import {
  battingFieldLabel,
  pitchingFieldLabel,
} from "@/data/teamSeasonStats/columns";
import {
  TEAM_BATTING_FIELD_KEYS,
  TEAM_PITCHING_FIELD_KEYS,
} from "@/data/teamSeasonStats/types";
import type { TeamStatPartial } from "@/lib/import/parseTeamSeasonOcr";

type TeamStatsReviewTableProps = {
  kind: "batting" | "pitching";
  rows: TeamStatPartial[];
  onChangeField: (index: number, key: string, raw: string) => void;
};

/**
 * チーム打撃／投手の確認表。
 * 正式項目キー・順序・日本語ラベルを teamSeasonStats 定義から共有する。
 * ペナント／交流戦で同一 UI（competition は保存時のみ分岐）。
 */
export function TeamStatsReviewTable({
  kind,
  rows,
  onChangeField,
}: TeamStatsReviewTableProps) {
  const keys =
    kind === "batting"
      ? [...TEAM_BATTING_FIELD_KEYS]
      : [...TEAM_PITCHING_FIELD_KEYS];
  const labelOf = kind === "batting" ? battingFieldLabel : pitchingFieldLabel;

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-black/40 px-4 py-8 text-center text-[12px] text-white/45">
        画像を読み込むか相棒データを展開すると、球団ごとの確認表が表示されます。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <table className="min-w-max text-left text-[12px]">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            <th className="sticky left-0 z-10 bg-[#0c0c0c] px-2 py-2">球団</th>
            {keys.map((k) => (
              <th key={k} className="whitespace-nowrap px-2 py-2">
                {labelOf(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.teamId ?? row.teamShort}
              className="border-t border-white/5"
            >
              <td className="sticky left-0 z-10 bg-[#0c0c0c] px-2 py-1.5 text-white">
                {row.teamShort}
              </td>
              {keys.map((k) => (
                <td key={k} className="px-2 py-1">
                  <input
                    className="w-16 rounded border border-white/10 bg-black/50 px-1 py-1 text-white"
                    value={row.fields[k]?.raw ?? ""}
                    onChange={(e) => onChangeField(i, k, e.target.value)}
                    aria-label={`${row.teamShort} ${labelOf(k)}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

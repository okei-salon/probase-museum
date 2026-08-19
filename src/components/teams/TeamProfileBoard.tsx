"use client";

import { useEffect, useMemo, useState } from "react";
import { buildTeamProfileSummary } from "@/data/teamDetail";
import type { TeamId } from "@/data/teams";

type Props = { teamId: TeamId };

export function TeamProfileBoard({ teamId }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, [teamId]);

  const profile = useMemo(
    () => (ready ? buildTeamProfileSummary(teamId) : null),
    [ready, teamId],
  );

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }
  if (!profile) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        球団情報を取得できませんでした。
      </p>
    );
  }

  const hasAny =
    profile.careerW != null ||
    profile.leagueTitles != null ||
    profile.csAppearances != null ||
    profile.bestRank != null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] tracking-[0.18em] text-museum-ivory-soft">
          TEAM PROFILE
        </p>
        <h3 className="font-display text-[28px] tracking-[0.04em] text-museum-ivory md:text-[32px]">
          {profile.name}
        </h3>
        <p className="text-[14px] text-museum-ivory-soft">{profile.league}</p>
      </header>

      {!hasAny ? (
        <p className="text-[13px] text-museum-ivory-soft">
          表示できる通算・優勝・CSデータはまだありません。チーム成績の登録後に反映されます。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profile.careerW != null && profile.careerL != null ? (
            <StatCard
              label="通算勝敗"
              value={`${profile.careerW}勝${profile.careerL}敗`}
            />
          ) : null}
          {profile.careerWinPctText ? (
            <StatCard label="通算勝率" value={profile.careerWinPctText} />
          ) : null}
          {profile.leagueTitles != null ? (
            <StatCard
              label="リーグ優勝"
              value={`${profile.leagueTitles}回`}
            />
          ) : null}
          {profile.japanTitles != null ? (
            <StatCard
              label="日本一"
              value={`${profile.japanTitles}回`}
            />
          ) : null}
          {profile.csAppearances != null ? (
            <StatCard
              label="CS進出"
              value={`${profile.csAppearances}回`}
              sub={
                profile.seasonsTracked > 0
                  ? `全${profile.seasonsTracked}シーズン中`
                  : undefined
              }
            />
          ) : null}
          {profile.csAppearanceRateText ? (
            <StatCard
              label="CS進出率"
              value={profile.csAppearanceRateText}
            />
          ) : null}
          {profile.bestRank != null ? (
            <StatCard label="最高順位" value={`${profile.bestRank}位`} />
          ) : null}
          {profile.worstRank != null ? (
            <StatCard label="最低順位" value={`${profile.worstRank}位`} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/12 bg-black/50 px-4 py-3">
      <p className="text-[10px] tracking-[0.14em] text-museum-ivory-soft">
        {label}
      </p>
      <p className="mt-1 font-display text-[22px] text-[color:var(--museum-accent,#d4af37)]">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-[11px] text-museum-ivory-soft">{sub}</p>
      ) : null}
    </div>
  );
}

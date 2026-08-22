/**
 * ログイン後クライアントで正式 Museum データを Neon から hydrate する。
 * local にしか無い行は await でアップロードする（各ストアの sync 実装）。
 *
 * 認証前に一度だけ走ると PUT が失敗したまま終わるため、
 * /api/auth/me が authenticated になるまで待ってから同期する。
 */

"use client";

import { useEffect, useRef } from "react";

async function waitUntilAuthenticated(
  signal: { cancelled: boolean },
): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    if (signal.cancelled) return false;
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        authenticated?: boolean;
      } | null;
      if (data?.authenticated) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

export function MuseumCloudBootstrap() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const signal = { cancelled: false };

    void (async () => {
      const authed = await waitUntilAuthenticated(signal);
      if (!authed || signal.cancelled) return;

      try {
        const [
          { hydrateTeamStandingsFromCloud },
          { hydratePennantMatchupsFromCloud },
          { syncStandingsHistoryWithCloud },
          { syncTeamSeasonStatsWithCloud },
          { hydrateSeasonLinesFromCloud },
          { hydrateMonthlyMvpFromCloud },
          { hydrateInterleagueFromCloud },
          { hydratePostseasonFromCloud },
          { hydrateYearbookReviewsFromCloud },
          { hydrateSeasonAchievementsFromCloud },
          { hydrateSopAwardsFromCloud },
          { hydrateTitleWinHistoryFromCloud },
          { hydratePlayerMasterFromCloud },
          { hydrateSopFeatsFromCloud },
        ] = await Promise.all([
          import("@/data/teamStandings"),
          import("@/data/pennantMatchups"),
          import("@/data/standingsHistory"),
          import("@/data/teamSeasonStats"),
          import("@/data/playerSeasonLines"),
          import("@/data/import/store"),
          import("@/data/interleague"),
          import("@/data/postseason"),
          import("@/data/yearbook"),
          import("@/data/seasonAchievements"),
          import("@/data/sop/awardsRegistry"),
          import("@/data/titleRankings/history"),
          import("@/data/playerMaster"),
          import("@/data/sop/featsStore"),
        ]);

        // 順位推移・チーム成績は必ず await 同期（未同期 local → Neon）
        await Promise.all([
          syncStandingsHistoryWithCloud(),
          syncTeamSeasonStatsWithCloud(),
        ]);

        await Promise.all([
          hydrateTeamStandingsFromCloud(),
          hydratePennantMatchupsFromCloud(),
          hydrateSeasonLinesFromCloud(),
          hydrateMonthlyMvpFromCloud(),
          hydrateInterleagueFromCloud(),
          hydratePostseasonFromCloud(),
          hydrateYearbookReviewsFromCloud(),
          hydrateSeasonAchievementsFromCloud(),
          hydrateSopAwardsFromCloud(),
          hydrateTitleWinHistoryFromCloud(),
          hydratePlayerMasterFromCloud(),
          hydrateSopFeatsFromCloud(),
        ]);
      } catch {
        // オフライン時は静かにスキップ（各画面の個別 hydrate に任せる）
      }
    })();

    return () => {
      signal.cancelled = true;
    };
  }, []);

  return null;
}

/**
 * ログイン後クライアントで正式 Museum データを Neon から hydrate する。
 * local にしか無い行は裏でアップロードする（各ストアの hydrate 実装）。
 */

"use client";

import { useEffect, useRef } from "react";

export function MuseumCloudBootstrap() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        const [
          { hydrateTeamStandingsFromCloud },
          { hydratePennantMatchupsFromCloud },
          { hydrateStandingsHistoryFromCloud },
          { hydrateTeamSeasonStatsFromCloud },
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

        await Promise.all([
          hydrateTeamStandingsFromCloud(),
          hydratePennantMatchupsFromCloud(),
          hydrateStandingsHistoryFromCloud(),
          hydrateTeamSeasonStatsFromCloud(),
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
        // オフライン・未ログイン時は静かにスキップ（各画面の個別 hydrate に任せる）
      }
    })();
  }, []);

  return null;
}

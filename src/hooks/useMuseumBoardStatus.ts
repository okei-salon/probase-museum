"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeImportDemoMode } from "@/data/import/demoMode";
import {
  getMuseumCloudLoadState,
  subscribeMuseumCloudLoad,
} from "@/data/museumCloudLoadState";
import {
  MUSEUM_BOARD_ERROR_MESSAGE,
  MUSEUM_BOARD_LOADING_MESSAGE,
  resolveMuseumBoardDataStatus,
  type MuseumBoardDataStatus,
} from "@/data/museumBoardDataStatus";
import { getSeasonLinesCacheState } from "@/data/playerSeasonLines";

/**
 * Museum ボード共通: ストア／クラウド hydrate 通知を購読し、
 * loading / ready / empty / error を返す。追加の再取得はしない。
 */
export function useMuseumBoardTick(): {
  mounted: boolean;
  tick: number;
} {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const unsubStore = subscribeImportDemoMode(() => setTick((t) => t + 1));
    const unsubLoad = subscribeMuseumCloudLoad(() => setTick((t) => t + 1));
    return () => {
      unsubStore();
      unsubLoad();
    };
  }, []);

  return { mounted, tick };
}

export function useMuseumBoardStatus(hasRows: boolean): {
  mounted: boolean;
  tick: number;
  status: MuseumBoardDataStatus;
  loadingMessage: string;
  errorMessage: string;
} {
  const { mounted, tick } = useMuseumBoardTick();

  const status = useMemo(() => {
    void tick;
    const cache = getSeasonLinesCacheState();
    const cloud = getMuseumCloudLoadState();
    return resolveMuseumBoardDataStatus({
      mounted,
      cloudReady: cloud.phase === "ready" || cache.cloudHydrated,
      hasRows,
      cloudLoadError: cloud.phase === "error",
    });
  }, [mounted, tick, hasRows]);

  const errorMessage =
    getMuseumCloudLoadState().errorMessage ?? MUSEUM_BOARD_ERROR_MESSAGE;

  return {
    mounted,
    tick,
    status,
    loadingMessage: MUSEUM_BOARD_LOADING_MESSAGE,
    errorMessage,
  };
}

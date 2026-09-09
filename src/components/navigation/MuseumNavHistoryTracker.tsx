"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  museumLocationKey,
  syncMuseumNavHistory,
} from "@/lib/navigation/museumNavHistory";

function MuseumNavHistoryTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  useEffect(() => {
    if (!pathname) return;
    syncMuseumNavHistory(museumLocationKey(pathname, search));
  }, [pathname, search]);

  return null;
}

/** ルートレイアウトに置き、Museum 内遷移を session 履歴へ記録する */
export function MuseumNavHistoryTracker() {
  return (
    <Suspense fallback={null}>
      <MuseumNavHistoryTrackerInner />
    </Suspense>
  );
}

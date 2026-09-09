"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { canMuseumGoBack } from "@/lib/navigation/museumNavHistory";

/**
 * Museum 共通の「戻る」。
 * 履歴があれば router.back()（新規 push しない）、無ければ fallback へ。
 */
export function useMuseumBack() {
  const router = useRouter();

  const goBack = useCallback(
    (fallbackHref: string) => {
      if (canMuseumGoBack()) {
        router.back();
        return;
      }
      router.push(fallbackHref);
    },
    [router],
  );

  const onBackClick = useCallback(
    (
      fallbackHref: string,
      event?: React.MouseEvent<HTMLAnchorElement>,
    ) => {
      if (
        event &&
        (event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0)
      ) {
        // 新しいタブ等は fallback の href をそのまま使う
        return;
      }
      if (!canMuseumGoBack()) {
        // 通常の Link 遷移（fallback）に任せる
        return;
      }
      event?.preventDefault();
      router.back();
    },
    [router],
  );

  return { goBack, onBackClick };
}

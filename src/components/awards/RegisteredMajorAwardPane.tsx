"use client";

import { useMemo } from "react";
import {
  AwardWinnerCard,
  LeagueTwoColumn,
} from "@/components/awards/AwardCards";
import {
  identityFromSeasonKey,
  resolveMvpBoard,
  resolveRookieBoard,
  resolveSawamuraBoard,
} from "@/data/sop/seasonAwardsView";

type Kind = "mvp" | "rookie" | "sawamura";

export function RegisteredMajorAwardPane({
  year,
  seasonKey,
  kind,
  badge,
}: {
  year: string;
  seasonKey: string;
  kind: Kind;
  badge: string;
}) {
  const identity = useMemo(
    () => identityFromSeasonKey(seasonKey, year),
    [seasonKey, year],
  );
  const data = useMemo(() => {
    if (kind === "rookie") return resolveRookieBoard(identity);
    if (kind === "sawamura") return resolveSawamuraBoard(identity);
    return resolveMvpBoard(identity);
  }, [kind, identity]);

  return (
    <LeagueTwoColumn
      central={data.central}
      pacific={data.pacific}
      render={(c) => <AwardWinnerCard card={c} badge={badge} />}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import { DataPanel } from "@/components/category";
import { MatchMatrix } from "@/components/views";
import {
  allowsLayoutSampleFallback,
  parseSeasonKey,
} from "@/data/seasons";
import {
  cardsToSquareMatrix,
  type PennantMatchupsRecord,
} from "@/data/pennantMatchups";
import {
  centralMatrix,
  pacificMatrix,
} from "@/data/seasonViews";

type PennantMatchupsBoardProps = {
  seasonKey: string;
};

/**
 * リーグ内対戦表（セ・パ）。
 * 表示時にクラウド hydrate。正式 WORLD は未登録なら空メッセージ。
 */
export function PennantMatchupsBoard({ seasonKey }: PennantMatchupsBoardProps) {
  const identity = parseSeasonKey(seasonKey);
  const showSample = allowsLayoutSampleFallback(identity);
  const [central, setCentral] = useState<PennantMatchupsRecord | null>(null);
  const [pacific, setPacific] = useState<PennantMatchupsRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!identity) {
        setReady(true);
        return;
      }
      const { hydratePennantMatchupsFromCloud, getPennantMatchups } =
        await import("@/data/pennantMatchups");
      await hydratePennantMatchupsFromCloud();
      if (cancelled) return;
      setCentral(getPennantMatchups(identity, "central"));
      setPacific(getPennantMatchups(identity, "pacific"));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seasonKey drives identity
  }, [seasonKey]);

  if (!ready) {
    return (
      <DataPanel>
        <p className="text-[13px] text-museum-ivory-soft">対戦表を読み込み中…</p>
      </DataPanel>
    );
  }

  const hasCentral = (central?.cards.length ?? 0) > 0;
  const hasPacific = (pacific?.cards.length ?? 0) > 0;

  if (!hasCentral && !hasPacific) {
    if (showSample) {
      return (
        <div className="grid gap-3 lg:grid-cols-2">
          <DataPanel>
            <MatchMatrix
              title="セ・リーグ対戦表"
              teams={centralMatrix.teams}
              cells={centralMatrix.cells}
            />
          </DataPanel>
          <DataPanel>
            <MatchMatrix
              title="パ・リーグ対戦表"
              teams={pacificMatrix.teams}
              cells={pacificMatrix.cells}
            />
          </DataPanel>
        </div>
      );
    }
    return (
      <DataPanel>
        <p className="text-[13px] text-museum-ivory-soft">
          リーグ内対戦成績はまだ登録されていません。
        </p>
      </DataPanel>
    );
  }

  const clMatrix = hasCentral
    ? cardsToSquareMatrix("central", central!.cards)
    : null;
  const plMatrix = hasPacific
    ? cardsToSquareMatrix("pacific", pacific!.cards)
    : null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {clMatrix ? (
        <DataPanel>
          <MatchMatrix
            title="セ・リーグ対戦表"
            teams={clMatrix.teams}
            cells={clMatrix.cells}
          />
        </DataPanel>
      ) : null}
      {plMatrix ? (
        <DataPanel>
          <MatchMatrix
            title="パ・リーグ対戦表"
            teams={plMatrix.teams}
            cells={plMatrix.cells}
          />
        </DataPanel>
      ) : null}
      {!clMatrix || !plMatrix ? (
        <DataPanel>
          <p className="text-[13px] text-museum-ivory-soft">
            {!clMatrix
              ? "セ・リーグ対戦表は未登録です。"
              : "パ・リーグ対戦表は未登録です。"}
          </p>
        </DataPanel>
      ) : null}
    </div>
  );
}

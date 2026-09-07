"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import { searchPlayerDirectory } from "@/data/players/directory";
import { cn } from "@/lib/cn";

/** 選手名検索：入力があるときだけ実データを表示（初期は空） */
export function PlayerNameSearchBoard() {
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    hydratePlayerMasterFromStorage();
    setReady(true);
  }, []);

  const results = useMemo(() => {
    if (!ready) return [];
    return searchPlayerDirectory(query, 50);
  }, [ready, query]);

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-[11px] tracking-[0.08em] text-[color:var(--museum-accent,#d4af37)]">
          選手名
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例：村上 / むらかみ / 佐藤"
          className={cn(
            "w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5",
            "text-[14px] text-museum-ivory placeholder:text-white/35",
            "outline-none focus:border-[color:var(--museum-accent-border,#d4af3773)]",
          )}
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {!query.trim() ? (
        <p className="text-[12px] text-museum-ivory-soft">
          名前を入力すると、Museum内の選手から検索します。移籍・過去所属・架空選手も名前から探せます。
        </p>
      ) : results.length === 0 ? (
        <p className="text-[12px] text-museum-ivory-soft">
          「{query.trim()}」に一致する選手は見つかりませんでした。
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((p) => (
            <li key={p.playerId}>
              <Link
                href={`/players/${p.playerId}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-3 py-3",
                  "transition-colors hover:border-white/25 hover:bg-black/70",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-museum-ivory">
                    {p.fullName}
                  </p>
                  <p className="mt-0.5 text-[12px] text-museum-ivory-soft">
                    {p.teamShort ?? "無所属"}
                    {" / "}
                    {p.role === "pitcher" ? "投手" : "野手"}
                    {p.position && p.position !== "—"
                      ? `（${p.position}）`
                      : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

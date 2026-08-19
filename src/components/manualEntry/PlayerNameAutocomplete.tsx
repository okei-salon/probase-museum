"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import {
  searchPlayerMasterCandidates,
  type PlayerSearchHit,
} from "@/lib/manualEntry/searchPlayers";
import { cn } from "@/lib/cn";

type PlayerNameAutocompleteProps = {
  year: number;
  value: string;
  selected: PlayerSearchHit | null;
  onQueryChange: (query: string) => void;
  onSelect: (hit: PlayerSearchHit) => void;
  onClear: () => void;
};

export function PlayerNameAutocomplete({
  year,
  value,
  selected,
  onQueryChange,
  onSelect,
  onClear,
}: PlayerNameAutocompleteProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydratePlayerMasterFromStorage();
  }, []);

  const hits = useMemo(() => {
    if (selected) return [];
    return searchPlayerMasterCandidates(value, year, 12);
  }, [value, year, selected]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-[11px] tracking-[0.1em] text-white/55">
        対象選手
      </label>
      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--museum-accent,#d4af37)]/50 bg-[color:var(--museum-accent,#d4af37)]/10 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-white">
              {selected.player.fullName}
            </p>
            <p className="text-[12px] text-white/65">
              {selected.teamShort} · ID: {selected.player.playerId}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="shrink-0 rounded-md border border-white/20 px-2 py-1 text-[11px] text-white/70 hover:border-white/40"
          >
            変更
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={value}
            autoComplete="off"
            role="combobox"
            aria-expanded={open && hits.length > 0}
            aria-controls={listId}
            placeholder="例：佐藤（部分一致・かな可）"
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[14px] text-white outline-none focus:border-[color:var(--museum-accent,#d4af37)]/60"
          />
          {open && value.trim() && hits.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-white/15 bg-[#0b1220] shadow-xl"
            >
              {hits.map((hit) => (
                <li key={hit.player.playerId}>
                  <button
                    type="button"
                    role="option"
                    className={cn(
                      "flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-[13px] hover:bg-[color:var(--museum-accent,#d4af37)]/15",
                    )}
                    onClick={() => {
                      onSelect(hit);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-white">
                      {hit.player.fullName}
                    </span>
                    <span className="shrink-0 text-white/55">
                      {hit.teamShort}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {open && value.trim() && hits.length === 0 ? (
            <p className="mt-1 text-[12px] text-white/45">
              候補がありません。漢字または「さとう」などで検索してください。
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

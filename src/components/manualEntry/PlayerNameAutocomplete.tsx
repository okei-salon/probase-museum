"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import {
  searchPlayerMasterCandidates,
  type PlayerSearchHit,
} from "@/lib/manualEntry/searchPlayers";
import { cn } from "@/lib/cn";

type PlayerNameAutocompleteProps = {
  year: number;
  value: string;
  /** pick モードで選択確定済みのヒット。freeText では未使用可 */
  selected?: PlayerSearchHit | null;
  onQueryChange: (query: string) => void;
  onSelect: (hit: PlayerSearchHit) => void;
  onClear?: () => void;
  /**
   * pick: 選択後はチップ表示（手入力画面）
   * freeText: 常に入力欄。候補クリックで正式名をセットし自由入力も可（月間MVP確認など）
   */
  mode?: "pick" | "freeText";
  /** ラベル「対象選手」を出さない */
  hideLabel?: boolean;
  /** テーブル内向けの小さめ入力（候補は fixed でクリップ回避） */
  compact?: boolean;
  /** 候補上限（既定: pick=12 / freeText=10） */
  limit?: number;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

export function PlayerNameAutocomplete({
  year,
  value,
  selected = null,
  onQueryChange,
  onSelect,
  onClear,
  mode = "pick",
  hideLabel = false,
  compact = false,
  limit,
  className,
  inputClassName,
  placeholder = "例：佐藤（部分一致・かな可）",
}: PlayerNameAutocompleteProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxHits = limit ?? (mode === "freeText" ? 10 : 12);
  const freeText = mode === "freeText";

  useEffect(() => {
    hydratePlayerMasterFromStorage();
  }, []);

  const hits = useMemo(() => {
    if (!freeText && selected) return [];
    return searchPlayerMasterCandidates(value, year, maxHits);
  }, [value, year, selected, freeText, maxHits]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        const t = e.target as HTMLElement | null;
        if (t?.closest?.(`[data-player-ac-list="${listId}"]`)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [listId]);

  useLayoutEffect(() => {
    if (!open || !compact || !inputRef.current) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (!r) return;
      setMenuPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 192),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, compact, value, hits.length]);

  function choose(hit: PlayerSearchHit) {
    onSelect(hit);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[activeIndex];
      if (hit) choose(hit);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const showPickChip = !freeText && selected;
  const showList = open && value.trim() && hits.length > 0;

  const listEl = showList ? (
    <ul
      id={listId}
      data-player-ac-list={listId}
      role="listbox"
      className={cn(
        "max-h-56 overflow-auto rounded-lg border border-white/15 bg-[#0b1220] shadow-xl",
        compact ? "text-[12px]" : "absolute z-30 mt-1 w-full min-w-[12rem] text-[13px]",
      )}
      style={
        compact && menuPos
          ? {
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 80,
            }
          : undefined
      }
    >
      {hits.map((hit, i) => (
        <li key={hit.player.playerId}>
          <button
            type="button"
            id={`${listId}-opt-${i}`}
            role="option"
            aria-selected={i === activeIndex}
            className={cn(
              "flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left hover:bg-[color:var(--museum-accent,#d4af37)]/15",
              i === activeIndex &&
                "bg-[color:var(--museum-accent,#d4af37)]/15",
            )}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => choose(hit)}
          >
            <span className="font-medium text-white">
              {hit.player.fullName}
            </span>
            <span className="shrink-0 text-white/55">{hit.teamShort}</span>
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {!hideLabel ? (
        <label className="mb-1 block text-[11px] tracking-[0.1em] text-white/55">
          対象選手
        </label>
      ) : null}
      {showPickChip ? (
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--museum-accent,#d4af37)]/50 bg-[color:var(--museum-accent,#d4af37)]/10 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-white">
              {selected!.player.fullName}
            </p>
            <p className="text-[12px] text-white/65">
              {selected!.teamShort} · ID: {selected!.player.playerId}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClear?.();
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
            ref={inputRef}
            type="text"
            value={value}
            autoComplete="off"
            role="combobox"
            aria-expanded={open && hits.length > 0}
            aria-controls={listId}
            aria-activedescendant={
              open && hits[activeIndex]
                ? `${listId}-opt-${activeIndex}`
                : undefined
            }
            placeholder={placeholder}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setActiveIndex(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className={cn(
              "w-full rounded-lg border border-white/15 bg-black/50 text-white outline-none focus:border-[color:var(--museum-accent,#d4af37)]/60",
              compact
                ? "min-w-[7.5rem] px-2 py-1 text-[12px]"
                : "px-3 py-2 text-[14px]",
              inputClassName,
            )}
          />
          {compact && typeof document !== "undefined" && listEl
            ? createPortal(listEl, document.body)
            : listEl}
          {open && value.trim() && hits.length === 0 ? (
            <p
              className={cn(
                "mt-1 text-white/45",
                compact ? "text-[10px]" : "text-[12px]",
              )}
            >
              候補なし（自由入力可）
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

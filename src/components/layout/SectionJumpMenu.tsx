"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MuseumIcon } from "@/components/ui/MuseumIcon";
import { navCards } from "@/data/home";
import { cn } from "@/lib/cn";

type SectionJumpMenuProps = {
  /** SiteHeader 向けのボタン見た目 */
  variant?: "text" | "button";
  className?: string;
};

/**
 * メイン6項目へ直接移動するポップオーバー。
 * 名称・href は home.ts の navCards をそのまま使う。
 */
export function SectionJumpMenu({
  variant = "text",
  className,
}: SectionJumpMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          variant === "button"
            ? "inline-flex h-8 items-center gap-1.5 rounded-md border border-white/25 bg-black/55 px-2.5 text-[11px] text-museum-ivory transition-colors hover:border-museum-gold/50 hover:text-museum-gold"
            : "inline-flex items-center gap-0.5 text-[12px] text-museum-ivory transition-colors hover:text-museum-gold",
        )}
      >
        <MuseumIcon name="globe" size={variant === "button" ? 13 : 12} />
        <span className="sm:hidden">メニュー</span>
        <span className="hidden sm:inline">セクション移動</span>
        <MuseumIcon
          name="chevronDown"
          size={12}
          className={cn(
            "transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="メインセクション"
          className={cn(
            "absolute right-0 z-[60] mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl",
            "border border-white/15 bg-black/92 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md",
          )}
        >
          <ul className="py-1.5">
            {navCards.map((card) => {
              const active =
                pathname === card.href ||
                pathname.startsWith(`${card.href}/`);
              return (
                <li key={card.id} role="none">
                  <Link
                    role="menuitem"
                    href={card.href}
                    scroll
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-start gap-2.5 px-3 py-2.5 transition-colors",
                      active
                        ? "bg-white/10 text-museum-gold"
                        : "text-museum-ivory hover:bg-white/8 hover:text-museum-gold",
                    )}
                  >
                    <MuseumIcon
                      name={card.icon}
                      size={15}
                      className="mt-0.5 shrink-0 opacity-90"
                    />
                    <span className="min-w-0">
                      <span className="block text-[11px] tracking-[0.08em] text-white/55">
                        {card.titleEn}
                      </span>
                      <span className="block text-[13px] font-medium leading-snug">
                        {card.titleJa}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

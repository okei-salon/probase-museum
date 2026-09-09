"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMuseumBack } from "@/hooks/useMuseumBack";

type BackLinkProps = {
  /** アプリ内履歴が無いときの安全な戻り先（従来の親ページ） */
  href: string;
  label: string;
  className?: string;
};

/**
 * Museum 共通ヘッダーの「戻る」。
 * 閲覧履歴があれば直前画面へ（history.back）、無ければ href へ。
 */
export function BackLink({ href, label, className }: BackLinkProps) {
  const { onBackClick } = useMuseumBack();

  return (
    <Link
      href={href}
      onClick={(e) => onBackClick(href, e)}
      className={cn(
        "inline-flex items-center gap-1 text-[13px] text-museum-ivory transition-colors hover:text-museum-gold",
        className,
      )}
    >
      <ChevronLeft className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

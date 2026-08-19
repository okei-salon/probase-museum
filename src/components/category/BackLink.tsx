import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type BackLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export function BackLink({ href, label, className }: BackLinkProps) {
  return (
    <Link
      href={href}
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

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type TextLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  showChevron?: boolean;
};

export function TextLink({
  href,
  children,
  className,
  showChevron = true,
}: TextLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] tracking-[0.06em] text-museum-gold transition-colors duration-300 hover:text-museum-gold-soft",
        className,
      )}
    >
      <span>{children}</span>
      {showChevron ? <ChevronRight className="size-3.5" strokeWidth={1.5} /> : null}
    </Link>
  );
}

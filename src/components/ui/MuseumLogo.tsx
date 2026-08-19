import Link from "next/link";
import { cn } from "@/lib/cn";

type MuseumLogoProps = {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md";
};

function TempleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M24 6L8 16.5V18.5H40V16.5L24 6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5V34.5M19 18.5V34.5M29 18.5V34.5M38 18.5V34.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7 34.5H41V37.5H7V34.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M24 8.5V12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="7" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function MuseumLogo({
  className,
  showTagline = true,
  size = "md",
}: MuseumLogoProps) {
  const compact = size === "sm";

  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <TempleMark
        className={cn(
          compact ? "size-6" : "size-9",
          "shrink-0 text-museum-gold",
        )}
      />
      <span className="flex min-w-0 flex-col">
        {compact ? (
          <>
            <span className="font-display text-sm tracking-[0.14em] text-museum-ivory">
              PROBASE MUSEUM
            </span>
            <span className="mt-0.5 text-[10px] text-museum-ivory-soft">
              プロ野球データ博物館
            </span>
          </>
        ) : (
          <>
            <span className="font-display leading-none tracking-[0.18em]">
              <span className="block text-[11px] text-museum-gold sm:text-xs">
                PROBASE
              </span>
              <span className="mt-0.5 block text-[1.35rem] text-museum-ivory sm:text-[1.55rem]">
                MUSEUM
              </span>
            </span>
            {showTagline ? (
              <span className="mt-1.5 flex flex-col gap-0.5 text-[10px] leading-snug tracking-[0.02em] sm:text-[11px]">
                <span className="text-museum-ivory-muted">
                  プロ野球データ博物館
                </span>
                <span className="text-museum-ivory-soft">
                  数字が語る、感動の軌跡。
                </span>
              </span>
            ) : null}
          </>
        )}
      </span>
    </Link>
  );
}

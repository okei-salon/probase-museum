import { cn } from "@/lib/cn";
import {
  MuseumIcon,
  type MuseumIconName,
} from "@/components/ui/MuseumIcon";

type PageHeadingProps = {
  title: string;
  subtitle?: string;
  icon?: MuseumIconName;
  iconClassName?: string;
  className?: string;
  /** 一覧を1画面に収める画面向けに見出しを小さくする */
  dense?: boolean;
};

export function PageHeading({
  title,
  subtitle,
  icon,
  iconClassName,
  className,
  dense = false,
}: PageHeadingProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3",
        dense ? "mb-3" : "mb-5 md:mb-6",
        className,
      )}
    >
      {icon ? (
        <MuseumIcon
          name={icon}
          size={dense ? 28 : 34}
          className={cn(
            "mt-0.5 text-[color:var(--museum-accent,#d4af37)]",
            iconClassName,
          )}
        />
      ) : null}
      <div className="min-w-0">
        <h1
          className={cn(
            "font-display tracking-[0.04em] text-museum-ivory",
            dense
              ? "text-[clamp(1.45rem,3vw,2rem)]"
              : "text-[clamp(1.75rem,4vw,2.5rem)]",
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={cn(
              "text-museum-ivory-muted",
              dense ? "mt-1 text-[13px]" : "mt-2 text-sm md:text-[15px]",
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

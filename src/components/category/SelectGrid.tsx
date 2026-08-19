import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  MuseumIcon,
  type MuseumIconName,
} from "@/components/ui/MuseumIcon";

export type SelectGridItem = {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: MuseumIconName;
  iconClassName?: string;
  featured?: boolean;
};

type SelectGridProps = {
  items: SelectGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
};

export function SelectGrid({
  items,
  columns = 2,
  className,
}: SelectGridProps) {
  return (
    <div
      className={cn(
        "grid gap-2.5 sm:gap-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 md:grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <SelectGridCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function SelectGridCard({ item }: { item: SelectGridItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-h-[108px] flex-col items-center justify-center rounded-xl border px-3 py-4 text-center transition-colors",
        "bg-black/84 backdrop-blur-md",
        item.featured
          ? "border-museum-gold/70 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.28),rgba(0,0,0,0.86)_70%)]"
          : "border-white/15 hover:border-museum-gold/45",
      )}
    >
      {item.icon ? (
        <MuseumIcon
          name={item.icon}
          size={26}
          className={cn("mb-2 text-museum-gold", item.iconClassName)}
        />
      ) : null}
      <p
        className={cn(
          "text-[15px] font-semibold leading-tight tracking-[0.04em]",
          item.featured ? "text-museum-ivory" : "text-museum-ivory",
          item.icon ? "text-museum-gold" : "text-museum-ivory",
        )}
      >
        {item.title}
      </p>
      {item.subtitle ? (
        <p className="mt-1 text-[11px] tracking-[0.12em] text-museum-ivory-muted">
          {item.subtitle}
        </p>
      ) : null}
      {item.description ? (
        <p className="mt-1.5 text-[10px] leading-snug text-museum-ivory-soft">
          {item.description}
        </p>
      ) : null}
    </Link>
  );
}

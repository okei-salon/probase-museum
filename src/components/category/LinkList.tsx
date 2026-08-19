import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  MuseumIcon,
  type MuseumIconName,
} from "@/components/ui/MuseumIcon";

export type LinkListItemData = {
  id: string;
  href: string;
  title: string;
  description?: string;
  icon?: MuseumIconName;
  iconClassName?: string;
};

type LinkListProps = {
  items: LinkListItemData[];
  className?: string;
  /** 1枚のガラスパネル内に区切り線で並べる（表彰一覧など） */
  united?: boolean;
  /** 行の上下余白を広げた一覧（タイトル・表彰トップ向け） */
  comfortable?: boolean;
};

export function LinkList({
  items,
  className,
  united = false,
  comfortable = false,
}: LinkListProps) {
  if (united) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-black/85 backdrop-blur-md",
          "border-[color:var(--museum-accent-border,rgba(255,255,255,0.15))]",
          className,
        )}
      >
        <ul className="divide-y divide-white/10">
          {items.map((item) => (
            <li key={item.id}>
              <LinkRow
                item={item}
                comfortable={comfortable}
                className="rounded-none border-0 bg-transparent"
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className={cn(comfortable ? "space-y-3" : "space-y-2", className)}>
      {items.map((item) => (
        <li key={item.id}>
          <LinkRow item={item} comfortable={comfortable} />
        </li>
      ))}
    </ul>
  );
}

type LinkListGroupProps = {
  title: string;
  items: LinkListItemData[];
  className?: string;
};

export function LinkListGroup({ title, items, className }: LinkListGroupProps) {
  return (
    <section className={cn("mb-5 last:mb-0", className)}>
      <h2 className="mb-2 text-sm font-medium text-museum-ivory">{title}</h2>
      <LinkList items={items} />
    </section>
  );
}

function LinkRow({
  item,
  className,
  comfortable = false,
}: {
  item: LinkListItemData;
  className?: string;
  comfortable?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-black/85 backdrop-blur-md transition-colors",
        comfortable ? "gap-3.5 px-4 py-5 md:px-5" : "px-3.5 py-3.5",
        "border-white/15 hover:border-[color:var(--museum-accent-border,#d4af3773)]",
        "hover:bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.12))]",
        className,
      )}
    >
      {item.icon ? (
        <MuseumIcon
          name={item.icon}
          size={comfortable ? 24 : 22}
          className={cn(
            "text-[color:var(--museum-accent,#d4af37)]",
            item.iconClassName,
          )}
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-medium text-museum-ivory",
            comfortable ? "text-[15px] md:text-[16px]" : "text-[14px]",
          )}
        >
          {item.title}
        </span>
        {item.description ? (
          <span
            className={cn(
              "mt-0.5 block leading-snug text-museum-ivory-soft",
              comfortable ? "mt-1 text-[12px]" : "text-[11px]",
            )}
          >
            {item.description}
          </span>
        ) : null}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-museum-ivory-soft"
        strokeWidth={1.75}
        aria-hidden
      />
    </Link>
  );
}

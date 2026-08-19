import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  getDemoSeasonItem,
  getWorldSeasonItems,
  type SeasonWorld,
} from "@/data/seasons";
import type { SelectGridItem } from "@/components/category/SelectGrid";

/**
 * SEASONS トップ：BLUE / RED 二列レイアウト。
 * 博物館の黒×ゴールドを基調に、WORLD を薄い色で区別する。
 */
export function SeasonsWorldGrid() {
  return (
    <div className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <WorldColumn world="BLUE" items={getWorldSeasonItems("BLUE")} />
        <WorldColumn world="RED" items={getWorldSeasonItems("RED")} />
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="mb-3 text-[11px] tracking-[0.16em] text-museum-ivory-muted">
          DEMO / 連携テスト
        </p>
        <div className="max-w-xs">
          <SeasonYearCard item={getDemoSeasonItem()} tone="demo" />
        </div>
      </div>
    </div>
  );
}

function WorldColumn({
  world,
  items,
}: {
  world: SeasonWorld;
  items: SelectGridItem[];
}) {
  const isBlue = world === "BLUE";
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 md:p-5",
        isBlue
          ? "border-[color:rgba(130,175,220,0.32)] bg-[radial-gradient(ellipse_at_top,rgba(110,160,210,0.14),rgba(0,0,0,0.72)_58%)] shadow-[0_0_32px_rgba(110,160,210,0.08)]"
          : "border-[color:rgba(200,120,110,0.30)] bg-[radial-gradient(ellipse_at_top,rgba(190,110,100,0.13),rgba(0,0,0,0.72)_58%)] shadow-[0_0_32px_rgba(190,110,100,0.08)]",
      )}
    >
      <header className="mb-4 text-center">
        <p
          className={cn(
            "text-[13px] font-semibold tracking-[0.22em]",
            isBlue ? "text-[#b8d0ec]" : "text-[#e0c0b4]",
          )}
        >
          {world}
        </p>
        <p className="mt-1 text-[10px] tracking-[0.12em] text-museum-ivory-muted">
          {isBlue ? "BLUE WORLD" : "RED WORLD"}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
        {items.map((item) => (
          <SeasonYearCard
            key={item.id}
            item={item}
            tone={isBlue ? "blue" : "red"}
          />
        ))}
      </div>
    </section>
  );
}

function SeasonYearCard({
  item,
  tone,
}: {
  item: SelectGridItem;
  tone: "blue" | "red" | "demo";
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-h-[100px] flex-col items-center justify-center rounded-xl border px-3 py-4 text-center transition-colors backdrop-blur-md",
        tone === "blue" &&
          "border-[color:rgba(130,175,220,0.28)] bg-black/78 hover:border-[color:rgba(130,175,220,0.55)] hover:bg-[radial-gradient(ellipse_at_center,rgba(110,160,210,0.16),rgba(0,0,0,0.88)_70%)]",
        tone === "red" &&
          "border-[color:rgba(200,120,110,0.26)] bg-black/78 hover:border-[color:rgba(200,120,110,0.52)] hover:bg-[radial-gradient(ellipse_at_center,rgba(190,110,100,0.15),rgba(0,0,0,0.88)_70%)]",
        tone === "demo" &&
          "border-museum-gold/55 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22),rgba(0,0,0,0.86)_70%)] hover:border-museum-gold/70",
      )}
    >
      <p className="text-[18px] font-semibold tracking-[0.06em] text-museum-ivory md:text-[20px]">
        {item.title}
      </p>
      {item.subtitle ? (
        <p
          className={cn(
            "mt-1.5 text-[11px] tracking-[0.14em]",
            tone === "blue" && "text-[#a8c4e0]",
            tone === "red" && "text-[#d8b8ac]",
            tone === "demo" && "text-museum-gold/90",
          )}
        >
          {item.subtitle}
        </p>
      ) : null}
    </Link>
  );
}

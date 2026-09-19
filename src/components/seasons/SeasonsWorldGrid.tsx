import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  getWorldSeasonItems,
  type SeasonWorld,
} from "@/data/seasons";
import type { SelectGridItem } from "@/components/category/SelectGrid";

/**
 * SEASONS トップ：BLUE / RED 二列レイアウト。
 * 正式年度（formalSeasonYears）のみ表示。2000 DEMO は内部テスト用のため通常一覧には出さない。
 */
export function SeasonsWorldGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      <WorldColumn world="BLUE" items={getWorldSeasonItems("BLUE")} />
      <WorldColumn world="RED" items={getWorldSeasonItems("RED")} />
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
          : "border-[color:rgba(180,90,78,0.34)] bg-[radial-gradient(ellipse_at_top,rgba(90,36,40,0.22),rgba(0,0,0,0.82)_58%)] shadow-[0_0_32px_rgba(90,36,40,0.12)]",
      )}
    >
      <header className="mb-4 text-center">
        <p
          className={cn(
            "text-[13px] font-semibold tracking-[0.22em]",
            isBlue ? "text-[#b8d0ec]" : "text-[#e8907a]",
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
  tone: "blue" | "red";
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-h-[100px] flex-col items-center justify-center rounded-xl border px-3 py-4 text-center transition-colors backdrop-blur-md",
        tone === "blue" &&
          "border-[color:rgba(130,175,220,0.28)] bg-black/78 hover:border-[color:rgba(130,175,220,0.55)] hover:bg-[radial-gradient(ellipse_at_center,rgba(110,160,210,0.16),rgba(0,0,0,0.88)_70%)]",
        tone === "red" &&
          "border-[color:rgba(180,90,78,0.32)] bg-black/82 hover:border-[color:rgba(232,144,122,0.48)] hover:bg-[radial-gradient(ellipse_at_center,rgba(90,36,40,0.22),rgba(0,0,0,0.90)_70%)]",
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
            tone === "red" && "text-[#e8907a]",
          )}
        >
          {item.subtitle}
        </p>
      ) : null}
    </Link>
  );
}

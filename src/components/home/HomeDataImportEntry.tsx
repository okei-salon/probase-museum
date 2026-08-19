import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { MuseumIcon } from "@/components/ui/MuseumIcon";
import { cn } from "@/lib/cn";

/**
 * ホーム下部の管理入口。主要6セクションより控えめに配置。
 */
export function HomeDataImportEntry() {
  return (
    <section aria-label="データ管理" className="pb-5 md:pb-6">
      <Container>
        <Link
          href="/import"
          className={cn(
            "group flex items-center justify-between gap-4",
            "rounded-lg border border-white/12 bg-black/55 px-4 py-3.5",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm",
            "transition-colors hover:border-[color:var(--museum-accent,#d4af37)]/40",
            "md:px-5 md:py-4",
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.16em] text-museum-ivory-soft">
              DATA MANAGEMENT
            </p>
            <p className="mt-1 flex items-center gap-2 text-[14px] text-museum-ivory md:text-[15px]">
              <MuseumIcon
                name="file"
                size={16}
                className="text-[color:var(--museum-accent,#d4af37)]/80"
              />
              データ取込
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-museum-ivory-soft md:text-[12px]">
              シーズン成績・順位・タイトル・記録など、Museumで使う年度データを登録する入口です。
            </p>
          </div>
          <MuseumIcon
            name="chevronRight"
            size={18}
            className="shrink-0 text-museum-ivory-soft transition-colors group-hover:text-[color:var(--museum-accent,#d4af37)]"
          />
        </Link>
      </Container>
    </section>
  );
}

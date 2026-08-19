import Link from "next/link";
import {
  CategoryShell,
  DataPanel,
  PageHeading,
} from "@/components/category";
import { cn } from "@/lib/cn";
import type { CategoryThemeId } from "@/config/categoryThemes";
import {
  getSeasonSummary,
  type SummaryAward,
  type SummaryChampion,
  type SummaryHighlight,
} from "@/data/seasonSummary";
import { FinalStandingsBoard } from "@/components/seasons/FinalStandingsBoard";

type SeasonSummaryPageProps = {
  year: string;
  /** ルート識別子（BLUE_2026 等）。未指定時は year を使用 */
  seasonKey?: string;
  theme?: CategoryThemeId;
  backLabel?: string;
};

/** シーズン年鑑の表紙・展示入口としてのサマリー */
export function SeasonSummaryPage({
  year,
  seasonKey = year,
  theme = "seasonHub",
  backLabel,
}: SeasonSummaryPageProps) {
  const data = getSeasonSummary(year, seasonKey);

  return (
    <CategoryShell
      theme={theme}
      back={{
        href: `/seasons/${seasonKey}`,
        label: backLabel ?? `${year} SEASON`,
      }}
    >
      <PageHeading
        title="サマリー"
        subtitle={`${backLabel ?? `${year}シーズン`}`}
        icon="book"
      />
      <p className="mb-6 -mt-2 text-[13px] tracking-[0.04em] text-museum-ivory-soft md:text-sm">
        「{data.tagline}」
      </p>

      <div className="space-y-8 md:space-y-10">
        <SummarySection
          eyebrow="01"
          title={`${year} SEASON CHAMPIONS`}
          description="シーズンを代表する4つの優勝"
        >
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
            {data.champions.map((item) => (
              <ChampionCard key={item.id} item={item} />
            ))}
          </div>
        </SummarySection>

        <SummarySection
          eyebrow="02"
          title="SEASON AWARDS"
          description="その年を代表する個人表彰"
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.awards.map((item) => (
              <AwardCard key={item.id} item={item} />
            ))}
          </div>
        </SummarySection>

        <SummarySection
          eyebrow="03"
          title="SEASON HIGHLIGHTS"
          description="その年を象徴する記録・出来事"
        >
          {data.highlights.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {data.highlights.map((item) => (
                <HighlightCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <DataPanel>
              <p className="text-[13px] text-museum-ivory-soft">
                このシーズンに展示するハイライトはまだ登録されていません。
              </p>
            </DataPanel>
          )}
        </SummarySection>

        <SummarySection
          eyebrow="04"
          title="FINAL STANDINGS"
          description="最終順位（詳細はペナントレースへ）"
        >
          <FinalStandingsBoard year={year} seasonKey={seasonKey} compact />
          <p className="mt-2 text-right text-[11px]">
            <Link
              href={`/seasons/${seasonKey}/pennant/standings`}
              className="text-museum-gold hover:text-museum-gold-soft"
            >
              詳細な順位表を見る →
            </Link>
          </p>
        </SummarySection>
      </div>
    </CategoryShell>
  );
}

function SummarySection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3 flex items-end justify-between gap-3 border-b border-museum-gold/25 pb-2">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-museum-gold/80">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 font-display text-[clamp(1.15rem,2.4vw,1.45rem)] tracking-[0.06em] text-museum-ivory">
            {title}
          </h2>
        </div>
        <p className="hidden text-[11px] text-museum-ivory-soft sm:block">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

function ChampionCard({ item }: { item: SummaryChampion }) {
  return (
    <article
      className={cn(
        "flex min-h-[118px] flex-col justify-between rounded-xl border px-3 py-3.5 backdrop-blur-md",
        item.featured
          ? "border-museum-gold/65 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.22),rgba(0,0,0,0.88)_72%)]"
          : "border-white/15 bg-black/85",
      )}
    >
      <p
        className={cn(
          "text-[10px] tracking-[0.12em]",
          item.featured ? "text-museum-gold" : "text-museum-ivory-soft",
        )}
      >
        {item.title}
      </p>
      <div>
        <p
          className={cn(
            "font-display text-[clamp(1.05rem,2vw,1.35rem)] leading-tight",
            item.featured ? "text-museum-gold-soft" : "text-museum-ivory",
          )}
        >
          {item.teamName}
        </p>
        {item.note ? (
          <p className="mt-1 text-[10px] text-museum-ivory-soft">{item.note}</p>
        ) : null}
      </div>
    </article>
  );
}

function AwardCard({ item }: { item: SummaryAward }) {
  const content = (
    <>
      <p className="text-[10px] tracking-[0.1em] text-museum-gold">{item.title}</p>
      <p className="mt-2 text-[15px] font-medium text-museum-ivory">
        {item.playerName}
      </p>
      <p className="mt-1 text-[11px] text-museum-ivory-soft">{item.teamName}</p>
    </>
  );

  const className =
    "block rounded-xl border border-white/15 bg-black/85 px-3.5 py-3.5 backdrop-blur-md transition-colors hover:border-museum-gold/40";

  if (item.playerId) {
    return (
      <Link href={`/players/${item.playerId}`} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

function HighlightCard({ item }: { item: SummaryHighlight }) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-museum-gold/30 bg-black/86 px-4 py-4 backdrop-blur-md">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-museum-gold/70 to-transparent" />
      <p className="text-[10px] tracking-[0.16em] text-museum-gold/85">
        EXHIBIT
      </p>
      <h3 className="mt-1.5 text-[15px] font-medium text-museum-ivory">
        {item.title}
      </h3>
      <p className="mt-2 text-[12px] leading-relaxed text-museum-ivory-soft">
        {item.description}
      </p>
      {item.meta ? (
        <p className="mt-3 text-[10px] tracking-[0.08em] text-museum-gold">
          {item.meta}
        </p>
      ) : null}
    </article>
  );
}

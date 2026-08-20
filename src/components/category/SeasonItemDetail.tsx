import {
  CategoryShell,
  DataPanel,
  PageHeading,
} from "@/components/category";
import {
  PlayerStatsExplorer,
  TeamSeasonStatsPanel,
} from "@/components/views";
import { FinalStandingsBoard } from "@/components/seasons/FinalStandingsBoard";
import { InterleagueStandingsBoard } from "@/components/seasons/InterleagueStandingsBoard";
import { PennantMatchupsBoard } from "@/components/seasons/PennantMatchupsBoard";
import { StandingsTrendBoard } from "@/components/seasons/StandingsTrendBoard";
import { InterleagueSopSeasonBoard } from "@/components/sop/InterleagueSopSeasonBoard";
import type { CategoryThemeId } from "@/config/categoryThemes";
import type { MuseumIconName } from "@/components/ui/MuseumIcon";
import {
  allowsLayoutSampleFallback,
  parseSeasonKey,
} from "@/data/seasons";
import { pennantReview } from "@/data/seasonViews";

type SeasonItemDetailProps = {
  year: string;
  section: "pennant" | "interleague";
  item: string;
  title: string;
  subtitle?: string;
  icon?: MuseumIconName;
  iconClassName?: string;
  /** ルート識別子（BLUE_2026 等） */
  seasonKey?: string;
};

const themeBySection: Record<SeasonItemDetailProps["section"], CategoryThemeId> =
  {
    pennant: "pennant",
    interleague: "interleague",
  };

const sectionBackLabel: Record<SeasonItemDetailProps["section"], string> = {
  pennant: "ペナントレース",
  interleague: "交流戦",
};

export function SeasonItemDetail({
  year,
  section,
  item,
  title,
  subtitle,
  icon,
  iconClassName,
  seasonKey = year,
}: SeasonItemDetailProps) {
  const theme = themeBySection[section];

  return (
    <CategoryShell
      theme={theme}
      back={{
        href: `/seasons/${seasonKey}/${section}`,
        label: sectionBackLabel[section],
      }}
    >
      <PageHeading
        title={title}
        subtitle={subtitle ?? `${year}シーズン`}
        icon={icon}
        iconClassName={iconClassName}
      />
      {renderBody(section, item, year, seasonKey)}
    </CategoryShell>
  );
}

function renderBody(
  section: SeasonItemDetailProps["section"],
  item: string,
  year: string,
  seasonKey: string,
) {
  if (section === "pennant") return renderPennant(item, year, seasonKey);
  return renderInterleague(item, year, seasonKey);
}

function renderPennant(item: string, year: string, seasonKey: string) {
  switch (item) {
    case "review":
      return <PennantReviewBody year={year} seasonKey={seasonKey} />;
    case "standings":
      return <PennantStandingsBoard year={year} seasonKey={seasonKey} />;
    case "team-batting":
      return (
        <DataPanel
          title="チーム打撃成績"
          description="セ・パ / 12球団を切替して比較・ソート（打者全項目）"
        >
          <TeamSeasonStatsPanel
            year={year}
            seasonKey={seasonKey}
            kind="batting"
            competition="regular"
          />
        </DataPanel>
      );
    case "team-pitching":
      return (
        <DataPanel
          title="チーム投手成績"
          description="セ・パ / 12球団を切替して比較・ソート（投手19項目）"
        >
          <TeamSeasonStatsPanel
            year={year}
            seasonKey={seasonKey}
            kind="pitching"
            competition="regular"
          />
        </DataPanel>
      );
    default:
      return (
        <DataPanel title="準備中">
          <p className="text-[13px] text-museum-ivory-soft">
            この項目の専用表示は準備中です。
          </p>
        </DataPanel>
      );
  }
}

function PennantReviewBody({
  year,
  seasonKey,
}: {
  year: string;
  seasonKey: string;
}) {
  const identity = parseSeasonKey(seasonKey);
  if (!allowsLayoutSampleFallback(identity)) {
    return (
      <DataPanel>
        <p className="text-[13px] text-museum-ivory-soft">
          ペナントレビューはまだ登録されていません。
        </p>
      </DataPanel>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-museum-ivory-soft">
        レギュラーシーズン（ペナントレース）に特化した振り返りです。シーズン全体の表彰・日本一などは「サマリー」で確認できます。
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <DataPanel title={pennantReview.central.title}>
          <p className="text-[13px] leading-relaxed text-museum-ivory-muted">
            {pennantReview.central.body}
          </p>
        </DataPanel>
        <DataPanel title={pennantReview.pacific.title}>
          <p className="text-[13px] leading-relaxed text-museum-ivory-muted">
            {pennantReview.pacific.body}
          </p>
        </DataPanel>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <DataPanel title={pennantReview.race.title}>
          <ul className="space-y-1.5 text-[13px] text-museum-ivory-muted">
            {pennantReview.race.points.map((p) => (
              <li key={p}>・ {p}</li>
            ))}
          </ul>
        </DataPanel>
        <DataPanel title={pennantReview.movement.title}>
          <ul className="space-y-1.5 text-[13px] text-museum-ivory-muted">
            {pennantReview.movement.points.map((p) => (
              <li key={p}>・ {p}</li>
            ))}
          </ul>
        </DataPanel>
      </div>

      <DataPanel title={pennantReview.traits.title} description={`${year}シーズン`}>
        <ul className="space-y-2">
          {pennantReview.traits.items.map((item, i) => (
            <li
              key={`${item.team}-${i}`}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5"
            >
              <p className="text-[13px] font-medium text-museum-ivory">
                {item.team}
              </p>
              <p className="mt-0.5 text-[11px] text-museum-ivory-soft">
                {item.note}
              </p>
            </li>
          ))}
        </ul>
      </DataPanel>

      <DataPanel title={pennantReview.moments.title}>
        <ul className="space-y-1.5 text-[13px] text-museum-ivory-muted">
          {pennantReview.moments.points.map((p) => (
            <li key={p}>・ {p}</li>
          ))}
        </ul>
      </DataPanel>
    </div>
  );
}

function PennantStandingsBoard({
  year,
  seasonKey,
}: {
  year: string;
  seasonKey: string;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#38bdf8)]">
          1. 最終順位
        </h3>
        <FinalStandingsBoard year={year} seasonKey={seasonKey} />
      </section>

      <section>
        <h3 className="mb-2 text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#38bdf8)]">
          2. 順位推移（月末）
        </h3>
        <StandingsTrendBoard year={year} seasonKey={seasonKey} />
      </section>

      <section>
        <h3 className="mb-2 text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#38bdf8)]">
          3. 対戦成績
        </h3>
        <PennantMatchupsBoard seasonKey={seasonKey} />
      </section>
    </div>
  );
}

function renderInterleague(item: string, year: string, seasonKey: string) {
  switch (item) {
    case "standings":
      return <InterleagueStandingsBoard year={year} seasonKey={seasonKey} />;
    case "sop":
      return (
        <DataPanel
          title="交流戦SOP"
          description="交流戦個人成績から算出するSOP・四天王・ランキング"
        >
          <InterleagueSopSeasonBoard seasonKey={seasonKey} />
        </DataPanel>
      );
    case "players":
      return (
        <DataPanel
          title="個人成績"
          description="交流戦期間のみ / 野手・投手・ランキング・チーム別"
        >
          <PlayerStatsExplorer
            scope="interleague"
            year={Number(year)}
            seasonKey={seasonKey}
            enableLeagueFilter={false}
          />
        </DataPanel>
      );
    default:
      return (
        <DataPanel title="準備中">
          <p className="text-[13px] text-museum-ivory-soft">
            この項目の専用表示は準備中です。
          </p>
        </DataPanel>
      );
  }
}


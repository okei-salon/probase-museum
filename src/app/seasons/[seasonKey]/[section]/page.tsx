import { notFound } from "next/navigation";
import {
  CategoryShell,
  DetailPage,
  LinkList,
  PageHeading,
} from "@/components/category";
import {
  PostseasonPage,
  SeasonFeatsBoard,
  SeasonSopBoard,
  SeasonSummaryPage,
} from "@/components/seasons";
import { PlayerStatsExplorer } from "@/components/views";
import {
  awardsMenu,
  getSeasonSection,
  interleagueMenu,
  parseSeasonKey,
  pennantMenu,
  seasonDisplayTitle,
  seasonHubThemeId,
} from "@/data/seasons";

type Props = { params: Promise<{ seasonKey: string; section: string }> };

export default async function SeasonSectionPage({ params }: Props) {
  const { seasonKey: raw, section } = await params;
  const identity = parseSeasonKey(raw);
  if (!identity) notFound();

  const meta = getSeasonSection(section);
  if (!meta) notFound();

  const { seasonKey, year } = identity;
  const yearStr = String(year);
  const hubTheme = seasonHubThemeId(identity);
  const backLabel = seasonDisplayTitle(identity);
  const back = { href: `/seasons/${seasonKey}`, label: backLabel };
  const seasonSubtitle = identity.world
    ? `${year} SEASON · ${identity.world}`
    : `${year}シーズン`;

  if (section === "summary") {
    return (
      <SeasonSummaryPage
        seasonKey={seasonKey}
        year={yearStr}
        theme={hubTheme}
        backLabel={backLabel}
      />
    );
  }

  if (section === "postseason") {
    return (
      <PostseasonPage
        seasonKey={seasonKey}
        year={yearStr}
        theme={hubTheme}
        backLabel={backLabel}
      />
    );
  }

  if (section === "stats") {
    return (
      <DetailPage
        theme={hubTheme}
        back={back}
        title={meta.title}
        subtitle={seasonSubtitle}
        icon={meta.icon}
        iconClassName={meta.iconClassName}
        panelTitle="個人成績"
        panelDescription="野手・投手の切替、リーグ絞り込み、項目クリックでソート"
      >
        <PlayerStatsExplorer
          scope="pennant"
          year={year}
          seasonKey={seasonKey}
          enableLeagueFilter
        />
      </DetailPage>
    );
  }

  if (section === "sop") {
    return (
      <DetailPage
        theme={hubTheme}
        back={back}
        title={meta.title}
        subtitle={`${seasonSubtitle} · Season Outstanding Points`}
        icon={meta.icon}
        iconClassName={meta.iconClassName}
        panelTitle="SOPランキング"
        panelDescription="個人実績から自動計算。選手をクリックで内訳を表示"
      >
        <SeasonSopBoard year={year} seasonKey={seasonKey} />
      </DetailPage>
    );
  }

  if (section === "feats") {
    return (
      <DetailPage
        theme={hubTheme}
        back={back}
        title="記録・偉業"
        subtitle="完全試合・連続記録・歴史的シーズン"
        icon={meta.icon}
        iconClassName={meta.iconClassName}
        panelTitle="記録・偉業"
        panelDescription="そのシーズンに達成された特別な記録を残す（順位競争ではない）"
      >
        <SeasonFeatsBoard year={year} seasonKey={seasonKey} />
      </DetailPage>
    );
  }

  if (meta.kind === "detail") {
    return (
      <DetailPage
        theme={hubTheme}
        back={back}
        title={meta.title}
        subtitle={seasonSubtitle}
        icon={meta.icon}
        iconClassName={meta.iconClassName}
        panelTitle={meta.title}
        panelDescription={meta.description}
      />
    );
  }

  if (section === "pennant") {
    return (
      <CategoryShell theme="pennant" back={back}>
        <PageHeading
          title="ペナントレース"
          subtitle={seasonSubtitle}
          icon="chartLine"
        />
        <LinkList items={pennantMenu(seasonKey)} />
      </CategoryShell>
    );
  }

  if (section === "interleague") {
    return (
      <CategoryShell theme="interleague" back={back}>
        <PageHeading
          title="交流戦"
          subtitle={seasonSubtitle}
          icon="globe"
        />
        <LinkList items={interleagueMenu(seasonKey)} />
      </CategoryShell>
    );
  }

  if (section === "awards") {
    return (
      <CategoryShell theme="awards" back={back}>
        <PageHeading
          title="タイトル・表彰"
          subtitle={seasonSubtitle}
          icon="crown"
        />
        <LinkList items={awardsMenu(seasonKey)} united comfortable />
      </CategoryShell>
    );
  }

  notFound();
}

import {
  CategoryShell,
  PageHeading,
} from "@/components/category";
import { BestNineBoard } from "@/components/awards/BestNineBoard";
import { MonthlyMvpBoard } from "@/components/awards/MonthlyMvpBoard";
import { MajorAwardsBoard } from "@/components/awards/MajorAwardsBoard";
import { TitleRankingsBoard } from "@/components/awards/TitleRankingsBoard";
import { RegisteredGoldenGloveBoard } from "@/components/awards/RegisteredGoldenGloveBoard";
import { RegisteredMajorAwardPane } from "@/components/awards/RegisteredMajorAwardPane";
import type { CategoryThemeId } from "@/config/categoryThemes";
import {
  getMonthlyMvpAwards,
  type AwardPageId,
} from "@/data/awards";

type AwardDetailPageProps = {
  year: string;
  awardId: AwardPageId;
  title: string;
  subtitle?: string;
  seasonKey?: string;
  theme?: CategoryThemeId;
};

export function AwardDetailPage({
  year,
  awardId,
  title,
  subtitle,
  seasonKey = year,
  theme = "awards",
}: AwardDetailPageProps) {
  const fitViewport = awardId === "best9" || awardId === "monthly";

  return (
    <CategoryShell
      theme={theme === "seasonHubBlue" || theme === "seasonHubRed" ? theme : "awards"}
      back={{ href: `/seasons/${seasonKey}/awards`, label: "タイトル・表彰" }}
      dense={fitViewport}
      contentClassName={fitViewport ? "!max-w-[1200px]" : undefined}
    >
      <PageHeading
        title={title}
        subtitle={subtitle ?? `${year}シーズン`}
        icon="crown"
        dense={fitViewport}
      />
      <AwardBody year={year} awardId={awardId} seasonKey={seasonKey} />
    </CategoryShell>
  );
}

function AwardBody({
  year,
  awardId,
  seasonKey,
}: {
  year: string;
  awardId: AwardPageId;
  seasonKey: string;
}) {
  switch (awardId) {
    case "major":
      return <MajorAwardsBoard year={year} seasonKey={seasonKey} />;
    case "titles":
      return <TitleRankingsBoard year={year} seasonKey={seasonKey} />;
    case "mvp":
      return (
        <RegisteredMajorAwardPane
          year={year}
          seasonKey={seasonKey}
          kind="mvp"
          badge="MVP"
        />
      );
    case "rookie":
      return (
        <RegisteredMajorAwardPane
          year={year}
          seasonKey={seasonKey}
          kind="rookie"
          badge="新人王"
        />
      );
    case "sawamura":
      return (
        <RegisteredMajorAwardPane
          year={year}
          seasonKey={seasonKey}
          kind="sawamura"
          badge="沢村賞"
        />
      );
    case "best9":
      return <BestNineBoard year={year} seasonKey={seasonKey} />;
    case "gg":
      return <RegisteredGoldenGloveBoard year={year} seasonKey={seasonKey} />;
    case "monthly": {
      const data = getMonthlyMvpAwards(year);
      return (
        <MonthlyMvpBoard
          year={year}
          seasonKey={seasonKey}
          central={data.central}
          pacific={data.pacific}
        />
      );
    }
    default:
      return null;
  }
}

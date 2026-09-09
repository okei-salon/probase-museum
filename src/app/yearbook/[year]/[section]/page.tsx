import { notFound, redirect } from "next/navigation";
import { DetailPage } from "@/components/category";
import { YearbookSeasonReviewBoard } from "@/components/yearbook/YearbookSeasonReviewBoard";
import { YearbookTimelineBoard } from "@/components/yearbook/YearbookTimelineBoard";
import {
  parseSeasonKey,
  seasonDisplayTitle,
} from "@/data/seasons";
import {
  getYearbookSection,
  resolveYearbookSection,
  yearbookSectionAliases,
} from "@/data/yearbook";

type Props = {
  params: Promise<{ year: string; section: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function YearbookSectionPage({
  params,
  searchParams,
}: Props) {
  const { year: raw, section: rawSection } = await params;
  const { from } = await searchParams;
  const identity = parseSeasonKey(raw);
  if (!identity) notFound();

  if (rawSection in yearbookSectionAliases) {
    redirect(
      `/yearbook/${identity.seasonKey}/${resolveYearbookSection(rawSection)}`,
    );
  }

  const section = resolveYearbookSection(rawSection);

  if (section === "summary") {
    redirect(`/seasons/${identity.seasonKey}/summary`);
  }

  const meta = getYearbookSection(section);
  if (!meta || (section !== "overview" && section !== "timeline")) {
    notFound();
  }

  const label = seasonDisplayTitle(identity);
  const fromSummary = from === "summary";
  const back =
    fromSummary && section === "overview"
      ? {
          href: `/seasons/${identity.seasonKey}/summary`,
          label: `${label} サマリー`,
        }
      : {
          href: `/yearbook/${identity.seasonKey}`,
          label: `${label} YEARBOOK`,
        };

  return (
    <DetailPage
      theme="yearbook"
      back={back}
      title={meta.title}
      subtitle={`${label} / ${meta.description}`}
      icon={meta.icon}
      panelTitle={`${label} ${meta.title}`}
      panelDescription="登録データに基づく年鑑記事（WORLD分離）"
    >
      {section === "timeline" ? (
        <YearbookTimelineBoard seasonKey={identity.seasonKey} />
      ) : (
        <YearbookSeasonReviewBoard
          seasonKey={identity.seasonKey}
          allowEdit={!fromSummary}
        />
      )}
    </DetailPage>
  );
}

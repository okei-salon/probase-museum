import { notFound, redirect } from "next/navigation";
import { DetailPage } from "@/components/category";
import { YearbookSeasonReviewBoard } from "@/components/yearbook/YearbookSeasonReviewBoard";
import {
  parseSeasonKey,
  seasonDisplayTitle,
} from "@/data/seasons";
import {
  getYearbookSection,
  resolveYearbookSection,
  yearbookSectionAliases,
} from "@/data/yearbook";

type Props = { params: Promise<{ year: string; section: string }> };

export default async function YearbookSectionPage({ params }: Props) {
  const { year: raw, section: rawSection } = await params;
  const identity = parseSeasonKey(raw);
  if (!identity) notFound();

  if (rawSection in yearbookSectionAliases) {
    redirect(
      `/yearbook/${identity.seasonKey}/${resolveYearbookSection(rawSection)}`,
    );
  }

  const section = resolveYearbookSection(rawSection);
  const meta = getYearbookSection(section);
  if (!meta || section !== "overview") notFound();

  const label = seasonDisplayTitle(identity);

  return (
    <DetailPage
      theme="yearbook"
      back={{
        href: `/yearbook/${identity.seasonKey}`,
        label: `${label} YEARBOOK`,
      }}
      title={meta.title}
      subtitle={`${label} / ${meta.description}`}
      icon={meta.icon}
      panelTitle={`${label} ${meta.title}`}
      panelDescription="登録データに基づく年鑑記事（WORLD分離）"
    >
      <YearbookSeasonReviewBoard seasonKey={identity.seasonKey} />
    </DetailPage>
  );
}

import { notFound } from "next/navigation";
import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import {
  parseSeasonKey,
  seasonDisplaySubtitle,
  seasonDisplayTitle,
} from "@/data/seasons";
import { getYearbookSectionLinks } from "@/data/yearbook";

type Props = { params: Promise<{ year: string }> };

export default async function YearbookYearPage({ params }: Props) {
  const { year: raw } = await params;
  const identity = parseSeasonKey(raw);
  if (!identity) notFound();

  return (
    <CategoryShell
      theme="yearbook"
      back={{ href: "/yearbook", label: "YEARBOOK" }}
    >
      <PageHeading
        title={`${seasonDisplayTitle(identity)} YEARBOOK`}
        subtitle={seasonDisplaySubtitle(identity)}
        icon="book"
      />
      <LinkList items={getYearbookSectionLinks(identity.seasonKey)} />
    </CategoryShell>
  );
}

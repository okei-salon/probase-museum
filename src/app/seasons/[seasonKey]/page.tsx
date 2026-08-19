import { notFound } from "next/navigation";
import { CategoryShell, PageHeading, SelectGrid } from "@/components/category";
import {
  getSeasonSectionItems,
  parseSeasonKey,
  seasonDisplaySubtitle,
  seasonDisplayTitle,
  seasonHubThemeId,
} from "@/data/seasons";

type Props = { params: Promise<{ seasonKey: string }> };

export default async function SeasonHubPage({ params }: Props) {
  const { seasonKey: raw } = await params;
  const identity = parseSeasonKey(raw);
  if (!identity) notFound();

  const { seasonKey } = identity;
  const theme = seasonHubThemeId(identity);

  return (
    <CategoryShell theme={theme} back={{ href: "/seasons", label: "SEASONS" }}>
      <PageHeading
        title={seasonDisplayTitle(identity)}
        subtitle={seasonDisplaySubtitle(identity)}
      />
      <SelectGrid items={getSeasonSectionItems(seasonKey)} columns={4} />
    </CategoryShell>
  );
}

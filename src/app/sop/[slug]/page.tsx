import { notFound, redirect } from "next/navigation";
import { DetailPage } from "@/components/category";
import { InterleagueSopCareerBoard } from "@/components/sop/InterleagueSopCareerBoard";
import { InterleagueSopSeasonBoard } from "@/components/sop/InterleagueSopSeasonBoard";
import { SopCareerHubBoard } from "@/components/sop/SopCareerHubBoard";
import { SopFourKingsBoard } from "@/components/sop/SopFourKingsBoard";
import { SopRulesBoard } from "@/components/sop/SopRulesBoard";
import { SopSeasonHubBoard } from "@/components/sop/SopSeasonHubBoard";
import {
  getSopItem,
  resolveSopSlug,
  sopSlugAliases,
} from "@/data/sopMenu";

type Props = { params: Promise<{ slug: string }> };

export default async function SopDetailPage({ params }: Props) {
  const { slug: raw } = await params;

  if (raw in sopSlugAliases) {
    redirect(`/sop/${resolveSopSlug(raw)}`);
  }

  const item = getSopItem(raw);
  if (!item) notFound();

  const slug = resolveSopSlug(raw);

  return (
    <DetailPage
      theme="sop"
      back={{ href: "/sop", label: "SOP" }}
      title={item.title}
      subtitle={item.description}
      icon={item.icon}
      iconClassName={item.iconClassName ?? "text-sky-300"}
      panelTitle={item.title}
      panelDescription={item.description}
    >
      {slug === "season" ? <SopSeasonHubBoard /> : null}
      {slug === "career" ? <SopCareerHubBoard /> : null}
      {slug === "four-kings" ? <SopFourKingsBoard /> : null}
      {slug === "interleague" ? <InterleagueSopSeasonBoard /> : null}
      {slug === "interleague-career" ? <InterleagueSopCareerBoard /> : null}
      {slug === "rules" ? <SopRulesBoard /> : null}
    </DetailPage>
  );
}

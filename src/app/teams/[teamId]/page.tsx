import { notFound } from "next/navigation";
import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { getTeam, getTeamSectionLinks } from "@/data/teams";

type Props = { params: Promise<{ teamId: string }> };

export default async function TeamHubPage({ params }: Props) {
  const { teamId } = await params;
  const team = getTeam(teamId);
  if (!team) notFound();

  return (
    <CategoryShell theme="teams" back={{ href: "/teams", label: "TEAMS" }}>
      <PageHeading
        title={team.name}
        subtitle={`${team.league}・リーグ / 球団データ`}
        icon="flag"
      />
      <LinkList items={getTeamSectionLinks(teamId)} />
    </CategoryShell>
  );
}

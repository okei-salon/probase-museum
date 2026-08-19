import { notFound } from "next/navigation";
import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { samplePlayers } from "@/data/players";
import { getTeam } from "@/data/teams";

type Props = { params: Promise<{ teamId: string }> };

export default async function PlayersTeamListPage({ params }: Props) {
  const { teamId } = await params;
  const team = getTeam(teamId);
  if (!team) notFound();

  const items = samplePlayers.map((p) => ({
    id: `${teamId}-${p.id}`,
    href: `/players/${p.id}`,
    title: p.name,
    description: `${team.short} / ${p.position}`,
    icon: "user" as const,
  }));

  return (
    <CategoryShell
      theme="players"
      back={{ href: "/players/by-team", label: "球団から検索" }}
    >
      <PageHeading
        title={team.name}
        subtitle="所属選手（ダミー）"
        icon="flag"
      />
      <LinkList items={items} />
    </CategoryShell>
  );
}

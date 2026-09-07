import { notFound } from "next/navigation";
import { CategoryShell, PageHeading } from "@/components/category";
import { PlayerTeamRosterBoard } from "@/components/players/PlayerTeamRosterBoard";
import { getTeam } from "@/data/teams";

type Props = { params: Promise<{ teamId: string }> };

export default async function PlayersTeamListPage({ params }: Props) {
  const { teamId } = await params;
  const team = getTeam(teamId);
  if (!team) notFound();

  return (
    <CategoryShell
      theme="players"
      back={{ href: "/players/by-team", label: "球団から検索" }}
    >
      <PageHeading
        title={team.name}
        subtitle={`${team.league}・リーグ / 現在の所属選手`}
        icon="flag"
      />
      <PlayerTeamRosterBoard teamId={team.id} teamShort={team.short} />
    </CategoryShell>
  );
}

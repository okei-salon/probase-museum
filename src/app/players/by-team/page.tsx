import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { npbTeams } from "@/data/teams";

export default function PlayersByTeamPage() {
  const items = npbTeams.map((team) => ({
    id: team.id,
    href: `/players/by-team/${team.id}`,
    title: team.name,
    description: `${team.league}・リーグ`,
    icon: "flag" as const,
  }));

  return (
    <CategoryShell theme="players" back={{ href: "/players", label: "PLAYERS" }}>
      <PageHeading
        title="球団から検索"
        subtitle="12球団ごとの選手一覧"
        icon="flag"
      />
      <LinkList items={items} />
    </CategoryShell>
  );
}

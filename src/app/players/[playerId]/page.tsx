import { notFound } from "next/navigation";
import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { getPlayer, getPlayerSectionLinks } from "@/data/players";

type Props = { params: Promise<{ playerId: string }> };

export default async function PlayerHubPage({ params }: Props) {
  const { playerId } = await params;
  const player = getPlayer(playerId);
  if (!player) notFound();

  return (
    <CategoryShell theme="players" back={{ href: "/players", label: "PLAYERS" }}>
      <PageHeading
        title={player.name}
        subtitle={`${player.team} / ${player.position}`}
        icon="user"
      />
      <LinkList items={getPlayerSectionLinks(playerId)} />
    </CategoryShell>
  );
}

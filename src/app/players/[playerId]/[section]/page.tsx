import { notFound, redirect } from "next/navigation";
import { DetailPage } from "@/components/category";
import { PlayerCareerStatsBoard } from "@/components/players/PlayerCareerStatsBoard";
import { PlayerOtherRecordsBoard } from "@/components/players/PlayerOtherRecordsBoard";
import { PlayerProfileBoard } from "@/components/players/PlayerProfileBoard";
import { PlayerSeasonLinesPanel } from "@/components/players/PlayerSeasonLinesPanel";
import { PlayerSopBoard } from "@/components/players/PlayerSopBoard";
import {
  getPlayer,
  playerDetailSections,
  playerSectionAliases,
  resolvePlayerSection,
} from "@/data/players";

type Props = { params: Promise<{ playerId: string; section: string }> };

export default async function PlayerSectionPage({ params }: Props) {
  const { playerId, section: rawSection } = await params;
  const player = getPlayer(playerId);
  if (!player) notFound();

  if (rawSection in playerSectionAliases) {
    redirect(
      `/players/${playerId}/${resolvePlayerSection(rawSection)}`,
    );
  }

  const section = resolvePlayerSection(rawSection);
  const meta = playerDetailSections.find((s) => s.id === section);
  if (!meta) notFound();

  return (
    <DetailPage
      theme="players"
      back={{ href: `/players/${playerId}`, label: player.name }}
      title={meta.title}
      subtitle={`${player.name} / ${player.team}`}
      icon={meta.icon}
      panelTitle={meta.title}
      panelDescription={meta.description}
    >
      {section === "profile" ? (
        <PlayerProfileBoard
          playerId={playerId}
          fallbackName={player.name}
          fallbackTeam={player.team}
          fallbackPosition={player.position}
        />
      ) : null}
      {section === "yearly" ? (
        <PlayerSeasonLinesPanel playerId={playerId} />
      ) : null}
      {section === "career" ? (
        <PlayerCareerStatsBoard playerId={playerId} />
      ) : null}
      {section === "sop" ? <PlayerSopBoard playerId={playerId} /> : null}
      {section === "other" ? (
        <PlayerOtherRecordsBoard playerId={playerId} />
      ) : null}
    </DetailPage>
  );
}

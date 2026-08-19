import { notFound, redirect } from "next/navigation";
import { DetailPage } from "@/components/category";
import { TeamCareerBoard } from "@/components/teams/TeamCareerBoard";
import { TeamProfileBoard } from "@/components/teams/TeamProfileBoard";
import { TeamSideStatsBoard } from "@/components/teams/TeamSideStatsBoard";
import { TeamYearlyBoard } from "@/components/teams/TeamYearlyBoard";
import {
  getTeam,
  resolveTeamSection,
  teamSectionAliases,
  teamSections,
  type TeamId,
} from "@/data/teams";

type Props = { params: Promise<{ teamId: string; section: string }> };

export default async function TeamSectionPage({ params }: Props) {
  const { teamId, section: rawSection } = await params;
  const team = getTeam(teamId);
  if (!team) notFound();

  if (rawSection in teamSectionAliases) {
    redirect(`/teams/${teamId}/${resolveTeamSection(rawSection)}`);
  }

  const section = resolveTeamSection(rawSection);
  const meta = teamSections.find((s) => s.id === section);
  if (!meta) notFound();

  const id = teamId as TeamId;

  return (
    <DetailPage
      theme="teams"
      back={{ href: `/teams/${teamId}`, label: team.short }}
      title={meta.title}
      subtitle={team.name}
      icon={meta.icon}
      panelTitle={`${team.short} / ${meta.title}`}
      panelDescription={meta.description}
    >
      {section === "profile" ? <TeamProfileBoard teamId={id} /> : null}
      {section === "yearly" ? <TeamYearlyBoard teamId={id} /> : null}
      {section === "career" ? <TeamCareerBoard teamId={id} /> : null}
      {section === "batting" ? (
        <TeamSideStatsBoard teamId={id} kind="batting" />
      ) : null}
      {section === "pitching" ? (
        <TeamSideStatsBoard teamId={id} kind="pitching" />
      ) : null}
    </DetailPage>
  );
}

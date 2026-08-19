import { CategoryShell, PageHeading, SelectGrid } from "@/components/category";
import { getTeamGridItems } from "@/data/teams";

export default function TeamsPage() {
  return (
    <CategoryShell theme="teams" back={{ href: "/", label: "HOME" }}>
      <PageHeading title="TEAMS" subtitle="12球団選択" icon="flag" />
      <SelectGrid items={getTeamGridItems()} columns={3} />
    </CategoryShell>
  );
}

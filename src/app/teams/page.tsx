import { CategoryShell, PageHeading, SelectGrid } from "@/components/category";
import type { SelectGridItem } from "@/components/category/SelectGrid";
import { getTeamGridItems } from "@/data/teams";

const rankingsItem: SelectGridItem = {
  id: "all-teams-rankings",
  href: "/teams/rankings",
  title: "全球団ランキング",
  subtitle: "12球団比較",
  description: "打撃・投手成績を全球団で並べ替え",
  icon: "star",
  featured: true,
};

export default function TeamsPage() {
  return (
    <CategoryShell theme="teams" back={{ href: "/", label: "HOME" }}>
      <PageHeading title="TEAMS" subtitle="12球団選択" icon="flag" />
      <div className="mb-4">
        <SelectGrid items={[rankingsItem]} columns={2} />
      </div>
      <SelectGrid items={getTeamGridItems()} columns={3} />
    </CategoryShell>
  );
}

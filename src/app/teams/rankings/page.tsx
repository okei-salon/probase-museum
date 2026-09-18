import {
  CategoryShell,
  DataPanel,
  PageHeading,
} from "@/components/category";
import { AllTeamsRankingBoard } from "@/components/teams/AllTeamsRankingBoard";

export default function TeamsRankingsPage() {
  return (
    <CategoryShell theme="teams" back={{ href: "/teams", label: "TEAMS" }}>
      <PageHeading
        title="全球団ランキング"
        subtitle="12球団比較 · YEAR × WORLD"
        icon="star"
      />
      <p className="mb-5 -mt-2 max-w-2xl text-[12px] leading-relaxed text-museum-ivory-soft md:text-[13px]">
        選択中のシーズン（BLUE / RED
        を含む）のチーム打撃・投手成績を、全球団で並べ替えて比較できます。
      </p>
      <DataPanel>
        <AllTeamsRankingBoard />
      </DataPanel>
    </CategoryShell>
  );
}
